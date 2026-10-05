import type { Granularity } from '../../api/dashboard.ts'

// Labels for months, quarters and years. Dates are yyyy-mm-dd strings from the API.

export const GRANULARITY_LABELS: Record<Granularity, string> = {
  MONTH: 'Tháng',
  QUARTER: 'Quý',
  YEAR: 'Năm',
}

function parts(iso: string): { year: number; month: number } {
  const [year, month] = iso.split('-').map(Number)
  return { year, month }
}

/** Short axis label: "T3", "T1/26" (January or first column shows the year), "Q2/26", "2026". */
export function bucketShortLabel(start: string, groupBy: Granularity, showYear: boolean): string {
  const { year, month } = parts(start)
  const yy = String(year).slice(2)
  switch (groupBy) {
    case 'MONTH':
      return showYear || month === 1 ? `T${month}/${yy}` : `T${month}`
    case 'QUARTER':
      return `Q${Math.ceil(month / 3)}/${yy}`
    case 'YEAR':
      return String(year)
  }
}

/** Full label: "Tháng 3/2026", "Quý 2/2026", "Năm 2026". `yearsBack` = 1 gives the same period last year. */
export function bucketLongLabel(start: string, groupBy: Granularity, yearsBack = 0): string {
  const { month } = parts(start)
  const year = parts(start).year - yearsBack
  switch (groupBy) {
    case 'MONTH':
      return `Tháng ${month}/${year}`
    case 'QUARTER':
      return `Quý ${Math.ceil(month / 3)}/${year}`
    case 'YEAR':
      return `Năm ${year}`
  }
}

/** Relative change, or null when there is nothing to compare with (previous is 0). */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return (current - previous) / previous
}

/** 0.123 → "+12%", -0.05 → "−5%", 0.004 → "0%". */
export function formatPercent(change: number): string {
  const rounded = Math.round(change * 100)
  if (rounded === 0) return '0%'
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded).toLocaleString('vi-VN')}%`
}

/** "2026-10-01".."2026-10-05" → "01/10 – 05/10/2026"; one day → "05/10/2026". */
export function formatDateRange(from: string, to: string): string {
  const [fy, fm, fd] = from.split('-')
  const [ty, tm, td] = to.split('-')
  if (from === to) return `${td}/${tm}/${ty}`
  return fy === ty ? `${fd}/${fm} – ${td}/${tm}/${ty}` : `${fd}/${fm}/${fy} – ${td}/${tm}/${ty}`
}

/** Rounds up to 1, 2, 2.5 or 5 × 10^n so axis ticks are clean numbers (0 / 5 tr / 10 tr). */
export function niceCeiling(value: number): number {
  if (value <= 0) return 0
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value) ?? 10
  return step * magnitude
}
