import { ApiError, apiFetch } from '../api/client'
import { getSession } from '../api/session'
import { db, type PendingOrder } from '../db/db'

// Offline sync: pending_orders (IndexedDB) → server, delete once the server confirms.
//
// Flow:
//   1. Checkout saves the new order to db.pending_orders (api/orders.ts → createOrder), online or not.
//   2. syncPendingOrders() sends them one by one, oldest first, to POST /api/orders/sync.
//   3. Server answers 201 (created) or 200 (already had this clientId) → delete the local copy.
//      Re-sending is always safe: the server ignores a clientId it already has.
//   4. No network / server error (5xx) → stop, retry on the next 'online' event or after 30 s.
//      Rejected by the server (4xx, e.g. invalid data) → keep it with lastError so the user sees it.

const SYNC_INTERVAL_MS = 30_000

/** Fired on window whenever pending_orders changes, so badges and lists can refresh. */
export const PENDING_ORDERS_CHANGED = 'pending-orders-changed'

export function notifyPendingOrdersChanged(): void {
  window.dispatchEvent(new Event(PENDING_ORDERS_CHANGED))
}

let running = false
let runAgain = false

export async function syncPendingOrders(): Promise<void> {
  if (running) {
    // An order was added while syncing: go through the list once more when done.
    runAgain = true
    return
  }
  if (!navigator.onLine) return
  const session = getSession()
  if (!session) return

  running = true
  try {
    do {
      runAgain = false
      const pending = await db.pending_orders.where('shopId').equals(session.user.shopId).sortBy('createdAt')
      for (const order of pending) {
        try {
          await apiFetch('/api/orders/sync', { method: 'POST', body: toPayload(order) })
          await db.pending_orders.delete(order.clientId)
          notifyPendingOrdersChanged()
        } catch (err) {
          if (err instanceof ApiError && (err.isNetworkError || err.status >= 500)) {
            // Temporary problem: stop and retry later.
            return
          }
          // TODO: let the owner fix or discard orders the server rejects. For now keep them visible.
          await db.pending_orders.update(order.clientId, {
            attempts: order.attempts + 1,
            lastError: err instanceof Error ? err.message : String(err),
          })
          notifyPendingOrdersChanged()
        }
      }
    } while (runAgain)
  } finally {
    running = false
  }
}

/** Call once at app start: sync now, when the connection comes back, and periodically. */
export function startAutoSync(): void {
  window.addEventListener('online', () => void syncPendingOrders())
  window.setInterval(() => void syncPendingOrders(), SYNC_INTERVAL_MS)
  void syncPendingOrders()
}

function toPayload(order: PendingOrder) {
  return {
    clientId: order.clientId,
    createdAt: order.createdAt,
    paymentMethod: order.paymentMethod,
    note: order.note,
    items: order.items,
  }
}
