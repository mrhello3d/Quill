import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';
import { asyncHandler, isUuid } from '../util.js';

const router = Router();

router.use(requireAuth, requireAdmin);

/* ---------- overview ---------- */

router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const totals = (
      await query(`
        SELECT
          (SELECT COUNT(*)::int FROM users)                          AS users,
          (SELECT COUNT(*)::int FROM posts)                          AS stories,
          (SELECT COUNT(*)::int FROM posts WHERE published)          AS published,
          (SELECT COUNT(*)::int FROM posts WHERE NOT published)      AS drafts,
          (SELECT COUNT(*)::int FROM claps)                          AS claps,
          (SELECT COUNT(*)::int FROM comments)                       AS responses
      `)
    )[0];

    const series = await query(`
      SELECT gs::date AS day,
             (SELECT COUNT(*)::int FROM posts p WHERE p.created_at::date = gs::date)   AS stories,
             (SELECT COUNT(*)::int FROM users u WHERE u.created_at::date = gs::date)   AS signups
      FROM generate_series(now()::date - INTERVAL '13 days', now()::date, INTERVAL '1 day') gs
    `);

    const topStories = await query(`
      SELECT p.slug, p.title, p.published,
             u.name AS author_name, u.username AS author_username,
             (SELECT COUNT(*)::int FROM claps c WHERE c.post_id = p.id)    AS clap_count,
             (SELECT COUNT(*)::int FROM comments cm WHERE cm.post_id = p.id) AS comment_count
      FROM posts p JOIN users u ON u.id = p.author_id
      ORDER BY clap_count DESC, comment_count DESC, p.created_at DESC
      LIMIT 5
    `);

    res.json({ totals, series, topStories });
  })
);

/* ---------- writers ---------- */

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const rows = await query(
      `SELECT u.id, u.username, u.name, u.email, u.role, u.avatar_url, u.created_at,
              (SELECT COUNT(*)::int FROM posts p WHERE p.author_id = u.id) AS stories,
              (SELECT COUNT(*)::int FROM claps c JOIN posts p ON p.id = c.post_id
                WHERE p.author_id = u.id) AS claps_received
       FROM users u
       WHERE ($1 = '' OR u.name ILIKE '%' || $1 || '%'
              OR u.username ILIKE '%' || $1 || '%'
              OR u.email ILIKE '%' || $1 || '%')
       ORDER BY u.created_at DESC
       LIMIT 100`,
      [q]
    );
    res.json({ users: rows });
  })
);

router.patch(
  '/users/:id/role',
  asyncHandler(async (req, res) => {
    const { role } = req.body;
    if (!['admin', 'writer'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin or writer' });
    }
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Writer not found' });
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }

    const rows = await query(
      `UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, name, role`,
      [role, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Writer not found' });
    res.json({ user: rows[0] });
  })
);

router.delete(
  '/users/:id',
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Writer not found' });
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account here' });
    }

    const rows = await query('DELETE FROM users WHERE id = $1 RETURNING username', [
      req.params.id,
    ]);
    if (!rows.length) return res.status(404).json({ error: 'Writer not found' });

    res.json({ ok: true, username: rows[0].username });
  })
);

/* ---------- stories ---------- */

router.get(
  '/posts',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const status = String(req.query.status || 'all');

    const where = [];
    const params = [];

    if (status === 'published') where.push('p.published');
    else if (status === 'draft') where.push('NOT p.published');

    params.push(q);
    const qn = params.length;
    where.push(
      `($${qn} = '' OR p.title ILIKE '%' || $${qn} || '%' OR u.name ILIKE '%' || $${qn} || '%')`
    );

    const rows = await query(
      `SELECT p.id, p.slug, p.title, p.tags, p.published, p.published_at, p.created_at, p.updated_at,
              u.username AS author_username, u.name AS author_name, u.role AS author_role,
              (SELECT COUNT(*)::int FROM claps c WHERE c.post_id = p.id) AS clap_count,
              (SELECT COUNT(*)::int FROM comments cm WHERE cm.post_id = p.id) AS comment_count
       FROM posts p JOIN users u ON u.id = p.author_id
       WHERE ${where.join(' AND ')}
       ORDER BY COALESCE(p.published_at, p.created_at) DESC
       LIMIT 200`,
      params
    );
    res.json({ posts: rows });
  })
);

router.patch(
  '/posts/:id/status',
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Story not found' });
    const { published } = req.body;
    if (typeof published !== 'boolean') {
      return res.status(400).json({ error: 'published must be true or false' });
    }

    const rows = await query(
      `UPDATE posts SET
         published = $1,
         published_at = CASE WHEN $1 AND published_at IS NULL THEN now() ELSE published_at END,
         updated_at = now()
       WHERE id = $2
       RETURNING id, slug, title, published`,
      [published, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Story not found' });
    res.json({ post: rows[0] });
  })
);

router.delete(
  '/posts/:id',
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Story not found' });
    const rows = await query('DELETE FROM posts WHERE id = $1 RETURNING title', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Story not found' });
    res.json({ ok: true, title: rows[0].title });
  })
);

/* ---------- responses ---------- */

router.get(
  '/comments',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
    const rows = await query(
      `SELECT cm.id, cm.body, cm.created_at,
              u.name AS author_name, u.username AS author_username,
              p.title AS post_title, p.slug AS post_slug
       FROM comments cm
       JOIN users u ON u.id = cm.user_id
       JOIN posts p ON p.id = cm.post_id
       ORDER BY cm.created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ comments: rows });
  })
);

router.delete(
  '/comments/:id',
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Response not found' });
    const rows = await query('DELETE FROM comments WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Response not found' });
    res.json({ ok: true });
  })
);

export default router;
