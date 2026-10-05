import Icon from '../Icon.tsx'
import { formatPercent, percentChange } from './periods.ts'
import './DeltaBadge.css'

interface Props {
  current: number
  previous: number
}

/**
 * "+12%" with an arrow: green when revenue went up, red when it went down. The arrow and the sign
 * carry the direction too, so it never depends on color alone.
 */
export default function DeltaBadge({ current, previous }: Props) {
  const change = percentChange(current, previous)
  if (change === null) {
    return <span className="delta delta-flat">{current > 0 ? 'Mới' : '—'}</span>
  }
  const rounded = Math.round(change * 100)
  const kind = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat'
  return (
    <span className={`delta delta-${kind}`}>
      {kind !== 'flat' && <Icon name={kind === 'up' ? 'arrowUp' : 'arrowDown'} size={14} />}
      {formatPercent(change)}
    </span>
  )
}
