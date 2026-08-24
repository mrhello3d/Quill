const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function formatMonthYear(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function excerptFrom(preview, len = 180) {
  const clean = String(preview || '')
    .replace(/[#>*`[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > len ? `${clean.slice(0, len).trimEnd()}…` : clean;
}

const PALETTE = ['#b5541c', '#16794c', '#3b5bdb', '#7048e8', '#0b7285', '#c2255c', '#946200'];

export function avatarColor(name = '') {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
