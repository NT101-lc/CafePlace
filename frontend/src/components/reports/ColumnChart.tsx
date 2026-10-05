import './ColumnChart.css'

export interface Column {
  key: string
  /** Axis label under the column (may be hidden when there are many columns). */
  label: string
  value: number
  /** Text shown on hover/focus, e.g. "05/10 · 1.250.000đ · 32 đơn". */
  tooltip: string
}

interface Props {
  columns: Column[]
  /** Formats axis ticks and the label on the highest column. */
  formatValue: (value: number) => string
  /** Accessible description of the whole chart. */
  label: string
}

/**
 * Single-series column chart in plain HTML/CSS (one brand color, so no legend: the card title names it).
 * Columns grow from one baseline, max 24px wide, rounded only at the data end. Hover or focus a
 * column for its exact value; only the highest column is labeled directly.
 */
export default function ColumnChart({ columns, formatValue, label }: Props) {
  const max = Math.max(0, ...columns.map((c) => c.value))
  const top = niceCeiling(max)
  const ticks = [top, top / 2, 0]
  const peakKey = max > 0 ? columns.find((c) => c.value === max)?.key : undefined
  // Show at most ~8 axis labels so they never collide.
  const labelEvery = Math.max(1, Math.ceil(columns.length / 8))

  return (
    <div className="column-chart" role="group" aria-label={label}>
      <div className="column-chart-axis" aria-hidden="true">
        {ticks.map((t) => (
          <span key={t}>{formatValue(t)}</span>
        ))}
      </div>
      <div className="column-chart-plot">
        <div className="column-chart-grid" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        {columns.map((column, index) => (
          <div key={column.key} className="column-slot" tabIndex={0} aria-label={column.tooltip}>
            <div className="column-track">
              {column.key === peakKey && <span className="column-peak">{formatValue(column.value)}</span>}
              <div
                className="column-bar"
                style={{ height: top === 0 ? 0 : `${(column.value / top) * 100}%` }}
              />
            </div>
            <span className="column-label" aria-hidden="true">
              {index % labelEvery === 0 ? column.label : ''}
            </span>
            <span className="column-tooltip" role="tooltip">
              {column.tooltip}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Rounds up to 1, 2 or 5 × 10^n so axis ticks are clean numbers (0 / 500k / 1tr). */
function niceCeiling(value: number): number {
  if (value <= 0) return 0
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 5, 10].find((s) => s * magnitude >= value) ?? 10
  return step * magnitude
}
