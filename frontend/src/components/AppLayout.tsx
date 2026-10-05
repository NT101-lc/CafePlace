import { NavLink, Outlet, useNavigate } from 'react-router'
import { clearSession, getSession } from '../api/session.ts'
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts'
import Button from './Button.tsx'
import Icon, { type IconName } from './Icon.tsx'

const NAV_ITEMS: { to: string; label: string; icon: IconName }[] = [
  { to: '/orders', label: 'Đơn hàng', icon: 'receipt' },
  { to: '/menu', label: 'Menu', icon: 'menu' },
  { to: '/reports', label: 'Báo cáo', icon: 'chart' },
]

const ROLE_LABELS = { OWNER: 'Chủ quán', STAFF: 'Nhân viên' } as const

/**
 * Shell shared by all logged-in pages.
 * Phones: top bar + bottom tab bar. Screens >= 900px: left sidebar (see index.css).
 */
export default function AppLayout() {
  const navigate = useNavigate()
  const online = useOnlineStatus()
  const user = getSession()?.user

  function logout() {
    clearSession()
    navigate('/login', { replace: true })
  }

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
    <span className={online ? 'status-pill status-online' : 'status-pill status-offline'}>
      {online ? 'Trực tuyến' : 'Mất mạng'}
    </span>
  )

  return (
    <div className="app">
      <aside className="app-sidebar">
        {brand}
        <nav className="sidebar-nav" aria-label="Điều hướng chính">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to}>
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          {status}
          <Button variant="ghost" icon="logout" onClick={logout}>
            Đăng xuất
          </Button>
        </div>
      </aside>

      <header className="app-topbar">
        {brand}
        <div className="topbar-actions">
          {status}
          <Button variant="ghost" icon="logout" className="btn-icon" aria-label="Đăng xuất" onClick={logout} />
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <nav className="app-nav" aria-label="Điều hướng chính">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to}>
            <Icon name={item.icon} size={22} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
