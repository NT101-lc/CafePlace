import { NavLink, Outlet } from 'react-router'
import { getSession } from '../api/session.ts'
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts'
import { usePendingOrders } from '../hooks/usePendingOrders.ts'
import Icon, { type IconName } from './Icon.tsx'

const NAV_ITEMS: { to: string; label: string; icon: IconName; ownerOnly?: boolean }[] = [
  { to: '/orders', label: 'Đơn hàng', icon: 'receipt' },
  { to: '/menu', label: 'Menu', icon: 'menu' },
  { to: '/dashboard', label: 'Tổng quan', icon: 'dashboard', ownerOnly: true },
  { to: '/reports', label: 'Báo cáo', icon: 'chart', ownerOnly: true },
]

const ROLE_LABELS = { OWNER: 'Chủ quán', STAFF: 'Nhân viên' } as const

/**
 * Shell shared by all logged-in pages.
 * Phones: top bar + bottom tab bar. Screens >= 900px: left sidebar (see index.css).
 */
export default function AppLayout() {
  const online = useOnlineStatus()
  const user = getSession()?.user
  const pendingCount = usePendingOrders().length
  const navItems = NAV_ITEMS.filter((item) => !item.ownerOnly || user?.role === 'OWNER')

  const brand = (
    <div className="brand">
      <div className="brand-logo">
        <Icon name="coffee" />
      </div>
      <div className="brand-text">
        <div className="brand-name">{user?.shopName}</div>
        <div className="brand-user">
          {user?.fullName} · {user ? ROLE_LABELS[user.role] : ''}
        </div>
      </div>
    </div>
  )

  const status = (
    <span className="status-group">
      <span className={online ? 'status-pill status-online' : 'status-pill status-offline'}>
        {online ? 'Trực tuyến' : 'Mất mạng'}
      </span>
      {pendingCount > 0 && (
        <span className="status-pill status-pending" title="Đơn đã lưu trên máy, chưa gửi lên máy chủ">
          {pendingCount} chờ đồng bộ
        </span>
      )}
    </span>
  )

  return (
    <div className="app">
      <aside className="app-sidebar">
        {brand}
        <nav className="sidebar-nav" aria-label="Điều hướng chính">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          {status}
        </div>
      </aside>

      <header className="app-topbar">
        {brand}
        <div className="topbar-actions">
          {status}
        </div>
      </header>

      <main className="app-main">
        {/* DEMO BRANCH */}
        <div className="notice notice-warning demo-banner" role="note">
          <Icon name="alert" />
          <span>
            <strong>Bản demo</strong> – mọi người dùng chung một quán thử nghiệm, dữ liệu có thể bị xoá bất cứ lúc nào.
          </span>
        </div>
        <Outlet />
      </main>

      <nav className="app-nav" aria-label="Điều hướng chính">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to}>
            <Icon name={item.icon} size={22} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
