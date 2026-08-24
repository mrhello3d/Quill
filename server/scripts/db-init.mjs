import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { sql } from '../src/db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(here, '..', '..', 'db', 'schema.sql');
const schema = await readFile(schemaPath, 'utf8');

const statements = schema
  .split(';')
  .map((s) => s.replace(/--.*$/gm, '').trim())
  .filter(Boolean);

try {
  for (const statement of statements) {
    await sql(statement);
  }
  console.log(`[quill] Schema ready (${statements.length} statements): users, posts, claps, comments.`);
} catch (err) {
  console.error('[quill] Failed to create schema:', err.message);
  process.exit(1);
}
