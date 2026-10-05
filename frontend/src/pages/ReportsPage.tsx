import { useEffect, useState } from 'react'
import { PAYMENT_LABELS } from '../api/orders.ts'
import { fetchReport, type ReportSummary } from '../api/reports.ts'
import { getSession } from '../api/session.ts'
import Button from '../components/Button.tsx'
import EmptyState from '../components/EmptyState.tsx'
import Icon from '../components/Icon.tsx'
import ColumnChart from '../components/reports/ColumnChart.tsx'
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts'
import { addDays, formatDay, formatNumber, formatVnd, formatVndShort, toIsoDate } from '../lib/format.ts'
import './ReportsPage.css'

type RangeKey = 'today' | 'yesterday' | '7d' | '30d' | 'month'

const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Hôm nay' },
  { key: 'yesterday', label: 'Hôm qua' },
  { key: '7d', label: '7 ngày' },
  { key: '30d', label: '30 ngày' },
  { key: 'month', label: 'Tháng này' },
]

function rangeDates(key: RangeKey): { from: string; to: string } {
  const today = toIsoDate(new Date())
  switch (key) {
    case 'today':
      return { from: today, to: today }
    case 'yesterday':
      return { from: addDays(today, -1), to: addDays(today, -1) }
    case '7d':
      return { from: addDays(today, -6), to: today }
    case '30d':
      return { from: addDays(today, -29), to: today }
    case 'month':
      return { from: `${today.slice(0, 8)}01`, to: today }
  }
}

/** Revenue reports for the owner (staff cannot see the shop's revenue). */
export default function ReportsPage() {
  const isOwner = getSession()?.user.role === 'OWNER'
  const online = useOnlineStatus()
  const [range, setRange] = useState<RangeKey>('today')
  const [report, setReport] = useState<ReportSummary | null>(null)
  const [loadedRange, setLoadedRange] = useState<RangeKey | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!isOwner || !online) return
    let cancelled = false
    const { from, to } = rangeDates(range)
    fetchReport(from, to)
      .then((data) => {
        if (cancelled) return
        setReport(data)
        setError(null)
        setLoadedRange(range)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Không tải được báo cáo')
        setLoadedRange(range)
      })
    return () => {
      cancelled = true
    }
  }, [range, online, isOwner, reloadKey])

  if (!isOwner) {
    return (
      <section>
        <div className="page-header">
          <h1>Báo cáo</h1>
        </div>
        <EmptyState icon="chart" title="Chỉ chủ quán xem được báo cáo" description="Hãy nhờ chủ quán xem doanh thu." />
      </section>
    )
  }

  const loading = loadedRange !== range

  return (
    <section>
      <div className="page-header">
        <h1>Báo cáo</h1>
      </div>
      <div className="chip-row report-ranges" role="group" aria-label="Khoảng thời gian">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            className={range === r.key ? 'chip is-active' : 'chip'}
            aria-pressed={range === r.key}
            onClick={() => setRange(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {!online ? (
        <div className="notice notice-warning" role="status">
          <Icon name="wifiOff" />
          <span>Đang mất mạng: cần có mạng để xem báo cáo.</span>
        </div>
      ) : loading ? (
        <ReportSkeleton />
      ) : error || !report ? (
        <EmptyState
          icon="alert"
          title="Không tải được báo cáo"
          description={error ?? undefined}
          action={
            <Button icon="refresh" onClick={() => setReloadKey((k) => k + 1)}>
              Thử lại
            </Button>
          }
        />
      ) : (
        <ReportView report={report} />
      )}
    </section>
  )
}

function ReportView({ report }: { report: ReportSummary }) {
  const singleDay = report.from === report.to
  const period = singleDay
    ? formatDay(report.from, 'long')
    : `${formatDay(report.from)} – ${formatDay(report.to)}`

  if (report.orderCount === 0 && report.cancelledCount === 0) {
    return (
      <>
        <p className="muted report-period">{period}</p>
        <EmptyState icon="receipt" title="Chưa có đơn nào" description="Chưa bán được đơn nào trong khoảng thời gian này." />
      </>
    )
  }

  // Hours: show the usual opening hours, widened if sales happened outside them.
  const busyHours = report.hours.filter((h) => h.orderCount > 0).map((h) => h.hour)
  const firstHour = Math.min(6, ...busyHours)
  const lastHour = Math.max(22, ...busyHours)
  const hours = report.hours.filter((h) => h.hour >= firstHour && h.hour <= lastHour)
  const maxItemRevenue = Math.max(1, ...report.topItems.map((i) => i.revenue))

  return (
    <>
      <p className="muted report-period">{period}</p>

      <div className="report-hero card">
        <span className="report-hero-label">Doanh thu</span>
        <span className="report-hero-value">{formatVnd(report.revenue)}</span>
        <div className="report-kpis">
          <Kpi label="Số đơn" value={formatNumber(report.orderCount)} />
          <Kpi label="Trung bình / đơn" value={formatVnd(report.averageOrderValue)} />
          <Kpi label="Đơn đã huỷ" value={formatNumber(report.cancelledCount)} />
        </div>
      </div>

      <div className="report-grid">
        {!singleDay && (
          <div className="card report-wide">
            <h2>Doanh thu theo ngày</h2>
            <ColumnChart
              label="Doanh thu theo ngày"
              formatValue={formatVndShort}
              columns={report.days.map((d) => ({
                key: d.date,
                label: formatDay(d.date),
                value: d.revenue,
                tooltip: `${formatDay(d.date)} · ${formatVnd(d.revenue)} · ${d.orderCount} đơn`,
              }))}
            />
            <details className="report-table-toggle">
              <summary>Xem bảng số liệu</summary>
              <table className="report-table">
                <thead>
                  <tr>
                    <th scope="col">Ngày</th>
                    <th scope="col">Số đơn</th>
                    <th scope="col">Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {report.days.map((d) => (
                    <tr key={d.date}>
                      <td>{formatDay(d.date)}</td>
                      <td>{formatNumber(d.orderCount)}</td>
                      <td>{formatVnd(d.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </div>
        )}

        <div className="card report-wide">
          <h2>Số đơn theo giờ</h2>
          <p className="muted card-hint">Giúp biết giờ nào đông khách để xếp ca.</p>
          <ColumnChart
            label="Số đơn theo giờ"
            formatValue={(v) => formatNumber(v)}
            columns={hours.map((h) => ({
              key: String(h.hour),
              label: `${h.hour}h`,
              value: h.orderCount,
              tooltip: `${h.hour}:00–${h.hour}:59 · ${h.orderCount} đơn · ${formatVnd(h.revenue)}`,
            }))}
          />
        </div>

        <div className="card">
          <h2>Thanh toán</h2>
          <ul className="share-list">
            {report.paymentMethods.map((p) => {
              const share = report.revenue === 0 ? 0 : p.revenue / report.revenue
              return (
                <li key={p.method}>
                  <div className="share-row">
                    <span>{PAYMENT_LABELS[p.method]}</span>
                    <span className="muted">{p.orderCount} đơn</span>
                    <span className="spacer" />
                    <strong>{formatVnd(p.revenue)}</strong>
                  </div>
                  <div className="share-track" aria-hidden="true">
                    <div className="share-bar" style={{ width: `${share * 100}%` }} />
                  </div>
                  <span className="visually-hidden">{Math.round(share * 100)}% doanh thu</span>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="card">
          <h2>Món bán chạy</h2>
          {report.topItems.length === 0 ? (
            <p className="muted">Chưa có món nào.</p>
          ) : (
            <table className="report-table top-items">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Món</th>
                  <th scope="col">SL</th>
                  <th scope="col">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {report.topItems.map((item, index) => (
                  <tr key={item.name}>
                    <td className="muted">{index + 1}</td>
                    <td>
                      {item.name}
                      <div className="share-track thin" aria-hidden="true">
                        <div className="share-bar" style={{ width: `${(item.revenue / maxItemRevenue) * 100}%` }} />
                      </div>
                    </td>
                    <td>{formatNumber(item.quantity)}</td>
                    <td>{formatVnd(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
    </div>
  )
}

function ReportSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải báo cáo">
      <div className="skeleton" style={{ height: 160, marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 260 }} />
    </div>
  )
}
