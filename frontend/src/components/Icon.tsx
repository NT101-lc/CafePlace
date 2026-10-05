import type { ReactNode } from 'react'

// Small inline SVG icon set (24x24, stroke-based). Add new icons here instead of installing an icon library.

const PATHS = {
  coffee: (
    <>
      <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z" />
      <path d="M16 9h1.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M7 2.5c0 1 1 1.5 1 2.5s-1 1.5-1 2.5M11 2.5c0 1 1 1.5 1 2.5s-1 1.5-1 2.5" />
      <path d="M3 21h15" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 2.5h12v19l-3-2-3 2-3-2-3 2v-19Z" />
      <path d="M9 7.5h6M9 11.5h6M9 15.5h3" />
    </>
  ),
  menu: (
    <>
      <path d="M4 4.5h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3v-13Z" />
      <path d="M18 7.5h2v13h-2M8 9h6M8 13h6" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4M4 20h16" />
      <path d="M8 16v-4M12 16V8M16 16v-6" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="9" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
      <rect x="3.5" y="15.5" width="7" height="5" rx="1.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  pencil: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 13h10l1-13M9 7V4h6v3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  wifiOff: (
    <>
      <path d="M3 3l18 18" />
      <path d="M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5-2.7M14 10.4A10 10 0 0 1 19 13M2 9.5a15 15 0 0 1 4.4-2.8M11 6a15 15 0 0 1 11 3.5" />
      <path d="M12 20h.01" />
    </>
  ),
  logout: (
    <>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M10 16l-4-4 4-4M6 12h10" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5h.01" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15Z" />
      <path d="M5 19 13 11" />
    </>
  ),
  cake: (
    <>
      <path d="M4 20h16v-7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7Z" />
      <path d="M4 15c2 1.5 4 1.5 5.3 0 1.4 1.5 4 1.5 5.4 0 1.3 1.5 3.3 1.5 5.3 0" />
      <path d="M12 11V7.5M12 4.5v.01" />
    </>
  ),
  snowflake: (
    <>
      <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />
      <path d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2" />
    </>
  ),
  glass: (
    <>
      <path d="M6 3h12l-1.5 17a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1L6 3Z" />
      <path d="M6.6 9h10.8" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-5-9 9" />
    </>
  ),
  arrowUp: <path d="M12 19V5M6 11l6-6 6 6" />,
  arrowDown: <path d="M12 5v14M6 13l6 6 6-6" />,
  sort: (
    <>
      <path d="M7 4v16M3.5 7.5 7 4l3.5 3.5" />
      <path d="M17 20V4M13.5 16.5 17 20l3.5-3.5" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14.6-4.5L4 8" />
      <path d="M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16" />
      <path d="M20 20v-4h-4" />
    </>
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof PATHS

interface Props {
  name: IconName
  size?: number
  className?: string
}

/** Decorative icon. Always pair it with visible text or an aria-label on the parent. */
export default function Icon({ name, size = 20, className }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
