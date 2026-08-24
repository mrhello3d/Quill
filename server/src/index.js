import express from 'express';
import cors from 'cors';
import { sql } from './db.js';
import authRoutes from './routes/auth.routes.js';
import postsRoutes from './routes/posts.routes.js';
import commentsRoutes from './routes/comments.routes.js';
import usersRoutes from './routes/users.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', async (_req, res) => {
  try {
    await sql('SELECT 1');
    res.json({ ok: true, db: true });
  } catch (err) {
    console.error('[quill] database unreachable:', err.message);
    res.status(500).json({ ok: false, db: false });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  if (res.headersSent) return;
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`\n  Quill API  ->  http://localhost:${PORT}\n`);
});
