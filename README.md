# Quill

A Medium-style microblog. Write stories in Markdown, publish them, clap for what you like, and respond in threaded conversation — all backed by your own [Neon](https://neon.tech) Postgres database.

## Features

- **Feed** of published stories — sort by *Latest* or *Most clapped*, filter by topic, search by keyword
- **Editor** with title, subtitle, cover image, topics, drafts and publish flow
- **Article pages** with drop caps, serif reading typography, and a floating clap/respond bar
- **Claps** (one per reader, toggleable) and **responses** (comments)
- **Profiles** with bio, stats, story tabs, and draft drawer visible only to the author
- **JWT auth** with hashed passwords
- Seed data: 3 writers, 6 stories, claps, and responses

## Stack

| Layer    | Tech                                                        |
| -------- | ----------------------------------------------------------- |
| Frontend | React 18 + Vite, React Router, hand-written CSS             |
| API      | Express (Node 18+, ESM)                                     |
| Database | Neon Postgres via `@neondatabase/serverless` (HTTP driver)   |
| Auth     | JWT (`jsonwebtoken`) + `bcryptjs`                           |

## Quick start

### 1. Create a Neon database

1. Sign up at <https://console.neon.tech> (free tier is enough)
2. Create a project
3. Copy the connection string from **Connection Details** — it looks like:
   `postgresql://user:password@ep-cool-name-123456.region.aws.neon.tech/neondb?sslmode=require`

### 2. Configure the API

```bash
copy server\.env.example server\.env
# then open server\.env and paste your DATABASE_URL
```

Set `JWT_SECRET` to any long random string while you are in there.

### 3. Install, create tables, seed

```bash
npm run setup      # installs root + server + client dependencies
npm run db:init    # creates users, posts, claps, comments tables in Neon
npm run db:seed    # optional demo content
```

### 4. Run

```bash
npm run dev        # starts API on :4001 and Vite dev server on :5173
```

Open <http://localhost:5173>. Sign in with a seeded account:

| Email            | Password    |
| ---------------- | ----------- |
| maya@quill.dev   | password123 |
| leo@quill.dev    | password123 |
| ana@quill.dev    | password123 |

## Scripts

| Script           | What it does                                  |
| ---------------- | --------------------------------------------- |
| `npm run setup`  | Install all three package sets                |
| `npm run dev`    | Run API + web app together                    |
| `npm run build`  | Production build of the client                |
| `npm start`      | Run the API alone                             |
| `npm run db:init`| Apply `db/schema.sql` to your Neon database   |
| `npm run db:seed`| Insert demo writers/stories (skips if not empty) |

## Project structure

```
├── client/                 # React app (Vite)
│   └── src/
│       ├── pages/          # Home, PostPage, Editor, Profile, Login, Signup
│       ├── components/     # Navbar, PostCard, Avatar, icons
│       ├── util/           # tiny Markdown renderer + formatters
│       ├── api.js          # fetch wrapper (adds Bearer token)
│       └── styles.css      # editorial design system
├── server/
│   ├── src/
│   │   ├── routes/         # auth, posts (+claps/comments), comments, users
│   │   ├── db.js           # Neon HTTP SQL client
│   │   ├── auth.js         # JWT middleware + password hashing
│   │   └── index.js        # Express app
│   └── scripts/            # db-init / db-seed
├── db/schema.sql           # tables + indexes
└── package.json            # orchestration scripts
```

## Writing format

The editor supports a small Markdown subset: `# ## ###` headings, `**bold**`, `*italic*`, `` `code` ``, `> quotes`, `- lists`, `1. lists`, `[links](url)`, standalone `![image](url)` lines, and blank-line paragraphs.

## API sketch

```
POST /api/auth/signup · /api/auth/login        GET /api/auth/me
GET  /api/posts?tag=&q=&sort=&mine=true&limit=&offset=
GET  /api/posts/slug/:slug                     POST/PUT/DELETE /api/posts/:id
POST /api/posts/:id/clap                       GET/POST /api/posts/:id/comments
DELETE /api/comments/:id
GET  /api/posts/tags/top                       PATCH /api/users/me
GET  /api/users/:username (+ /posts?drafts=true)
```

## Troubleshooting

- **"DATABASE_URL is missing"** — create `server/.env` from the example and paste your Neon string.
- **Port already in use** — change `PORT` in `server/.env`; the Vite proxy reads `client/vite.config.js`, so update it there too.
- **npm warns about esbuild install scripts** — harmless for local dev; approve if your policy blocks the Vite build.
