import { useState } from 'react'
import type { RevenueBucket, RevenueSeries } from '../../api/dashboard.ts'
import { formatDay, formatNumber, formatVnd, formatVndShort } from '../../lib/format.ts'
import DeltaBadge from './DeltaBadge.tsx'
import { bucketLongLabel, bucketShortLabel, niceCeiling } from './periods.ts'
import './RevenueChart.css'

interface Props {
  series: RevenueSeries
  /** Today (yyyy-mm-dd, Vietnam time): later buckets have no data yet. */
  today: string
  /** Draw "same period last year" next to each column. */
  showComparison: boolean
}

/**
 * Column chart of revenue per month / quarter / year, in plain HTML/CSS.
 * Current revenue is the brand color; "same period last year" is a quiet neutral column beside it.
 * The bucket still in progress is hatched. Hovering, focusing or tapping a column shows its exact
 * numbers in the readout above the chart (works on touch screens too).
 */
export default function RevenueChart({ series, today, showComparison }: Props) {
  const { buckets, groupBy } = series
  const [active, setActive] = useState(() => defaultActive(buckets, today))
  const values = buckets.flatMap((b) => (showComparison ? [b.revenue, b.previousYearRevenue] : [b.revenue]))
  const top = niceCeiling(Math.max(0, ...values))
  const ticks = [top, top / 2, 0]
  const max = Math.max(0, ...buckets.map((b) => b.revenue))
  const peakIndex = max > 0 ? buckets.findIndex((b) => b.revenue === max) : -1
  // Label every column when they fit, otherwise every n-th (more are hidden on phones, see CSS).
  const labelEvery = Math.max(1, Math.ceil(buckets.length / 12))
  const height = (value: number) => (top === 0 ? '0%' : `${(value / top) * 100}%`)
  const current = buckets[active]

  return (
    <div className="rev-chart">
      {current && <Readout bucket={current} series={series} today={today} showComparison={showComparison} />}

      <div className="rev-chart-body">
        <div className="rev-axis" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t}>{t === 0 ? '0' : formatVndShort(t)}</span>
          ))}
        </div>
        <div
          className={showComparison ? 'rev-plot has-comparison' : 'rev-plot'}
          role="group"
          aria-label={`Doanh thu theo ${groupBy === 'MONTH' ? 'tháng' : groupBy === 'QUARTER' ? 'quý' : 'năm'}`}
        >
          <div className="rev-grid" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          {buckets.map((bucket, index) => {
            const future = bucket.start > today
            const partial = bucket.inProgress && !future
            const labelShown = index % labelEvery === 0
            return (
              <button
                key={bucket.start}
                type="button"
                className={index === active ? 'rev-slot is-active' : 'rev-slot'}
                aria-pressed={index === active}
                aria-label={`${bucketLongLabel(bucket.start, groupBy)}: ${formatVnd(bucket.revenue)}, ${bucket.orderCount} đơn`}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onClick={() => setActive(index)}
              >
                <span className="rev-track">
                  {showComparison && (
                    <span className="rev-bar rev-bar-previous" style={{ height: height(bucket.previousYearRevenue) }} />
                  )}
                  <span
                    className={partial ? 'rev-bar rev-bar-current is-partial' : 'rev-bar rev-bar-current'}
                    style={{ height: height(bucket.revenue) }}
                  >
                    {index === peakIndex && <span className="rev-peak">{formatVndShort(bucket.revenue)}</span>}
                  </span>
                </span>
                <span
                  className={labelShown && (index / labelEvery) % 2 === 1 ? 'rev-label rev-label-minor' : 'rev-label'}
                  aria-hidden="true"
                >
                  {labelShown ? bucketShortLabel(bucket.start, groupBy, index === 0) : ''}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <ul className="rev-legend" aria-label="Chú thích">
        <li>
          <span className="rev-swatch rev-swatch-current" />
          Doanh thu
        </li>
        {buckets.some((b) => b.inProgress && b.start <= today) && (
          <li>
            <span className="rev-swatch rev-swatch-partial" />
            Đang diễn ra
          </li>
        )}
        {showComparison && (
          <li>
            <span className="rev-swatch rev-swatch-previous" />
            Cùng kỳ năm trước
          </li>
        )}
      </ul>
    </div>
  )
}

/** The bucket containing today, otherwise the last one. */
function defaultActive(buckets: RevenueBucket[], today: string): number {
  const index = buckets.findIndex((b) => b.start <= today && today <= b.end)
  return index >= 0 ? index : buckets.length - 1
}

interface ReadoutProps {
  bucket: RevenueBucket
  series: RevenueSeries
  today: string
  showComparison: boolean
}

function Readout({ bucket, series, today, showComparison }: ReadoutProps) {
  const average = bucket.orderCount === 0 ? 0 : Math.round(bucket.revenue / bucket.orderCount)
  const future = bucket.start > today
  const status = future ? 'chưa tới' : bucket.inProgress ? 'đang diễn ra' : null
  return (
    <div className="rev-readout" aria-live="polite">
      <div className="rev-readout-main">
        <span className="rev-readout-period">
          {bucketLongLabel(bucket.start, series.groupBy)}
          {status && <span className="rev-readout-status"> · {status}</span>}
        </span>
        <span className="rev-readout-value">{formatVnd(bucket.revenue)}</span>
        <span className="muted">
          {formatNumber(bucket.orderCount)} đơn
          {bucket.orderCount > 0 && ` · trung bình ${formatVnd(average)}/đơn`}
        </span>
      </div>
      {showComparison && (
        <div className="rev-readout-compare">
          <span className="muted">
            {bucketLongLabel(bucket.start, series.groupBy, 1)}
            {/* The server compares a bucket in progress with the same days last year. */}
            {bucket.inProgress && ` (đến ${formatDay(today)})`}
          </span>
          <span>{formatVnd(bucket.previousYearRevenue)}</span>
          {!future && <DeltaBadge current={bucket.revenue} previous={bucket.previousYearRevenue} />}
        </div>
      )}
    </div>
  )
}
