// Formatting helpers for Vietnamese users.

const numberFormat = new Intl.NumberFormat('vi-VN')

/** 25000 → "25.000" */
export function formatNumber(value: number): string {
  return numberFormat.format(value)
}

/** 25000 → "25.000đ" */
export function formatVnd(value: number): string {
  return `${formatNumber(value)}đ`
}

/** Keeps only digits: "25.000đ" → "25000". Used by money inputs. */
export function digitsOnly(text: string): string {
  return text.replace(/\D/g, '')
}

/** Vietnamese-aware comparison for sorting names. */
export function compareVi(a: string, b: string): number {
  return a.localeCompare(b, 'vi', { sensitivity: 'base' })
}

/** Lower-case and strip Vietnamese accents so "ca phe" matches "Cà phê". */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

/** "2026-10-05T07:12:00Z" → "14:12" (device time zone; shops are in Vietnam). */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

/** Local calendar date as yyyy-mm-dd (the format the API uses for days). */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** yyyy-mm-dd → Date at local midnight. */
export function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, days: number): string {
  const date = fromIsoDate(iso)
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

/** "2026-10-05" → "05/10" (short) or "Chủ nhật, 05/10/2026" (long). */
export function formatDay(iso: string, style: 'short' | 'long' = 'short'): string {
  // Built by hand: browsers disagree on the separator for vi-VN short dates ("05/10" vs "05-10").
  const [y, m, d] = iso.split('-')
  if (style === 'short') return `${d}/${m}`
  const weekday = fromIsoDate(iso).toLocaleDateString('vi-VN', { weekday: 'long' })
  return `${weekday}, ${d}/${m}/${y}`
}

/** 1250000 → "1,25 tr", 85000 → "85k" (for chart labels where space is tight). */
export function formatVndShort(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tr`
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`
  return String(value)
}
