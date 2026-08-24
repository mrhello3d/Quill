export function ClapIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 11l3.5-6a1.8 1.8 0 0 1 3.1 0L17 11" />
      <path d="M5.2 13.4a2 2 0 0 1 .3-2.8l.9-.7a2 2 0 0 1 2.8.3L12 13.6" />
      <path d="M12 13.6l-1.6 2a4.4 4.4 0 0 0 6.6 5.8l2.3-2.7c1.5-1.8 1.6-4.4.2-6.3L17 8.6" />
      <path d="M12 13.6l3-3.9a1.9 1.9 0 0 1 2.7-.3c.8.7 1 1.9.4 2.8" />
      <path d="M4.5 16.2c-.8-1.1-1-2.5-.5-3.8" opacity="0.55" />
    </svg>
  );
}

export function BubbleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-2.9-.4-4.1-1L3 20l1.1-4.3A8.5 8.5 0 1 1 21 11.5z" />
    </svg>
  );
}

export function PencilIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

export function SearchIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.8-3.8" />
    </svg>
  );
}

export function TrashIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
    </svg>
  );
}
