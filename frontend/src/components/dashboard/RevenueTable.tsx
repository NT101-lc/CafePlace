import type { RevenueSeries } from '../../api/dashboard.ts'
import { formatNumber, formatVnd } from '../../lib/format.ts'
import DeltaBadge from './DeltaBadge.tsx'
import { GRANULARITY_LABELS, bucketLongLabel } from './periods.ts'
import './RevenueTable.css'

interface Props {
  series: RevenueSeries
  today: string
  showComparison: boolean
}

/** The chart's numbers as a table, newest period first, with a total row. */
export default function RevenueTable({ series, today, showComparison }: Props) {
  // Leave out periods that have not started yet and those before the first sale (all zeros).
  const started = series.buckets.filter((b) => b.start <= today)
  const firstSale = started.findIndex((b) => b.revenue > 0 || b.previousYearRevenue > 0)
  const rows = (firstSale < 0 ? started : started.slice(firstSale)).reverse()
  const average = (revenue: number, orders: number) => (orders === 0 ? '—' : formatVnd(Math.round(revenue / orders)))

  return (
    <div className="rev-table-wrap">
      <table className="rev-table">
        <thead>
          <tr>
            <th scope="col">{GRANULARITY_LABELS[series.groupBy]}</th>
            <th scope="col">Doanh thu</th>
            <th scope="col" className="rev-table-optional">
              Số đơn
            </th>
            <th scope="col" className="rev-table-optional">
              TB/đơn
            </th>
            {showComparison && (
              <>
                <th scope="col" className="rev-table-optional">
                  Cùng kỳ năm trước
                </th>
                <th scope="col">Thay đổi</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.start}>
              <th scope="row">
                {bucketLongLabel(b.start, series.groupBy)}
                {b.inProgress && <span className="muted"> (đang diễn ra)</span>}
              </th>
              <td>{formatVnd(b.revenue)}</td>
              <td className="rev-table-optional">{formatNumber(b.orderCount)}</td>
              <td className="rev-table-optional">{average(b.revenue, b.orderCount)}</td>
              {showComparison && (
                <>
                  <td className="rev-table-optional">{formatVnd(b.previousYearRevenue)}</td>
                  <td>
                    <DeltaBadge current={b.revenue} previous={b.previousYearRevenue} />
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Tổng</th>
            <td>{formatVnd(series.revenue)}</td>
            <td className="rev-table-optional">{formatNumber(series.orderCount)}</td>
            <td className="rev-table-optional">{average(series.revenue, series.orderCount)}</td>
            {showComparison && (
              <>
                <td className="rev-table-optional">{formatVnd(series.previousYearRevenue)}</td>
                <td>
                  <DeltaBadge current={series.revenue} previous={series.previousYearRevenue} />
                </td>
              </>
            )}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
