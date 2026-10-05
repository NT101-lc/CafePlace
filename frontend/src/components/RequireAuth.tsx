import { useEffect, useState } from 'react'
import { Outlet } from 'react-router'
import { demoLogin } from '../api/auth.ts'
import { getSession } from '../api/session.ts'
import Button from './Button.tsx'
import EmptyState from './EmptyState.tsx'

/**
 * DEMO BRANCH: instead of sending visitors to a login page, logs them straight into the shared
 * demo shop. (On main this component redirects to /login.)
 */
export default function RequireAuth() {
  const [loggedIn, setLoggedIn] = useState(() => getSession() !== null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (loggedIn) return
    let cancelled = false
    demoLogin()
      .then(() => {
        if (!cancelled) setLoggedIn(true)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không vào được bản demo')
      })
    return () => {
      cancelled = true
    }
  }, [loggedIn, attempt])

  if (loggedIn) return <Outlet />
  return (
    <div className="auth-page">
      {error ? (
        <EmptyState
          icon="alert"
          title="Không vào được bản demo"
          description={error}
          action={
            <Button
              icon="refresh"
              onClick={() => {
                setError(null)
                setAttempt((a) => a + 1)
              }}
            >
              Thử lại
            </Button>
          }
        />
      ) : (
        <p className="muted">Đang mở bản demo...</p>
      )}
    </div>
  )
}
