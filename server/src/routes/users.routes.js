import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, optionalAuth } from '../auth.js';
import { asyncHandler } from '../util.js';

const router = Router();

router.get(
  '/:username',
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT u.id, u.username, u.name, u.bio, u.avatar_url, u.created_at,
              (SELECT COUNT(*)::int FROM posts p
                WHERE p.author_id = u.id AND p.published) AS post_count,
              (SELECT COUNT(*)::int FROM claps c
                JOIN posts p ON p.id = c.post_id
                WHERE p.author_id = u.id) AS total_claps
       FROM users u WHERE u.username = $1`,
      [req.params.username]
    );
    if (!rows.length) return res.status(404).json({ error: 'Writer not found' });
    res.json({ user: rows[0] });
  })
);

router.get(
  '/:username/posts',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const includeDrafts =
      req.query.drafts === 'true' &&
      req.user &&
      req.user.username === req.params.username;
    const rows = await query(
      `SELECT p.id, p.slug, p.title, p.subtitle, p.cover_image, p.tags, p.read_time,
              p.published, p.published_at, p.created_at,
              LEFT(p.content, 300) AS preview,
              u.username AS author_username, u.name AS author_name, u.avatar_url AS author_avatar,
              (SELECT COUNT(*)::int FROM claps c WHERE c.post_id = p.id) AS clap_count,
              (SELECT COUNT(*)::int FROM comments cm WHERE cm.post_id = p.id) AS comment_count
       FROM posts p JOIN users u ON u.id = p.author_id
       WHERE u.username = $1 AND ($2 OR p.published)
       ORDER BY COALESCE(p.published_at, p.created_at) DESC`,
      [req.params.username, includeDrafts]
    );
    res.json({ posts: rows });
  })
);

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name, bio, avatar_url } = req.body;
    const sets = [];
    const vals = [];

    if (name !== undefined) {
      const n = String(name).trim();
      if (!n || n.length > 60)
        return res.status(400).json({ error: 'Name must be 1-60 characters' });
      vals.push(n);
      sets.push(`name = $${vals.length}`);
    }
    if (bio !== undefined) {
      vals.push(String(bio).slice(0, 280));
      sets.push(`bio = $${vals.length}`);
    }
    if (avatar_url !== undefined) {
      vals.push(String(avatar_url).trim() || null);
      sets.push(`avatar_url = $${vals.length}`);
    }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });

    vals.push(req.user.id);
    const rows = await query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${vals.length}
       RETURNING id, username, name, bio, avatar_url`,
      vals
    );
    res.json({ user: rows[0] });
  })
);

export default router;
