import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  fetchDashboardOverview,
  fetchRevenueSeries,
  type DashboardOverview,
  type Granularity,
  type RevenueSeries,
} from '../api/dashboard.ts'
import { getSession } from '../api/session.ts'
import Button from '../components/Button.tsx'
import EmptyState from '../components/EmptyState.tsx'
import Icon from '../components/Icon.tsx'
import Switch from '../components/Switch.tsx'
import DeltaBadge from '../components/dashboard/DeltaBadge.tsx'
import RevenueChart from '../components/dashboard/RevenueChart.tsx'
import RevenueTable from '../components/dashboard/RevenueTable.tsx'
import StatTile from '../components/dashboard/StatTile.tsx'
import { GRANULARITY_LABELS, bucketLongLabel, formatDateRange } from '../components/dashboard/periods.ts'
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts'
import { formatNumber, formatVnd, formatVndShort, toIsoDate } from '../lib/format.ts'
import './DashboardPage.css'

type RangeKey = 'recent' | 'thisYear' | 'lastYear' | 'custom'

const RECENT_LABELS: Record<Granularity, string> = {
  MONTH: '12 tháng gần nhất',
  QUARTER: '8 quý gần nhất',
  YEAR: '5 năm gần nhất',
}

function rangeOptions(groupBy: Granularity): { key: RangeKey; label: string }[] {
  const options: { key: RangeKey; label: string }[] = [{ key: 'recent', label: RECENT_LABELS[groupBy] }]
  if (groupBy !== 'YEAR') {
    options.push({ key: 'thisYear', label: 'Năm nay' }, { key: 'lastYear', label: 'Năm trước' })
  }
  options.push({ key: 'custom', label: 'Tùy chọn' })
  return options
}

/** yyyy-mm of `months` months before the month of `iso`. */
function shiftMonth(iso: string, months: number): string {
  const [y, m] = iso.split('-').map(Number)
  const date = new Date(y, m - 1 + months, 1)
  return toIsoDate(date).slice(0, 7)
}

/** Range sent to the server, `undefined` = server default, `null` = custom range not valid yet. */
function rangeFor(key: RangeKey, today: string, custom: { from: string; to: string }) {
  const year = Number(today.slice(0, 4))
  switch (key) {
    case 'recent':
      return undefined
    case 'thisYear':
      return { from: `${year}-01-01`, to: `${year}-12-31` }
    case 'lastYear':
      return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` }
    case 'custom':
      return custom.from && custom.to && custom.from <= custom.to
        ? { from: `${custom.from}-01`, to: `${custom.to}-01` }
        : null
  }
}

/**
 * Owner dashboard: all-time revenue, today / month / quarter / year with comparisons, and a chart of
 * revenue per month, quarter or year (any period) against the same period last year.
 * The daily report (hours, payment methods, best sellers) is on the "Báo cáo" page.
 */
export default function DashboardPage() {
  const isOwner = getSession()?.user.role === 'OWNER'
  const online = useOnlineStatus()
  const navigate = useNavigate()

  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [overviewError, setOverviewError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [groupBy, setGroupBy] = useState<Granularity>('MONTH')
  const [rangeKey, setRangeKey] = useState<RangeKey>('recent')
  const [deviceToday] = useState(() => toIsoDate(new Date()))
  const [custom, setCustom] = useState({ from: shiftMonth(deviceToday, -11), to: deviceToday.slice(0, 7) })
  const [showComparison, setShowComparison] = useState(true)
  const [series, setSeries] = useState<RevenueSeries | null>(null)
  const [seriesError, setSeriesError] = useState<string | null>(null)
  const [loadedSeriesKey, setLoadedSeriesKey] = useState<string | null>(null)

  // The server's "today" (Vietnam time) once known; the device date until then.
  const today = overview?.date ?? deviceToday
  const range = rangeFor(rangeKey, today, custom)
  const rangeFrom = range?.from ?? ''
  const rangeTo = range?.to ?? ''
  const rangeInvalid = range === null
  // Identifies one request: the chart shows a skeleton until the response for this key arrives.
  const seriesKey = `${groupBy}|${rangeFrom}|${rangeTo}|${reloadKey}`

  useEffect(() => {
    if (!isOwner || !online) return
    let cancelled = false
    fetchDashboardOverview()
      .then((data) => {
        if (cancelled) return
        setOverview(data)
        setOverviewError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setOverviewError(err instanceof Error ? err.message : 'Không tải được số liệu')
      })
    return () => {
      cancelled = true
    }
  }, [isOwner, online, reloadKey])

  useEffect(() => {
    if (!isOwner || !online || rangeInvalid) return
    let cancelled = false
    fetchRevenueSeries(groupBy, rangeFrom ? { from: rangeFrom, to: rangeTo } : undefined)
      .then((data) => {
        if (cancelled) return
        setSeries(data)
        setSeriesError(null)
        setLoadedSeriesKey(seriesKey)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setSeriesError(err instanceof Error ? err.message : 'Không tải được biểu đồ')
        setLoadedSeriesKey(seriesKey)
      })
    return () => {
      cancelled = true
    }
  }, [isOwner, online, groupBy, rangeFrom, rangeTo, rangeInvalid, seriesKey])

  function changeGroupBy(next: Granularity) {
    setGroupBy(next)
    if (next === 'YEAR' && (rangeKey === 'thisYear' || rangeKey === 'lastYear')) setRangeKey('recent')
  }

  if (!isOwner) {
    return (
      <section>
        <div className="page-header">
          <h1>Tổng quan</h1>
        </div>
        <EmptyState icon="chart" title="Chỉ chủ quán xem được doanh thu" description="Hãy nhờ chủ quán xem tổng quan." />
      </section>
    )
  }

  const header = (
    <div className="page-header">
      <div>
        <h1>Tổng quan</h1>
        <p className="subtitle">Doanh thu các đơn đã thanh toán, tính đến hôm nay {formatDateRange(today, today)}</p>
      </div>
      <Button
        variant="ghost"
        icon="refresh"
        className="btn-icon"
        aria-label="Tải lại số liệu"
        disabled={!online}
        onClick={() => setReloadKey((k) => k + 1)}
      />
    </div>
  )

  if (!online && !overview) {
    return (
      <section>
        {header}
        <div className="notice notice-warning" role="status">
          <Icon name="wifiOff" />
          <span>Đang mất mạng: cần có mạng để xem doanh thu.</span>
        </div>
      </section>
    )
  }

  if (!overview) {
    return (
      <section>
        {header}
        {overviewError ? (
          <EmptyState
            icon="alert"
            title="Không tải được số liệu"
            description={overviewError}
            action={
              <Button icon="refresh" onClick={() => setReloadKey((k) => k + 1)}>
                Thử lại
              </Button>
            }
          />
        ) : (
          <DashboardSkeleton />
        )}
      </section>
    )
  }

  if (overview.allTime.orderCount === 0) {
    return (
      <section>
        {header}
        <EmptyState
          icon="chart"
          title="Chưa có doanh thu"
          description="Khi quán bán đơn đầu tiên, doanh thu theo tháng, quý và năm sẽ hiện ở đây."
          action={
            <Button variant="primary" icon="receipt" onClick={() => navigate('/orders')}>
              Bán hàng
            </Button>
          }
        />
      </section>
    )
  }

  const seriesLoading = !rangeInvalid && loadedSeriesKey !== seriesKey
  const unit = GRANULARITY_LABELS[groupBy].toLowerCase()

  return (
    <section className="dashboard">
      {header}

      {!online && (
        <div className="notice notice-warning" role="status">
          <Icon name="wifiOff" />
          <span>Đang mất mạng: số liệu dưới đây có thể chưa mới nhất.</span>
        </div>
      )}

      <div className="dash-top">
        <article className="dash-hero">
          <h2 className="dash-hero-label">Tổng doanh thu</h2>
          <p className="dash-hero-value">{formatVnd(overview.allTime.revenue)}</p>
          <p className="muted">
            {formatNumber(overview.allTime.orderCount)} đơn
            {overview.allTime.firstOrderDate &&
              ` · từ ${formatDateRange(overview.allTime.firstOrderDate, overview.allTime.firstOrderDate)}`}
          </p>
        </article>

        <div className="dash-tiles">
          <StatTile label="Hôm nay" stat={overview.today} previousLabel="Hôm qua" />
          <StatTile label="Tháng này" stat={overview.month} />
          <StatTile label="Quý này" stat={overview.quarter} />
          <StatTile label="Năm nay" stat={overview.year} />
        </div>
      </div>

      <article className="dash-card">
        <div className="dash-card-header">
          <h2>Doanh thu theo {unit}</h2>
          <div className="segmented" role="group" aria-label="Nhóm theo">
            {(Object.keys(GRANULARITY_LABELS) as Granularity[]).map((g) => (
              <button
                key={g}
                type="button"
                className={g === groupBy ? 'is-active' : undefined}
                aria-pressed={g === groupBy}
                onClick={() => changeGroupBy(g)}
              >
                {GRANULARITY_LABELS[g]}
              </button>
            ))}
          </div>
        </div>

        <div className="chip-row" role="group" aria-label="Khoảng thời gian">
          {rangeOptions(groupBy).map((option) => (
            <button
              key={option.key}
              type="button"
              className={option.key === rangeKey ? 'chip is-active' : 'chip'}
              aria-pressed={option.key === rangeKey}
              onClick={() => setRangeKey(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {rangeKey === 'custom' && (
          <div className="dash-custom-range">
            <label>
              <span>Từ tháng</span>
              <input
                type="month"
                value={custom.from}
                max={custom.to || undefined}
                onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
              />
            </label>
            <label>
              <span>Đến tháng</span>
              <input
                type="month"
                value={custom.to}
                min={custom.from || undefined}
                onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
              />
            </label>
            {rangeInvalid && <p className="dash-custom-error">Chọn tháng bắt đầu trước tháng kết thúc.</p>}
          </div>
        )}

        {rangeInvalid ? null : seriesLoading ? (
          <div className="skeleton dash-chart-skeleton" aria-label="Đang tải biểu đồ" />
        ) : seriesError || !series ? (
          <div className="notice notice-danger" role="alert">
            <Icon name="alert" />
            <span>
              {seriesError ?? 'Không tải được biểu đồ'}{' '}
              <button type="button" className="notice-action" onClick={() => setReloadKey((k) => k + 1)}>
                Thử lại
              </button>
            </span>
          </div>
        ) : (
          <>
            <SeriesSummary series={series} today={today} unit={unit} />
            <RevenueChart
              key={seriesKey}
              series={series}
              today={today}
              showComparison={showComparison}
            />
            <div className="toggle-row dash-compare-toggle">
              <div>
                <div className="toggle-row-label">So với cùng kỳ năm trước</div>
                <div className="toggle-row-hint muted">Thêm cột xám: cùng {unit} của năm trước</div>
              </div>
              <Switch checked={showComparison} onChange={setShowComparison} label="So với cùng kỳ năm trước" />
            </div>
          </>
        )}
      </article>

      {series && !seriesLoading && !seriesError && !rangeInvalid && (
        <article className="dash-card">
          <h2>Chi tiết theo {unit}</h2>
          <RevenueTable series={series} today={today} showComparison={showComparison} />
        </article>
      )}
    </section>
  )
}

/** Total of the chosen period, average per month/quarter/year and the best one. */
function SeriesSummary({ series, today, unit }: { series: RevenueSeries; today: string; unit: string }) {
  const started = series.buckets.filter((b) => b.start <= today)
  // Average from the first period with sales: years before the shop opened would drag it down.
  const firstSale = started.findIndex((b) => b.revenue > 0)
  const counted = firstSale < 0 ? 0 : started.length - firstSale
  const average = counted === 0 ? 0 : Math.round(series.revenue / counted)
  const best = started.reduce<(typeof started)[number] | null>(
    (top, b) => (b.revenue > 0 && (!top || b.revenue > top.revenue) ? b : top),
    null,
  )
  return (
    <dl className="dash-summary">
      <div>
        <dt>Tổng kỳ này</dt>
        <dd>
          {formatVnd(series.revenue)}
          <DeltaBadge current={series.revenue} previous={series.previousYearRevenue} />
        </dd>
        <dd className="dash-summary-hint">
          Cùng kỳ năm trước {formatVndShort(series.previousYearRevenue)} · {formatDateRange(series.from, series.to)}
        </dd>
      </div>
      <div>
        <dt>Trung bình mỗi {unit}</dt>
        <dd>{formatVnd(average)}</dd>
        <dd className="dash-summary-hint">{formatNumber(series.orderCount)} đơn trong kỳ</dd>
      </div>
      <div>
        <dt>Cao nhất</dt>
        <dd>{best ? formatVnd(best.revenue) : '—'}</dd>
        <dd className="dash-summary-hint">{best ? bucketLongLabel(best.start, series.groupBy) : 'Chưa có doanh thu'}</dd>
      </div>
    </dl>
  )
}

function DashboardSkeleton() {
  return (
    <div className="dashboard" aria-label="Đang tải">
      <div className="dash-top">
        <div className="skeleton dash-hero-skeleton" />
        <div className="dash-tiles">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton dash-tile-skeleton" />
          ))}
        </div>
      </div>
      <div className="skeleton dash-chart-skeleton" />
    </div>
  )
}
