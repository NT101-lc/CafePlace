import type { ReactNode } from 'react'
import { PAYMENT_LABELS, type PaymentMethod } from '../../api/orders.ts'
import type { PendingOrderItem } from '../../db/db.ts'
import { formatTime, formatVnd } from '../../lib/format.ts'
import './OrderCard.css'

interface Props {
  title: string
  createdAt: string
  items: PendingOrderItem[]
  totalAmount: number
  paymentMethod: PaymentMethod
  note?: string | null
  cancelled?: boolean
  /** Status badge(s) shown next to the title. */
  badges?: ReactNode
  /** Buttons at the bottom right (e.g. "Huỷ đơn"). */
  actions?: ReactNode
  /** Extra line under the items, e.g. a sync error. */
  footnote?: ReactNode
}

/** One order (from the server or still waiting on this device). */
export default function OrderCard(props: Props) {
  return (
    <li className={props.cancelled ? 'order-card is-cancelled' : 'order-card'}>
      <div className="order-card-head">
        <span className="order-card-time">{formatTime(props.createdAt)}</span>
        <span className="order-card-title">{props.title}</span>
        {props.badges}
        <span className="spacer" />
        <span className="order-card-total">{formatVnd(props.totalAmount)}</span>
      </div>
      <ul className="order-card-items">
        {props.items.map((item, index) => (
          <li key={index}>
            <span className="order-card-qty">{item.quantity}×</span>
            <span className="order-card-name">{item.itemName}</span>
            <span className="muted">{formatVnd(item.unitPrice * item.quantity)}</span>
          </li>
        ))}
      </ul>
      {props.note && <p className="order-card-note">“{props.note}”</p>}
      {props.footnote}
      <div className="order-card-foot">
        <span className="badge badge-neutral">{PAYMENT_LABELS[props.paymentMethod]}</span>
        <span className="spacer" />
        {props.actions}
      </div>
    </li>
  )
}
