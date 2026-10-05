import { apiFetch } from './client.ts'
import type { PaymentMethod } from './orders.ts'

/** Sales summary of paid orders, see ReportSummary.java. Dates are yyyy-mm-dd (Vietnam time). */
export interface ReportSummary {
  from: string
  to: string
  revenue: number
  orderCount: number
  averageOrderValue: number
  cancelledCount: number
  days: { date: string; revenue: number; orderCount: number }[]
  /** Always 24 entries, hour 0..23. */
  hours: { hour: number; revenue: number; orderCount: number }[]
  paymentMethods: { method: PaymentMethod; revenue: number; orderCount: number }[]
  topItems: { name: string; quantity: number; revenue: number }[]
}

/** Owner only. `from` and `to` are inclusive. */
export function fetchReport(from: string, to: string): Promise<ReportSummary> {
  return apiFetch<ReportSummary>(`/api/reports/summary?from=${from}&to=${to}`)
}
