export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

export function makeSlug(title) {
  const base = slugify(title) || 'story';
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

export function readingTime(content) {
  const words = String(content).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  const cleaned = tags.map((t) =>
    String(t).trim().toLowerCase().replace(/^#+/, '').slice(0, 24)
  );
  return [...new Set(cleaned.filter(Boolean))].slice(0, 5);
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s) => UUID_RE.test(String(s));
