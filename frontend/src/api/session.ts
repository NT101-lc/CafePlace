// Login session stored in localStorage so the app still knows the user when reopened offline.

import { db } from '../db/db.ts'

export type Role = 'OWNER' | 'STAFF'

export interface UserInfo {
  id: number
  username: string
  fullName: string
  role: Role
  shopId: number
  shopName: string
}

export interface Session {
  token: string
  /** Epoch milliseconds. */
  expiresAt: number
  user: UserInfo
}

const STORAGE_KEY = 'cms.session'

export function getSession(): Session | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const session = JSON.parse(raw) as Session
    if (session.expiresAt <= Date.now()) {
      clearSession()
      return null
    }
    return session
  } catch {
    clearSession()
    return null
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  // TODO: when logging out, decide what happens to unsynced pending_orders (warn the user?).
  localStorage.removeItem(STORAGE_KEY)
  // The cached menu belongs to this shop; another shop may log in on the same device next.
  void db.menu_items.clear()
  void db.menu_categories.clear()
}
