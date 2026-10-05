import { useState } from 'react'
import { reorderCategories, type MenuCategory } from '../../api/menu.ts'
import Button from '../Button.tsx'
import Sheet from '../Sheet.tsx'
import './CategoryOrderSheet.css'

interface Props {
  categories: MenuCategory[]
  onClose: () => void
  onSaved: (categories: MenuCategory[]) => void
}

/** Reorder menu groups with up/down buttons (works the same with touch, mouse and keyboard). */
export default function CategoryOrderSheet({ categories, onClose, onSaved }: Props) {
  const [order, setOrder] = useState(categories)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function move(index: number, delta: -1 | 1) {
    const next = [...order]
    const [moved] = next.splice(index, 1)
    next.splice(index + delta, 0, moved)
    setOrder(next)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      onSaved(await reorderCategories(order.map((c) => c.id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được thứ tự')
      setSaving(false)
    }
  }

  const changed = order.some((c, i) => c.id !== categories[i]?.id)

  return (
    <Sheet
      open
      title="Sắp xếp nhóm"
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <Button onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button variant="primary" loading={saving} disabled={!changed} onClick={save}>
            Lưu thứ tự
          </Button>
        </>
      }
    >
      <p className="muted category-order-hint">Nhóm ở trên sẽ hiện trước trong menu và màn bán hàng.</p>
      {error && (
        <div className="notice notice-danger" role="alert">
          {error}
        </div>
      )}
      <ol className="category-order-list">
        {order.map((category, index) => (
          <li key={category.id} className="category-order-row">
            <span className="category-order-index">{index + 1}</span>
            <span className="category-order-name">{category.name}</span>
            <Button
              variant="ghost"
              icon="arrowUp"
              className="btn-icon"
              aria-label={`Đưa ${category.name} lên`}
              disabled={index === 0 || saving}
              onClick={() => move(index, -1)}
            />
            <Button
              variant="ghost"
              icon="arrowDown"
              className="btn-icon"
              aria-label={`Đưa ${category.name} xuống`}
              disabled={index === order.length - 1 || saving}
              onClick={() => move(index, 1)}
            />
          </li>
        ))}
      </ol>
    </Sheet>
  )
}
