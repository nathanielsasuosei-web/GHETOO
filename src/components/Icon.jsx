const paths = {
  play: <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="7" y="5" width="3.4" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="13.6" y="5" width="3.4" height="14" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  next: (
    <>
      <path d="M6 5.5 15 12l-9 6.5v-13Z" fill="currentColor" stroke="none" />
      <rect x="16" y="5" width="2.4" height="14" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  prev: (
    <>
      <path d="M18 5.5 9 12l9 6.5v-13Z" fill="currentColor" stroke="none" />
      <rect x="5.6" y="5" width="2.4" height="14" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  volume: (
    <>
      <path d="M4 9.5h3L12 5v14L7 14.5H4v-5Z" fill="currentColor" stroke="none" />
      <path d="M15.5 8.6a4.8 4.8 0 0 1 0 6.8M18 6a8.3 8.3 0 0 1 0 12" />
    </>
  ),
  mute: (
    <>
      <path d="M4 9.5h3L12 5v14L7 14.5H4v-5Z" fill="currentColor" stroke="none" />
      <path d="m16 9.5 5 5m0-5-5 5" />
    </>
  ),
  heart: <path d="M12 20s-7.2-4.5-7.2-9.3A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.2 3.1C19.2 15.5 12 20 12 20Z" />,
  share: (
    <>
      <circle cx="18" cy="5.5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="18.5" r="2.5" />
      <path d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4" />
    </>
  ),
  arrow: <path d="M4 12h15m-5.5-5.5L19 12l-5.5 5.5" />,
  arrowUpRight: <path d="M7 17 17 7m0 0H8.5M17 7v8.5" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2.4" />
      <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3h-7A2.5 2.5 0 0 0 3 5.5v7A2.5 2.5 0 0 0 5.5 15" />
    </>
  ),
  menu: <path d="M3 7h18M3 12h18M3 17h18" />,
  headphone: (
    <>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="2.6" y="13" width="4.4" height="7" rx="2" />
      <rect x="17" y="13" width="4.4" height="7" rx="2" />
    </>
  ),
  video: (
    <>
      <rect x="2.5" y="6" width="13" height="12" rx="2.5" />
      <path d="m15.5 11 6-3.4v8.8l-6-3.4" />
    </>
  ),
  download: <path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 20h16" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: (
    <>
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
      <path d="M10.5 11v5.5M13.5 11v5.5" />
    </>
  ),
  edit: <path d="M15.5 4.5 19.5 8.5 9 19H5v-4L15.5 4.5Z" />,
  image: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <circle cx="8.5" cy="10" r="1.6" />
      <path d="m4 17 5-4.5 3.5 3 3-2.5 4.5 4" />
    </>
  ),
  upload: <path d="M12 20V8m0 0 4.5 4.5M12 8 7.5 12.5M4 4h16" />,
  dashboard: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 14.5a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-2.88 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.5 14H4a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 5.3 7.1l-.06-.06A2 2 0 1 1 8.07 4.2l.06.06A1.7 1.7 0 0 0 10 4.6V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.88 1.2l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0 1.2 2.88H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.5Z" />
    </>
  ),
  logout: <path d="M9 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4m5 4 4 4-4 4m4-4H8" />,
  mail: (
    <>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V6l11-2v12" />
      <circle cx="6.5" cy="18" r="2.8" />
      <circle cx="17.5" cy="16" r="2.8" />
    </>
  ),
  wallet: (
    <>
      <rect x="2.5" y="6" width="19" height="13" rx="3" />
      <path d="M2.5 10h19M16.5 14.5h2" />
    </>
  ),
  sparkle: <path d="M12 3l1.9 5.3L19 10l-5.1 1.7L12 17l-1.9-5.3L5 10l5.1-1.7L12 3Z" />,
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  tiktok: <path d="M14 4v9.5a4.2 4.2 0 1 1-3.4-4.1M14 4c.4 2.6 2 4.3 4.7 4.6" />,
  youtube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="m10.5 9.5 4.5 2.5-4.5 2.5v-5Z" fill="currentColor" stroke="none" />
    </>
  ),
  x: <path d="M4 4l16 16M20 4 4 20" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.5l3.5 2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.8 20a6.2 6.2 0 0 1 12.4 0M16 5.2a3.4 3.4 0 0 1 0 6.6M17.6 14.4A5.6 5.6 0 0 1 21.4 20" />
    </>
  ),
  trending: <path d="m3 17 5.5-5.5 4 4L21 7m0 0h-5.5M21 7v5.5" />,
  external: <path d="M14 4h6v6M20 4 10 14M18 14v5a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 19V8.6A1.8 1.8 0 0 1 5.8 6.8H11" />,
  quote: <path d="M9 6.5C6 7.5 4.5 10 4.5 13.5c0 2.4 1.3 4 3.3 4 1.8 0 3-1.2 3-2.9 0-1.6-1-2.7-2.5-2.7-.3 0-.6 0-.8.1.3-1.6 1.4-2.8 3-3.5L9 6.5Zm9 0c-3 1-4.5 3.5-4.5 7 0 2.4 1.3 4 3.3 4 1.8 0 3-1.2 3-2.9 0-1.6-1-2.7-2.5-2.7-.3 0-.6 0-.8.1.3-1.6 1.4-2.8 3-3.5L18 6.5Z" fill="currentColor" stroke="none" />,
};

export default function Icon({ name, size = 20, strokeWidth = 1.6, className = '', ...rest }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icon ${className}`}
      aria-hidden="true"
      {...rest}
    >
      {paths[name] || null}
    </svg>
  );
}
