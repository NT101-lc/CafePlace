import EmptyState from '../components/EmptyState.tsx'

// Placeholder: revenue and best-selling items come after the sales screen.
export default function ReportsPage() {
  return (
    <section>
      <div className="page-header">
        <h1>Báo cáo</h1>
      </div>
      <EmptyState
        icon="chart"
        title="Báo cáo đang được xây dựng"
        description="Sắp tới: doanh thu theo ngày, số đơn và các món bán chạy."
      />
    </section>
  )
}
