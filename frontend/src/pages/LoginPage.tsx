import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { login } from '../api/auth.ts'
import { ApiError } from '../api/client.ts'
import { getSession } from '../api/session.ts'
import AuthLayout from '../components/AuthLayout.tsx'
import Button from '../components/Button.tsx'
import FormField from '../components/FormField.tsx'

export default function LoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState<ApiError | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (getSession()) return <Navigate to="/" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(form)
      navigate('/orders', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'UNKNOWN', 'Đã có lỗi xảy ra'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} noValidate>
        <h1>Đăng nhập</h1>
        {error && !error.fields && <div className="notice notice-danger" role="alert">{error.message}</div>}
        <FormField
          label="Tên đăng nhập"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          value={form.username}
          error={error?.fields?.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <FormField
          label="Mật khẩu"
          name="password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          error={error?.fields?.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <Button type="submit" variant="primary" size="lg" loading={submitting}>
          {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </Button>
        <p className="auth-switch">
          Chưa có tài khoản? <Link to="/register">Đăng ký quán mới</Link>
        </p>
      </form>
    </AuthLayout>
  )
}
