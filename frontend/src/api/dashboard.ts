import { apiFetch } from './client.ts'

// Long-range revenue for the owner dashboard, see DashboardOverview.java / RevenueSeries.java.
// Dates are yyyy-mm-dd (Vietnam time), ranges are inclusive.

export interface PeriodStat {
  from: string
  to: string
  revenue: number
  orderCount: number
  /** Same number of days at the start of the previous period (or the whole of yesterday for "today"). */
  previousFrom: string
  previousTo: string
  previousRevenue: number
  previousOrderCount: number
}

export interface DashboardOverview {
  /** Today in Vietnam time. */
  date: string
  today: PeriodStat
  month: PeriodStat
  quarter: PeriodStat
  year: PeriodStat
  allTime: { revenue: number; orderCount: number; firstOrderDate: string | null }
}

export type Granularity = 'MONTH' | 'QUARTER' | 'YEAR'

export interface RevenueBucket {
  start: string
  end: string
  revenue: number
  orderCount: number
  /** Same month / quarter / year one year earlier. */
  previousYearRevenue: number
  previousYearOrderCount: number
  /** The bucket has not ended yet (e.g. the current month). */
  inProgress: boolean
}

export interface RevenueSeries {
  groupBy: Granularity
  /** Widened by the server to whole buckets. */
  from: string
  to: string
  revenue: number
  orderCount: number
  previousYearRevenue: number
  previousYearOrderCount: number
  buckets: RevenueBucket[]
}

/** Owner only. */
export function fetchDashboardOverview(): Promise<DashboardOverview> {
  return apiFetch<DashboardOverview>('/api/dashboard/overview')
}

/** Owner only. Without `from`/`to` the server returns the last 12 months, 8 quarters or 5 years. */
export function fetchRevenueSeries(groupBy: Granularity, range?: { from: string; to: string }): Promise<RevenueSeries> {
  const query = new URLSearchParams({ groupBy })
  if (range) {
    query.set('from', range.from)
    query.set('to', range.to)
  }
  return apiFetch<RevenueSeries>(`/api/dashboard/revenue?${query}`)
}
