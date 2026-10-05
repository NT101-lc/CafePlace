import { ApiError, apiFetch } from '../api/client'
import { getSession } from '../api/session'
import { db, type PendingOrder } from '../db/db'

// Offline sync skeleton: pending_orders (IndexedDB) → server, delete once the server confirms.
//
// Flow:
//   1. The orders page saves a new order to db.pending_orders (TODO: not written yet).
//   2. syncPendingOrders() sends them one by one, oldest first.
//   3. Server confirms → delete the local copy. Re-sending is safe: the server ignores a clientId it already has.

const SYNC_INTERVAL_MS = 30_000

let running = false

export async function syncPendingOrders(): Promise<void> {
  if (running || !navigator.onLine) return
  const session = getSession()
  if (!session) return

  running = true
  try {
    const pending = await db.pending_orders.where('shopId').equals(session.user.shopId).sortBy('createdAt')

    for (const order of pending) {
      try {
        // TODO: backend endpoint does not exist yet. It must:
        //   - accept { clientId, createdAt, note, items[] },
        //   - insert the order, or return the existing one if (shop_id, client_id) already exists,
        //   - respond 200/201 in both cases so the client can delete its copy.
        await apiFetch('/api/orders/sync', { method: 'POST', body: toPayload(order) })
        await db.pending_orders.delete(order.clientId)
      } catch (err) {
        if (err instanceof ApiError && err.isNetworkError) {
          // Lost connection mid-way: stop and retry on the next 'online' event / interval.
          break
        }
        // TODO: decide how to handle orders the server rejects (e.g. validation error):
        //   show them to the user to fix or discard. For now keep them and record the error.
        await db.pending_orders.update(order.clientId, {
          attempts: order.attempts + 1,
          lastError: err instanceof Error ? err.message : String(err),
        })
      }
    }
  } finally {
    running = false
  }
}

/** Call once at app start: sync now, when the connection comes back, and periodically. */
export function startAutoSync(): void {
  window.addEventListener('online', () => void syncPendingOrders())
  window.setInterval(() => void syncPendingOrders(), SYNC_INTERVAL_MS)
  void syncPendingOrders()
  // TODO: also refresh db.menu_items from the server when online.
}

function toPayload(order: PendingOrder) {
  return {
    clientId: order.clientId,
    createdAt: order.createdAt,
    note: order.note,
    items: order.items,
  }
}
