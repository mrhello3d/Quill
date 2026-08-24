import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function signToken(user) {
  return jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });
}

export function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

async function loadUser(id) {
  const rows = await query(
    'SELECT id, username, name, email, bio, avatar_url, role FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Sign in to continue' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await loadUser(payload.id);
    if (!user) return res.status(401).json({ error: 'Account no longer exists' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired - sign in again' });
  }
}

export async function optionalAuth(req, _res, next) {
  req.user = null;
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = await loadUser(payload.id);
    } catch {
      // invalid token on a public route: stay anonymous
    }
  }
  next();
}
