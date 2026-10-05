import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { clearSession, getSession } from '../api/session.ts'

const NAV_ITEMS = [
  { to: '/orders', label: 'Đơn hàng' },
  { to: '/menu', label: 'Menu' },
  { to: '/reports', label: 'Báo cáo' },
]

/** Header + navigation shared by all logged-in pages. */
export default function AppLayout() {
  const navigate = useNavigate()
  const online = useOnlineStatus()
  const user = getSession()?.user

  function logout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <div className="shop-name">{user?.shopName}</div>
          <div className="user-name">{user?.fullName}</div>
        </div>
        <div className="header-actions">
          {!online && <span className="badge-offline">Mất mạng</span>}
          <button type="button" className="btn-link" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <nav className="app-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}
