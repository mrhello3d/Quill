import { Router } from 'express';
import { query } from '../db.js';
import { signToken, hashPassword, verifyPassword, requireAuth } from '../auth.js';
import { asyncHandler } from '../util.js';

const router = Router();

const publicUser = (u) => ({
  id: u.id,
  username: u.username,
  name: u.name,
  bio: u.bio,
  avatar_url: u.avatar_url,
  role: u.role,
});

router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    let { name = '', username = '', email = '', password = '' } = req.body;
    name = String(name).trim();
    username = String(username).trim().toLowerCase();
    email = String(email).trim().toLowerCase();

    if (!name || name.length > 60)
      return res.status(400).json({ error: 'Add a name (60 characters max)' });
    if (!/^[a-z0-9_]{3,24}$/.test(username))
      return res
        .status(400)
        .json({ error: 'Username must be 3-24 characters: lowercase letters, numbers, underscores' });
    if (!/.+@.+\..+/.test(email))
      return res.status(400).json({ error: 'Enter a valid email address' });
    if (String(password).length < 8)
      return res.status(400).json({ error: 'Password needs at least 8 characters' });

    const clash = await query(
      'SELECT email, username FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    if (clash.length) {
      const taken = clash[0].email === email ? 'email' : 'username';
      return res.status(409).json({ error: `That ${taken} is already registered` });
    }

    const hash = await hashPassword(String(password));
    const rows = await query(
      `INSERT INTO users (name, username, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, name, bio, avatar_url`,
      [name, username, email, hash]
    );

    res.status(201).json({ token: signToken(rows[0]), user: publicUser(rows[0]) });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const rows = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (!rows.length || !(await verifyPassword(password, rows[0].password_hash))) {
      return res.status(401).json({ error: 'Email or password is incorrect' });
    }

    res.json({ token: signToken(rows[0]), user: publicUser(rows[0]) });
  })
);

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export default router;
