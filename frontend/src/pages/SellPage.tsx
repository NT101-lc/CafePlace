import { useEffect, useMemo, useState } from 'react'
import { createOrder } from '../api/orders.ts'
import { getSession } from '../api/session.ts'
import Button from '../components/Button.tsx'
import EmptyState from '../components/EmptyState.tsx'
import Icon from '../components/Icon.tsx'
import Sheet from '../components/Sheet.tsx'
import CartPanel, { type Checkout } from '../components/orders/CartPanel.tsx'
import OrdersTabs from '../components/orders/OrdersTabs.tsx'
import ProductTile from '../components/orders/ProductTile.tsx'
import {
  addToCart,
  cartCount,
  cartTotal,
  loadCart,
  saveCart,
  setQuantity,
  type CartLine,
} from '../components/orders/cart.ts'
import { useMenu } from '../hooks/useMenu.ts'
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts'
import { usePendingOrders } from '../hooks/usePendingOrders.ts'
import { useToast } from '../hooks/useToast.ts'
import { formatVnd, normalizeSearch } from '../lib/format.ts'
import './SellPage.css'

/**
 * Sales screen: tap items to build the order, then pay. Works offline: the menu comes from the device
 * and the order is saved locally first (see api/orders.ts createOrder).
 */
export default function SellPage() {
  const shopId = getSession()?.user.shopId ?? 0
  const online = useOnlineStatus()
  const toast = useToast()
  const pending = usePendingOrders()
  const { menu, loadError, reload } = useMenu()
  const [lines, setLines] = useState<CartLine[]>(() => loadCart(shopId))
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<number | 'all'>('all')
  const [cartOpen, setCartOpen] = useState(false)

  useEffect(() => saveCart(shopId, lines), [shopId, lines])

  const items = useMemo(() => menu?.items ?? [], [menu])
  const categories = useMemo(
    () => (menu?.categories ?? []).filter((c) => items.some((i) => i.categoryId === c.id)),
    [menu, items],
  )
  const visible = useMemo(() => {
    const search = normalizeSearch(query)
    return items.filter(
      (item) =>
        (categoryId === 'all' || item.categoryId === categoryId) &&
        (!search || normalizeSearch(item.name).includes(search)),
    )
  }, [items, query, categoryId])
  const quantities = useMemo(() => new Map(lines.map((l) => [l.menuItemId, l.quantity])), [lines])

  async function checkout({ paymentMethod, note, cashReceived }: Checkout) {
    const total = cartTotal(lines)
    try {
      await createOrder({
        paymentMethod,
        note,
        items: lines.map((l) => ({
          menuItemId: l.menuItemId,
          itemName: l.name,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
        })),
      })
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Không lưu được đơn', 'error')
      return
    }
    setLines([])
    setCartOpen(false)
    const change = cashReceived !== null && cashReceived > total ? ` · Thối ${formatVnd(cashReceived - total)}` : ''
    toast.show(`Đã lưu đơn ${formatVnd(total)}${change}${online ? '' : ' · sẽ đồng bộ khi có mạng'}`)
  }

  const cart = (showTitle: boolean) => (
    <CartPanel
      showTitle={showTitle}
      lines={lines}
      onQuantityChange={(id, quantity) => setLines((current) => setQuantity(current, id, quantity))}
      onClear={() => setLines([])}
      onCheckout={checkout}
    />
  )

  return (
    <section className="sell-page">
      <OrdersTabs pendingCount={pending.length} />

      <div className="sell-layout">
        <div className="sell-catalog">
          {menu === null ? (
            <div className="product-grid" aria-busy="true" aria-label="Đang tải menu">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="skeleton" style={{ aspectRatio: '0.8' }} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon="menu"
              title={loadError ? 'Không tải được menu' : 'Menu đang trống'}
              description={
                loadError ?? 'Vào trang Menu để thêm món trước khi bán hàng.'
              }
              action={
                loadError && (
                  <Button icon="refresh" onClick={reload}>
                    Thử lại
                  </Button>
                )
              }
            />
          ) : (
            <>
              <div className="sell-toolbar">
                <label className="search-box">
                  <Icon name="search" />
                  <span className="visually-hidden">Tìm món</span>
                  <input type="search" placeholder="Tìm món..." value={query} onChange={(e) => setQuery(e.target.value)} />
                </label>
                <div className="chip-row" role="group" aria-label="Lọc theo nhóm">
                  <button
                    type="button"
                    className={categoryId === 'all' ? 'chip is-active' : 'chip'}
                    aria-pressed={categoryId === 'all'}
                    onClick={() => setCategoryId('all')}
                  >
                    Tất cả
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={categoryId === c.id ? 'chip is-active' : 'chip'}
                      aria-pressed={categoryId === c.id}
                      onClick={() => setCategoryId(c.id)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {visible.length === 0 ? (
                <EmptyState icon="search" title="Không tìm thấy món phù hợp" />
              ) : (
                <ul className="product-grid">
                  {visible.map((item) => (
                    <li key={item.id}>
                      <ProductTile
                        item={item}
                        quantity={quantities.get(item.id) ?? 0}
                        onAdd={() => setLines((current) => addToCart(current, item))}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {/* Tablet / desktop: the cart is always visible on the right. */}
        <aside className="sell-cart" aria-label="Giỏ hàng">
          {cart(true)}
        </aside>
      </div>

      {/* Phone: a bar above the tab bar opens the cart as a bottom sheet. */}
      {lines.length > 0 && (
        <button type="button" className="cart-bar" onClick={() => setCartOpen(true)}>
          <span className="cart-bar-count">{cartCount(lines)}</span>
          <span className="cart-bar-label">Xem đơn</span>
          <strong>{formatVnd(cartTotal(lines))}</strong>
        </button>
      )}
      {cartOpen && (
        <Sheet open title="Đơn mới" onClose={() => setCartOpen(false)}>
          {cart(false)}
        </Sheet>
      )}
    </section>
  )
}
