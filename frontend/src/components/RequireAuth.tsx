import { Navigate, Outlet } from 'react-router'
import { getSession } from '../api/session.ts'

/** Renders child routes only when logged in; otherwise sends the user to the login page. */
export default function RequireAuth() {
  return getSession() ? <Outlet /> : <Navigate to="/login" replace />
}
