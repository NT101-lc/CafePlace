import { NavLink } from 'react-router'
import './OrdersTabs.css'

/** Switch between the sales screen and today's order list. */
export default function OrdersTabs({ pendingCount }: { pendingCount: number }) {
  return (
    <nav className="orders-tabs" aria-label="Đơn hàng">
      <NavLink to="/orders" end>
        Bán hàng
      </NavLink>
      <NavLink to="/orders/history">
        Đơn đã bán
        {pendingCount > 0 && (
          <span className="orders-tabs-badge" aria-label={`${pendingCount} đơn chờ đồng bộ`}>
            {pendingCount}
          </span>
        )}
      </NavLink>
    </nav>
  )
}
