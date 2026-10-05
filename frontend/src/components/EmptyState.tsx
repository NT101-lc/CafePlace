import type { ReactNode } from 'react'
import Icon, { type IconName } from './Icon.tsx'
import './EmptyState.css'

interface Props {
  icon: IconName
  title: string
  description?: string
  /** Usually a button, e.g. "Thêm món đầu tiên". */
  action?: ReactNode
}

/** Friendly placeholder for empty lists and "not found" results. */
export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon name={icon} size={28} />
      </div>
      <h2>{title}</h2>
      {description && <p className="muted">{description}</p>}
      {action}
    </div>
  )
}
