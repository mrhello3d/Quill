import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    [
      '',
      '[quill] DATABASE_URL is missing.',
      '',
      '  1. Create a free database at https://console.neon.tech',
      '  2. Copy the connection string (Connection Details -> the postgres:// string)',
      '  3. Save it in server/.env  (see server/.env.example)',
      '',
    ].join('\n')
  );
  process.exit(1);
}

export const sql = neon(connectionString);

export function query(text, params = []) {
  return sql(text, params);
}
