import { useEffect, useState } from 'react'
import { getPendingOrders, type PendingOrder } from '../api/orders.ts'
import { PENDING_ORDERS_CHANGED } from '../sync/sync.ts'

/** Orders saved on this device and not yet confirmed by the server; refreshes on every change. */
export function usePendingOrders(): PendingOrder[] {
  const [orders, setOrders] = useState<PendingOrder[]>([])
  useEffect(() => {
    let cancelled = false
    const load = () =>
      void getPendingOrders().then((list) => {
        if (!cancelled) setOrders(list)
      })
    load()
    window.addEventListener(PENDING_ORDERS_CHANGED, load)
    return () => {
      cancelled = true
      window.removeEventListener(PENDING_ORDERS_CHANGED, load)
    }
  }, [])
  return orders
}
