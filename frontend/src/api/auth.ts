import { apiFetch } from './client'
import { saveSession, type Session, type UserInfo } from './session'

interface AuthResponse {
  token: string
  expiresInSeconds: number
  user: UserInfo
}

export interface RegisterInput {
  shopName: string
  fullName: string
  username: string
  password: string
}

export interface LoginInput {
  username: string
  password: string
}

export async function register(input: RegisterInput): Promise<Session> {
  return startSession(await apiFetch<AuthResponse>('/api/auth/register', { method: 'POST', body: input }))
}

export async function login(input: LoginInput): Promise<Session> {
  return startSession(await apiFetch<AuthResponse>('/api/auth/login', { method: 'POST', body: input }))
}

function startSession(response: AuthResponse): Session {
  const session: Session = {
    token: response.token,
    expiresAt: Date.now() + response.expiresInSeconds * 1000,
    user: response.user,
  }
  saveSession(session)
  return session
}
