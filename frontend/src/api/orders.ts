import { randomUuid } from '../lib/uuid.ts'
import { db, type PaymentMethod, type PendingOrder, type PendingOrderItem } from '../db/db.ts'
import { notifyPendingOrdersChanged, syncPendingOrders } from '../sync/sync.ts'
import { apiFetch } from './client.ts'
import { getSession } from './session.ts'

export type { PaymentMethod, PendingOrder }

export type OrderStatus = 'OPEN' | 'PAID' | 'CANCELLED'

/** An order stored on the server. */
export interface Order {
  id: number
  clientId: string
  status: OrderStatus
  paymentMethod: PaymentMethod
  totalAmount: number
  note: string | null
  createdAt: string
  receivedAt: string
  cancelledAt: string | null
  items: PendingOrderItem[]
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Tiền mặt',
  TRANSFER: 'Chuyển khoản',
}

export interface NewOrder {
  items: PendingOrderItem[]
  paymentMethod: PaymentMethod
  note?: string
}

/**
 * Saves the order on this device first, then tries to send it. Works the same online and offline:
 * the order is never lost, and sync.ts keeps retrying until the server confirms it.
 */
export async function createOrder(input: NewOrder): Promise<PendingOrder> {
  const session = getSession()
  if (!session) throw new Error('Phiên đăng nhập đã hết, vui lòng đăng nhập lại')
  const order: PendingOrder = {
    clientId: randomUuid(),
    shopId: session.user.shopId,
    createdAt: new Date().toISOString(),
    paymentMethod: input.paymentMethod,
    totalAmount: input.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    note: input.note?.trim() || undefined,
    items: input.items,
    attempts: 0,
  }
  await db.pending_orders.add(order)
  notifyPendingOrdersChanged()
  void syncPendingOrders()
  return order
}

/** Orders of this shop not confirmed by the server yet, newest first. */
export async function getPendingOrders(): Promise<PendingOrder[]> {
  const session = getSession()
  if (!session) return []
  const orders = await db.pending_orders.where('shopId').equals(session.user.shopId).sortBy('createdAt')
  return orders.reverse()
}

/** Server orders of one day (yyyy-mm-dd, Vietnam time), newest first. */
export function fetchOrders(date: string): Promise<Order[]> {
  return apiFetch<Order[]>(`/api/orders?date=${encodeURIComponent(date)}`)
}

export function cancelOrder(id: number): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${id}/cancel`, { method: 'POST' })
}
