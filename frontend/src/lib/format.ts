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
