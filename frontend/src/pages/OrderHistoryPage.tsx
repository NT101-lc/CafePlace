import { useEffect, useState } from 'react'
import { cancelOrder, fetchOrders, type Order } from '../api/orders.ts'
import { getSession } from '../api/session.ts'
import Button from '../components/Button.tsx'
import EmptyState from '../components/EmptyState.tsx'
import Icon from '../components/Icon.tsx'
import OrderCard from '../components/orders/OrderCard.tsx'
import OrdersTabs from '../components/orders/OrdersTabs.tsx'
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts'
import { usePendingOrders } from '../hooks/usePendingOrders.ts'
import { useToast } from '../hooks/useToast.ts'
import { addDays, formatDay, formatVnd, toIsoDate } from '../lib/format.ts'
import { PENDING_ORDERS_CHANGED } from '../sync/sync.ts'
import './OrderHistoryPage.css'

/** Orders of one day, plus orders still waiting on this device. Owners can cancel an order. */
export default function OrderHistoryPage() {
  const online = useOnlineStatus()
  const toast = useToast()
  const pending = usePendingOrders()
  const isOwner = getSession()?.user.role === 'OWNER'
  const [today] = useState(() => toIsoDate(new Date()))
  const [date, setDate] = useState(today)
  const [orders, setOrders] = useState<Order[]>([])
  /** Day whose orders are in `orders`; differs from `date` while a new day is loading. */
  const [loadedDate, setLoadedDate] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [cancellingId, setCancellingId] = useState<number | null>(null)

  useEffect(() => {
    // Offline: the page shows a notice instead of the server list, nothing to load.
    if (!online) return
    let cancelled = false
    fetchOrders(date)
      .then((list) => {
        if (cancelled) return
        setOrders(list)
        setLoadedDate(date)
        setLoadError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : 'Không tải được đơn hàng')
        setOrders([])
        setLoadedDate(date)
      })
    return () => {
      cancelled = true
    }
  }, [date, online, reloadKey])

  // When a pending order reaches the server, show it in the list.
  useEffect(() => {
    const refresh = () => setReloadKey((k) => k + 1)
    window.addEventListener(PENDING_ORDERS_CHANGED, refresh)
    return () => window.removeEventListener(PENDING_ORDERS_CHANGED, refresh)
  }, [])

  // The cancel button asks for a second tap; forget that after a few seconds.
  useEffect(() => {
    if (confirmingId === null) return
    const timer = window.setTimeout(() => setConfirmingId(null), 4000)
    return () => window.clearTimeout(timer)
  }, [confirmingId])

  async function cancel(order: Order) {
    if (confirmingId !== order.id) {
      setConfirmingId(order.id)
      return
    }
    setCancellingId(order.id)
    try {
      const updated = await cancelOrder(order.id)
      setOrders((current) => current.map((o) => (o.id === updated.id ? updated : o)))
      toast.show(`Đã huỷ đơn ${formatVnd(order.totalAmount)}`)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Không huỷ được đơn', 'error')
    } finally {
      setCancellingId(null)
      setConfirmingId(null)
    }
  }

  const loading = loadedDate !== date
  const paid = orders.filter((o) => o.status === 'PAID')
  const revenue = paid.reduce((sum, o) => sum + o.totalAmount, 0)

  return (
    <section>
      <OrdersTabs pendingCount={pending.length} />

      <div className="day-picker">
        <Button variant="ghost" icon="arrowUp" className="btn-icon day-prev" aria-label="Ngày trước" onClick={() => setDate(addDays(date, -1))} />
        <label className="day-input">
          <span className="visually-hidden">Chọn ngày</span>
          <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
        <Button
          variant="ghost"
          icon="arrowUp"
          className="btn-icon day-next"
          aria-label="Ngày sau"
          disabled={date >= today}
          onClick={() => setDate(addDays(date, 1))}
        />
        {date !== today && <Button onClick={() => setDate(today)}>Hôm nay</Button>}
      </div>
      <p className="muted day-label">{formatDay(date, 'long')}</p>

      {pending.length > 0 && (
        <div className="history-section">
          <h2>
            Chờ đồng bộ <span className="muted">· {pending.length}</span>
          </h2>
          <p className="muted section-hint">
            {online
              ? 'Đang gửi lên máy chủ...'
              : 'Các đơn này đã lưu trên máy và sẽ tự gửi khi có mạng.'}
          </p>
          <ul className="order-list">
            {pending.map((order) => (
              <OrderCard
                key={order.clientId}
                title="Chưa đồng bộ"
                createdAt={order.createdAt}
                items={order.items}
                totalAmount={order.totalAmount}
                paymentMethod={order.paymentMethod}
                note={order.note}
                badges={<span className="badge badge-warning">Chờ đồng bộ</span>}
                footnote={
                  order.lastError && (
                    <p className="order-card-error">
                      <Icon name="alert" size={16} /> Máy chủ từ chối: {order.lastError}
                    </p>
                  )
                }
              />
            ))}
          </ul>
        </div>
      )}

      <div className="history-section">
        <div className="history-summary">
          <h2>Đơn đã bán</h2>
          {!loading && orders.length > 0 && (
            <span className="muted">
              {paid.length} đơn · <strong className="history-revenue">{formatVnd(revenue)}</strong>
            </span>
          )}
        </div>

        {!online ? (
          <div className="notice notice-warning" role="status">
            <Icon name="wifiOff" />
            <span>Đang mất mạng: cần có mạng để xem các đơn đã gửi lên máy chủ.</span>
          </div>
        ) : loading ? (
          <ul className="order-list" aria-busy="true" aria-label="Đang tải đơn hàng">
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="skeleton" style={{ height: 120 }} />
            ))}
          </ul>
        ) : loadError ? (
          <EmptyState
            icon="alert"
            title="Không tải được đơn hàng"
            description={loadError}
            action={
              <Button icon="refresh" onClick={() => setReloadKey((k) => k + 1)}>
                Thử lại
              </Button>
            }
          />
        ) : orders.length === 0 ? (
          <EmptyState icon="receipt" title="Chưa có đơn nào" description="Các đơn bán trong ngày sẽ hiện ở đây." />
        ) : (
          <ul className="order-list">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                title={`#${order.id}`}
                createdAt={order.createdAt}
                items={order.items}
                totalAmount={order.totalAmount}
                paymentMethod={order.paymentMethod}
                note={order.note}
                cancelled={order.status === 'CANCELLED'}
                badges={order.status === 'CANCELLED' && <span className="badge badge-danger">Đã huỷ</span>}
                actions={
                  isOwner &&
                  order.status === 'PAID' && (
                    <Button
                      variant="danger"
                      className={confirmingId === order.id ? 'is-confirming' : undefined}
                      loading={cancellingId === order.id}
                      onClick={() => void cancel(order)}
                    >
                      {confirmingId === order.id ? 'Bấm lần nữa để huỷ' : 'Huỷ đơn'}
                    </Button>
                  )
                }
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
