import { Navigate, Route, Routes } from 'react-router'
import AppLayout from './components/AppLayout.tsx'
import RequireAuth from './components/RequireAuth.tsx'
import DashboardPage from './pages/DashboardPage.tsx'
import MenuPage from './pages/MenuPage.tsx'
import OrderHistoryPage from './pages/OrderHistoryPage.tsx'
import ReportsPage from './pages/ReportsPage.tsx'
import SellPage from './pages/SellPage.tsx'

export default function App() {
  return (
    <Routes>
      {/* DEMO BRANCH: no login/register pages, visitors go straight into the demo shop. */}
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />

      {/* Everything below requires login and shares the navigation bar. */}
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/orders" replace />} />
          <Route path="/orders" element={<SellPage />} />
          <Route path="/orders/history" element={<OrderHistoryPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
