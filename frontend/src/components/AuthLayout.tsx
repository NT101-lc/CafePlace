import type { ReactNode } from 'react'
import Icon from './Icon.tsx'

/** Centered card with the app logo, used by the login and register pages. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="logo">
          <Icon name="coffee" size={30} />
        </div>
        <p className="tagline">Bán hàng, quản lý menu và doanh thu cho quán cà phê</p>
      </div>
      <div className="auth-card">{children}</div>
    </div>
  )
}
