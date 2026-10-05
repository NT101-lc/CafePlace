import type { PeriodStat } from '../../api/dashboard.ts'
import { formatNumber, formatVnd, formatVndShort } from '../../lib/format.ts'
import DeltaBadge from './DeltaBadge.tsx'
import { formatDateRange } from './periods.ts'
import './StatTile.css'

interface Props {
  label: string
  stat: PeriodStat
  /** How the previous period is named, e.g. "Hôm qua". Default: "so với" + its dates, with a % change. */
  previousLabel?: string
}

/**
 * Revenue of one period (to date), its order count and the previous period.
 * With `previousLabel` (used for today, which is compared with the whole of yesterday) only the previous
 * amount is shown: a % change against a full day would look like a drop every morning.
 */
export default function StatTile({ label, stat, previousLabel }: Props) {
  return (
    <article className="stat-tile">
      <h3 className="stat-tile-label">{label}</h3>
      <p className="stat-tile-value">{formatVnd(stat.revenue)}</p>
      <p className="stat-tile-orders">{formatNumber(stat.orderCount)} đơn</p>
      <p className="stat-tile-compare">
        {previousLabel ? (
          <span>
            {previousLabel}: {formatVndShort(stat.previousRevenue)} · {formatNumber(stat.previousOrderCount)} đơn
          </span>
        ) : (
          <>
            <DeltaBadge current={stat.revenue} previous={stat.previousRevenue} />
            <span>
              so với {formatDateRange(stat.previousFrom, stat.previousTo)}: {formatVndShort(stat.previousRevenue)}
            </span>
          </>
        )}
      </p>
    </article>
  )
}
