import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth.js';
import { asyncHandler, isUuid } from '../util.js';

const router = Router();

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Response not found' });

    const rows = await query('SELECT user_id FROM comments WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Response not found' });
    if (rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own responses' });
    }

    await query('DELETE FROM comments WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  })
);

export default router;
