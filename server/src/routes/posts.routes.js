import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, optionalAuth } from '../auth.js';
import { asyncHandler, makeSlug, readingTime, normalizeTags, isUuid } from '../util.js';

const router = Router();

const LIST_FIELDS = `
  p.id, p.slug, p.title, p.subtitle, p.cover_image, p.tags, p.read_time,
  p.published, p.published_at, p.created_at,
  LEFT(p.content, 300) AS preview,
  u.username AS author_username, u.name AS author_name, u.avatar_url AS author_avatar,
  (SELECT COUNT(*)::int FROM claps c WHERE c.post_id = p.id) AS clap_count,
  (SELECT COUNT(*)::int FROM comments cm WHERE cm.post_id = p.id) AS comment_count`;

router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { tag, q, username } = req.query;
    const sort = req.query.sort === 'top' ? 'top' : 'new';
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const mine = req.query.mine === 'true';

    if (mine && !req.user) return res.status(401).json({ error: 'Sign in to see your stories' });

    const where = [];
    const params = [];

    if (!mine) where.push('p.published');
    if (tag) {
      params.push(String(tag).toLowerCase());
      where.push(`$${params.length} = ANY(p.tags)`);
    }
    if (q) {
      params.push(`%${String(q).slice(0, 100)}%`);
      const n = params.length;
      where.push(`(p.title ILIKE $${n} OR p.subtitle ILIKE $${n} OR p.content ILIKE $${n})`);
    }
    if (username) {
      params.push(username);
      where.push(`u.username = $${params.length}`);
    }
    if (mine) {
      params.push(req.user.id);
      where.push(`p.author_id = $${params.length}`);
    }

    let clappedSelect = 'false AS clapped_by_me';
    if (req.user) {
      params.push(req.user.id);
      clappedSelect = `EXISTS (SELECT 1 FROM claps c WHERE c.post_id = p.id AND c.user_id = $${params.length}) AS clapped_by_me`;
    }

    params.push(limit);
    const limitPh = params.length;
    params.push(offset);
    const offsetPh = params.length;

    const rows = await query(
      `SELECT ${LIST_FIELDS}, ${clappedSelect}
       FROM posts p JOIN users u ON u.id = p.author_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY ${sort === 'top' ? 'clap_count DESC,' : ''}
                COALESCE(p.published_at, p.created_at) DESC
       LIMIT $${limitPh} OFFSET $${offsetPh}`,
      params
    );

    res.json({ posts: rows, nextOffset: rows.length === limit ? offset + limit : null });
  })
);

router.get(
  '/tags/top',
  asyncHandler(async (_req, res) => {
    const rows = await query(
      `SELECT tag, COUNT(*)::int AS count
       FROM posts p, UNNEST(p.tags) AS tag
       WHERE p.published
       GROUP BY tag
       ORDER BY count DESC, tag ASC
       LIMIT 14`
    );
    res.json({ tags: rows });
  })
);

router.get(
  '/slug/:slug',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT p.*, u.username AS author_username, u.name AS author_name,
              u.avatar_url AS author_avatar, u.bio AS author_bio,
              (SELECT COUNT(*)::int FROM claps c WHERE c.post_id = p.id) AS clap_count,
              (SELECT COUNT(*)::int FROM comments cm WHERE cm.post_id = p.id) AS comment_count,
              EXISTS (SELECT 1 FROM claps c
                      WHERE c.post_id = p.id AND c.user_id = $2) AS clapped_by_me
       FROM posts p JOIN users u ON u.id = p.author_id
       WHERE p.slug = $1`,
      [req.params.slug, req.user ? req.user.id : null]
    );

    if (!rows.length) return res.status(404).json({ error: 'Story not found' });

    const post = rows[0];
    const canSeeDraft =
      req.user && (req.user.id === post.author_id || req.user.role === 'admin');
    if (!post.published && !canSeeDraft) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.json({ post });
  })
);

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const title = String(req.body.title ?? '').trim();
    const subtitle = String(req.body.subtitle ?? '').trim();
    const content = String(req.body.content ?? '');
    const coverImage = String(req.body.cover_image ?? '').trim() || null;
    const tags = normalizeTags(req.body.tags);
    const published = Boolean(req.body.published);

    if (!title) return res.status(400).json({ error: 'Give your story a title' });
    if (!content.trim()) return res.status(400).json({ error: 'Write something first' });
    if (title.length > 150) return res.status(400).json({ error: 'Title is too long (150 max)' });

    let post = null;
    for (let attempt = 0; attempt < 4 && !post; attempt += 1) {
      try {
        const rows = await query(
          `INSERT INTO posts (author_id, slug, title, subtitle, content, cover_image, tags, read_time, published, published_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CASE WHEN $9 THEN now() ELSE NULL END)
           RETURNING *`,
          [req.user.id, makeSlug(title), title, subtitle, content, coverImage, tags, readingTime(content), published]
        );
        post = rows[0];
      } catch (err) {
        if (err.code === '23505' && attempt < 3) continue; // slug collision: retry
        throw err;
      }
    }

    res.status(201).json({ post });
  })
);

function checkOwnership(rows, req, res) {
  if (!rows.length) {
    res.status(404).json({ error: 'Story not found' });
    return false;
  }
  if (rows[0].author_id !== req.user.id) {
    res.status(403).json({ error: 'You can only change your own stories' });
    return false;
  }
  return true;
}

router.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Story not found' });

    const existing = await query('SELECT author_id FROM posts WHERE id = $1', [req.params.id]);
    if (!checkOwnership(existing, req, res)) return;

    const sets = [];
    const vals = [];
    const body = req.body;

    if (body.title !== undefined) {
      const t = String(body.title).trim();
      if (!t) return res.status(400).json({ error: 'Title cannot be empty' });
      vals.push(t.slice(0, 150));
      sets.push(`title = $${vals.length}`);
    }
    if (body.subtitle !== undefined) {
      vals.push(String(body.subtitle).trim());
      sets.push(`subtitle = $${vals.length}`);
    }
    if (body.content !== undefined) {
      const c = String(body.content);
      if (!c.trim()) return res.status(400).json({ error: 'Story cannot be empty' });
      vals.push(c);
      sets.push(`content = $${vals.length}`);
      vals.push(readingTime(c));
      sets.push(`read_time = $${vals.length}`);
    }
    if (body.cover_image !== undefined) {
      vals.push(String(body.cover_image).trim() || null);
      sets.push(`cover_image = $${vals.length}`);
    }
    if (body.tags !== undefined) {
      vals.push(normalizeTags(body.tags));
      sets.push(`tags = $${vals.length}`);
    }
    if (body.published !== undefined) {
      vals.push(Boolean(body.published));
      sets.push(`published = $${vals.length}`);
      sets.push(
        `published_at = CASE WHEN $${vals.length} AND published_at IS NULL THEN now() ELSE published_at END`
      );
    }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });

    sets.push('updated_at = now()');
    vals.push(req.params.id);

    const rows = await query(
      `UPDATE posts SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    res.json({ post: rows[0] });
  })
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Story not found' });

    const existing = await query('SELECT author_id FROM posts WHERE id = $1', [req.params.id]);
    if (!checkOwnership(existing, req, res)) return;

    await query('DELETE FROM posts WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  })
);

router.post(
  '/:id/clap',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Story not found' });
    const id = req.params.id;
    const userId = req.user.id;

    const exists = await query('SELECT 1 FROM posts WHERE id = $1', [id]);
    if (!exists.length) return res.status(404).json({ error: 'Story not found' });

    const removed = await query(
      'DELETE FROM claps WHERE user_id = $1 AND post_id = $2 RETURNING *',
      [userId, id]
    );

    let clapped;
    if (removed.length) {
      clapped = false;
    } else {
      await query(
        'INSERT INTO claps (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, id]
      );
      clapped = true;
    }

    const counts = await query(
      'SELECT COUNT(*)::int AS n FROM claps WHERE post_id = $1',
      [id]
    );
    res.json({ clapped, count: counts[0].n });
  })
);

router.get(
  '/:id/comments',
  optionalAuth,
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) return res.json({ comments: [] });

    const rows = await query(
      `SELECT cm.id, cm.body, cm.created_at, cm.user_id,
              u.username, u.name, u.avatar_url
       FROM comments cm JOIN users u ON u.id = cm.user_id
       WHERE cm.post_id = $1
       ORDER BY cm.created_at ASC`,
      [req.params.id]
    );

    res.json({
      comments: rows.map((r) => ({
        id: r.id,
        body: r.body,
        created_at: r.created_at,
        user: { username: r.username, name: r.name, avatar_url: r.avatar_url },
        mine: req.user ? r.user_id === req.user.id : false,
      })),
    });
  })
);

router.post(
  '/:id/comments',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Story not found' });

    const body = String(req.body.body ?? '').trim();
    if (!body) return res.status(400).json({ error: 'Write a response first' });
    if (body.length > 2000) return res.status(400).json({ error: 'Response is too long (2000 max)' });

    const exists = await query('SELECT 1 FROM posts WHERE id = $1', [req.params.id]);
    if (!exists.length) return res.status(404).json({ error: 'Story not found' });

    const rows = await query(
      'INSERT INTO comments (post_id, user_id, body) VALUES ($1, $2, $3) RETURNING id, created_at',
      [req.params.id, req.user.id, body]
    );

    res.status(201).json({
      comment: {
        id: rows[0].id,
        body,
        created_at: rows[0].created_at,
        user: {
          username: req.user.username,
          name: req.user.name,
          avatar_url: req.user.avatar_url,
        },
        mine: true,
      },
    });
  })
);

export default router;
