import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { register, type RegisterInput } from '../api/auth.ts'
import { ApiError } from '../api/client.ts'
import { getSession } from '../api/session.ts'
import AuthLayout from '../components/AuthLayout.tsx'
import Button from '../components/Button.tsx'
import FormField from '../components/FormField.tsx'

const EMPTY_FORM: RegisterInput = { shopName: '', fullName: '', username: '', password: '' }

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState<ApiError | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (getSession()) return <Navigate to="/" replace />

  function update(field: keyof RegisterInput, value: string) {
    setForm({ ...form, [field]: value })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await register(form)
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
        <h1>Đăng ký quán mới</h1>
        {error && !error.fields && <div className="notice notice-danger" role="alert">{error.message}</div>}
        <FormField
          label="Tên quán"
          name="shopName"
          value={form.shopName}
          error={error?.fields?.shopName}
          onChange={(e) => update('shopName', e.target.value)}
        />
        <FormField
          label="Họ tên chủ quán"
          name="fullName"
          autoComplete="name"
          value={form.fullName}
          error={error?.fields?.fullName}
          onChange={(e) => update('fullName', e.target.value)}
        />
        <FormField
          label="Tên đăng nhập"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          value={form.username}
          error={error?.fields?.username}
          onChange={(e) => update('username', e.target.value)}
        />
        <FormField
          label="Mật khẩu (ít nhất 8 ký tự)"
          name="password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          error={error?.fields?.password}
          onChange={(e) => update('password', e.target.value)}
        />
        <Button type="submit" variant="primary" size="lg" loading={submitting}>
          {submitting ? 'Đang tạo quán...' : 'Đăng ký'}
        </Button>
        <p className="auth-switch">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </form>
    </AuthLayout>
  )
}
