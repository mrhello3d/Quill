import { fileURLToPath } from 'node:url';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { sql } from '../src/db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const slugify = (t) =>
  String(t).toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60);
const readTime = (c) => Math.max(1, Math.round(c.trim().split(/\s+/).length / 200));
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

const existing = await sql('SELECT COUNT(*)::int AS n FROM posts');
if (existing[0].n > 0) {
  console.log('[quill] Database already has stories - skipping seed.');
  process.exit(0);
}

const password = await bcrypt.hash('password123', 10);

const people = [
  {
    username: 'maya',
    name: 'Maya Chen',
    email: 'maya@quill.dev',
    bio: 'Writes about the writing life. Early riser, slow thinker.',
  },
  {
    username: 'leo',
    name: 'Leo Park',
    email: 'leo@quill.dev',
    bio: 'Engineer. Ships small things often. Occasionally wise about it.',
  },
  {
    username: 'ana',
    name: 'Ana Ribeiro',
    email: 'ana@quill.dev',
    bio: 'Product designer. Obsessed with the space between things.',
  },
];

const userIds = {};
for (const p of people) {
  const rows = await sql(
    `INSERT INTO users (username, name, email, password_hash, bio)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [p.username, p.name, p.email, password, p.bio]
  );
  if (rows.length) {
    userIds[p.username] = rows[0].id;
  } else {
    const found = await sql('SELECT id FROM users WHERE email = $1', [p.email]);
    userIds[p.username] = found[0].id;
  }
}

const stories = [
  {
    author: 'maya',
    title: 'The Quiet Hours',
    subtitle: 'What I learned writing 400 mornings before sunrise',
    tags: ['writing', 'habits'],
    cover: 'https://picsum.photos/seed/quill-dawn/1200/675',
    days: 2,
    content: `For two years I woke at 5:10 a.m. and wrote until the kettle screamed. Not because I believe in magic hours, but because the house was finally quiet enough to hear myself think.

## The deal I made with myself

The rules were simple:

- Write before reading anything else
- No internet until 7 a.m.
- Bad sentences are still sentences

The last rule saved the whole experiment. Most mornings produced garbage. Some produced a paragraph I kept. Over months, the paragraphs became essays, and the essays became a body of work I could stand behind.

> You do not need more discipline. You need fewer negotiations.

## What actually changed

I stopped waiting to feel ready. The blank page stopped being an event. It became a place I visited, the way you visit a gym or a garden - without ceremony, without drama.

If you want to write, pick an hour nobody wants from you. Guard it like it owes you money. Then give everything it earns away, for free, one morning at a time.`,
  },
  {
    author: 'leo',
    title: 'Ship the Ugly Version',
    subtitle: "Notes from three years of side projects that didn't die",
    tags: ['engineering', 'side-projects'],
    cover: null,
    days: 4,
    content: `Every side project I ever killed had a beautiful architecture document. Every project I shipped started as something embarrassing.

## The pattern

My dead projects share a biography:

1. Week one - excitement, perfect folder structure
2. Week two - authentication system nobody asked for
3. Week three - a rewrite begins
4. Silence

The projects that survived did one thing differently. They were **used** by week two, ugly and all. A friend clicking a broken button teaches you more than a week of design.

> Perfection is procrastination wearing a nice outfit.

## What shipping small looks like

My current tool went live with zero tests, one screen, and a bug where deleting your only note crashed the app. Two people used it anyway. Their complaints wrote my roadmap for me.

Build less than you want. Ship sooner than is comfortable. Let reality do the code review.`,
  },
  {
    author: 'ana',
    title: 'Design Systems Are Conversations, Not Rulebooks',
    subtitle: 'Why your component library keeps failing',
    tags: ['design', 'teams'],
    cover: 'https://picsum.photos/seed/quill-systems/1200/675',
    days: 6,
    content: `We spent eight months building a component library so complete that designers stopped talking to each other. That was the moment it started dying.

## The library is not the system

A design system is not the Figma file. It is not the npm package. It is the *agreement* underneath them - why buttons look the way they do, when a modal is wrong, what we mean by accessible.

Rulebooks go stale the day they are written. Conversations update themselves.

## Signs yours is alive

- People argue about components in the open, not in DMs
- The docs admit uncertainty ("we think cards work better here")
- Contributions come from teams you have never met

> If nobody breaks the rules, the rules are decorative.

We deleted half our guidelines and replaced them with office hours. Usage of the system tripled in a quarter. The components barely changed. The conversation did.`,
  },
  {
    author: 'maya',
    title: 'Read Like a Writer',
    subtitle: 'Stealing sentence mechanics from people who are better at this',
    tags: ['writing', 'reading'],
    cover: null,
    days: 9,
    content: `Somewhere along the way, reading for pleasure split into reading for parts. Both are worth doing, but writers forget the second one exists.

## The exercise

Take a paragraph you admire. Type it out, word by word, by hand. Do not skim. Somewhere around the third sentence you will feel where the author slowed down, where she turned the clause, where he chose the short word over the precise one.

It feels silly. It works.

## What you start noticing

- Great paragraphs usually do exactly one thing
- Em dashes are seasoning, not sauce
- The last sentence of a good paragraph opens a door

> Style is the residue of ten thousand deliberate decisions.

You would not learn piano by listening with your hands in your pockets. Writing is no different. Take the sentence apart. Put it back together. Keep the springs.`,
  },
  {
    author: 'leo',
    title: 'AI Pair Programmers and the Lost Art of Confusion',
   subtitle: '',
    tags: ['ai', 'engineering'],
    cover: 'https://picsum.photos/seed/quill-pairing/1200/675',
    days: 12,
    content: `The best debugging tool I own is being confused. Confusion slows me down at exactly the places where my mental model is wrong. I am careful about outsourcing it.

## Where AI genuinely helps

- Boilerplate with well-defined shapes
- Remembering the third argument of that API you use twice a year
- First drafts of tests for code that already exists

These are tasks where correctness is checkable at a glance. The cost of a confident mistake is low.

## Where I stay suspicious

When I ask for an explanation of *why* something works and accept the first fluent answer, I am not learning - I am renting understanding at high interest.

> Fluent is not the same as true.

My rule now: the machine may write the code, but I must be able to explain every line while someone watches. If I cannot, the line goes or the explanation session happens. Usually the session. Usually I find the bug there.`,
  },
  {
    author: 'ana',
    title: 'White Space Is Not Empty',
    subtitle: 'In defense of the margins',
    tags: ['design', 'craft'],
    cover: null,
    days: 15,
    content: `Clients rarely complain that a page has too much room to breathe. They complain it does not. And yet almost every page I improve, I improve by removing things.

## Space does work

Margins tell the reader where to rest. Line spacing decides whether a paragraph feels like an invitation or a wall. The gap between sections is a chapter break your eyes can hear.

Crowded interfaces are loud not because they contain more information but because they refuse to say which information matters.

## A practical test

Squint at your layout. Whatever survives the squint is your hierarchy. If everything survives, nothing did.

> Whitespace is the pause that makes the sentence readable.

Try this week: take your densest screen and cut its elements by a third. Move nothing else. Watch what happens to comprehension. Then try arguing with me.`,
  },
];

const postIds = [];
for (const s of stories) {
  const rows = await sql(
    `INSERT INTO posts (author_id, slug, title, subtitle, content, cover_image, tags, read_time,
                        published, published_at, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9,$9,$9)
     RETURNING id`,
    [
      userIds[s.author],
      `${slugify(s.title)}-${Math.random().toString(36).slice(2, 8)}`,
      s.title,
      s.subtitle || '',
      s.content,
      s.cover,
      s.tags,
      readTime(s.content),
      daysAgo(s.days),
    ]
  );
  postIds.push(rows[0].id);
}

const clapPairs = [
  ['leo', 0], ['ana', 0], ['ana', 1], ['maya', 1], ['maya', 2], ['leo', 2],
  ['leo', 3], ['ana', 3], ['maya', 4], ['ana', 4], ['leo', 5], ['maya', 5],
];
for (const [who, idx] of clapPairs) {
  await sql(
    'INSERT INTO claps (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [userIds[who], postIds[idx]]
  );
}

const remarks = [
  ['leo', 0, 'The "fewer negotiations" line is going on my wall.'],
  ['ana', 0, 'I tried the no-internet rule for a week. My feed missed me; I did not miss it.'],
  ['maya', 1, 'Week-two authentication system - called out personally.'],
  ['maya', 2, 'Office hours over rulebooks is such a better default.'],
  ['leo', 2, '"If nobody breaks the rules, the rules are decorative." Stealing this for our next retro.'],
];
for (const [who, idx, body] of remarks) {
  await sql('INSERT INTO comments (post_id, user_id, body) VALUES ($1, $2, $3)', [
    postIds[idx],
    userIds[who],
    body,
  ]);
}

console.log(
  `[quill] Seeded ${people.length} writers, ${stories.length} stories, ${clapPairs.length} claps, ${remarks.length} responses.`
);
console.log('[quill] Sign in with maya@quill.dev / password123 (or leo@ / ana@).');
