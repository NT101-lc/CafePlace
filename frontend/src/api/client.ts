import { clearSession, getSession } from './session'

/** Mirrors the backend error JSON: { code, message, fields? }. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: Record<string, string>

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
  }

  /** True when the server could not be reached (offline, server down). */
  get isNetworkError(): boolean {
    return this.code === 'NETWORK_ERROR'
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
}

/**
 * Calls the backend. Adds the JWT, sends/parses JSON and turns every failure into an ApiError
 * whose message is already in Vietnamese and safe to show to the user.
 */
export async function apiFetch<T>(path: string, { method = 'GET', body }: RequestOptions = {}): Promise<T> {
  const session = getSession()
  const headers: Record<string, string> = { Accept: 'application/json' }
  // A Blob (e.g. an image) is sent as-is with its own type; anything else as JSON.
  const isFile = body instanceof Blob
  if (body !== undefined) headers['Content-Type'] = isFile ? body.type : 'application/json'
  if (session) headers.Authorization = `Bearer ${session.token}`

  let response: Response
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : isFile ? body : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng.')
  }

  if (response.ok) {
    return (response.status === 204 ? undefined : await response.json()) as T
  }

  const error = await response.json().catch(() => null)
  if (response.status === 401 && session) {
    // Token expired or revoked: force a new login.
    clearSession()
    window.location.assign('/login')
  }
  throw new ApiError(
    response.status,
    error?.code ?? 'HTTP_' + response.status,
    error?.message ?? 'Đã có lỗi xảy ra, vui lòng thử lại sau',
    error?.fields,
  )
}
