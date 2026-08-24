CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_]{3,24}$'),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  bio           TEXT NOT NULL DEFAULT '',
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'writer' CHECK (role IN ('writer', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 150),
  subtitle     TEXT NOT NULL DEFAULT '',
  content      TEXT NOT NULL,
  cover_image  TEXT,
  tags         TEXT[] NOT NULL DEFAULT '{}',
  read_time    INT  NOT NULL DEFAULT 1,
  published    BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS claps (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_author     ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_recent     ON posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_claps_post       ON claps(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_post    ON comments(post_id);

-- migrations for databases created before roles existed
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'writer';

-- the very first account becomes admin if no admin exists yet
UPDATE users
SET role = 'admin'
WHERE id = (SELECT id FROM users ORDER BY created_at ASC, id ASC LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin');
