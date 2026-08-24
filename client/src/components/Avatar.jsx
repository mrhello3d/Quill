import { avatarColor } from '../util/format.js';

export default function Avatar({ name = '', url = null, size = 32 }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';

  if (url) {
    return (
      <img
        className="avatar"
        style={{ width: size, height: size }}
        src={url}
        alt={name}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: avatarColor(name), fontSize: Math.round(size * 0.38) }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
