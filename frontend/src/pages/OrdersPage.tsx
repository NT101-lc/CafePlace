import EmptyState from '../components/EmptyState.tsx'

// Placeholder: the sales screen (tap items → cart → pay, works offline) is the next feature.
export default function OrdersPage() {
  return (
    <section>
      <div className="page-header">
        <h1>Đơn hàng</h1>
      </div>
      <EmptyState
        icon="receipt"
        title="Màn bán hàng đang được xây dựng"
        description="Sắp tới: chạm chọn món, xem giỏ hàng và thanh toán — kể cả khi mất mạng."
      />
    </section>
  )
}
