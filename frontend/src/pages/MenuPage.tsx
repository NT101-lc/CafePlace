import { useMemo, useState } from 'react'
import {
  fetchCategories,
  setMenuItemAvailable,
  sortMenu,
  type MenuCategory,
  type MenuItem,
} from '../api/menu.ts'
import { getSession } from '../api/session.ts'
import Button from '../components/Button.tsx'
import EmptyState from '../components/EmptyState.tsx'
import Icon from '../components/Icon.tsx'
import CategoryOrderSheet from '../components/menu/CategoryOrderSheet.tsx'
import ItemThumb from '../components/menu/ItemThumb.tsx'
import MenuItemSheet from '../components/menu/MenuItemSheet.tsx'
import Switch from '../components/Switch.tsx'
import { useMenu } from '../hooks/useMenu.ts'
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts'
import { useToast } from '../hooks/useToast.ts'
import { formatVnd, normalizeSearch } from '../lib/format.ts'
import './MenuPage.css'

/** Category filter: a category id, "all", or items without a category. */
type Filter = number | 'all' | 'none'
const NO_CATEGORY_LABEL = 'Khác'

/**
 * Menu management. Owners add/edit/delete items, upload pictures and order the groups;
 * everyone can mark an item sold out. Shows the copy saved on the device first,
 * then refreshes from the server when online.
 */
export default function MenuPage() {
  const online = useOnlineStatus()
  const toast = useToast()
  const isOwner = getSession()?.user.role === 'OWNER'

  const { menu, setMenu, loadError, reload } = useMenu()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  /** Item being edited, 'new' for the add form, null when the sheet is closed. */
  const [editing, setEditing] = useState<MenuItem | 'new' | null>(null)
  const [reordering, setReordering] = useState(false)

  const items = useMemo(() => menu?.items ?? [], [menu])
  const categories = useMemo(() => menu?.categories ?? [], [menu])
  const hasUncategorized = items.some((item) => item.categoryId === null)

  const visibleGroups = useMemo(() => {
    const search = normalizeSearch(query)
    const visible = items.filter((item) => {
      if (filter === 'none' && item.categoryId !== null) return false
      if (typeof filter === 'number' && item.categoryId !== filter) return false
      return !search || normalizeSearch(item.name).includes(search)
    })
    // Items are sorted by category order, so consecutive items share a group.
    const groups: { key: string; label: string; items: MenuItem[] }[] = []
    for (const item of visible) {
      const key = String(item.categoryId ?? 'none')
      const last = groups.at(-1)
      if (last?.key === key) last.items.push(item)
      else groups.push({ key, label: item.category ?? NO_CATEGORY_LABEL, items: [item] })
    }
    return groups
  }, [items, query, filter])

  const canEdit = isOwner && online
  const soldOutCount = items.filter((item) => !item.available).length

  function updateItems(change: (items: MenuItem[]) => MenuItem[], newCategories: MenuCategory[] = categories) {
    setMenu((current) => sortMenu(change(current?.items ?? []), newCategories))
  }

  function replaceItem(updated: MenuItem) {
    updateItems((current) => current.map((i) => (i.id === updated.id ? updated : i)))
  }

  /** Item changes can create or remove categories, so re-read them (fall back to the old list offline). */
  async function refreshCategories(): Promise<MenuCategory[]> {
    try {
      return await fetchCategories()
    } catch {
      return categories
    }
  }

  async function toggleAvailable(item: MenuItem, available: boolean) {
    replaceItem({ ...item, available }) // optimistic
    try {
      replaceItem(await setMenuItemAvailable(item.id, available))
      toast.show(available ? `Đã mở bán lại "${item.name}"` : `Đã báo hết "${item.name}"`)
    } catch (err) {
      replaceItem(item)
      toast.show(err instanceof Error ? err.message : 'Không cập nhật được', 'error')
    }
  }

  async function handleSaved(saved: MenuItem, isNew: boolean, warning?: string) {
    setEditing(null)
    const newCategories = await refreshCategories()
    updateItems(
      (current) => (isNew ? [...current, saved] : current.map((i) => (i.id === saved.id ? saved : i))),
      newCategories,
    )
    if (warning) toast.show(warning, 'error')
    else toast.show(isNew ? `Đã thêm "${saved.name}"` : 'Đã lưu thay đổi')
  }

  async function handleDeleted(deleted: MenuItem) {
    setEditing(null)
    const newCategories = await refreshCategories()
    updateItems((current) => current.filter((i) => i.id !== deleted.id), newCategories)
    toast.show(`Đã xóa "${deleted.name}"`)
  }

  function handleReordered(newCategories: MenuCategory[]) {
    setReordering(false)
    updateItems((current) => current, newCategories)
    toast.show('Đã lưu thứ tự nhóm')
  }

  function clearFilters() {
    setQuery('')
    setFilter('all')
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Menu</h1>
          {items.length > 0 && (
            <p className="subtitle">
              {items.length} món · {categories.length} nhóm{soldOutCount > 0 && ` · ${soldOutCount} đang hết`}
            </p>
          )}
        </div>
        {isOwner && (
          <div className="page-actions">
            {categories.length > 1 && (
              <Button icon="sort" aria-label="Sắp xếp nhóm" disabled={!online} onClick={() => setReordering(true)}>
                <span className="hide-on-phone">Sắp xếp nhóm</span>
              </Button>
            )}
            <Button variant="primary" icon="plus" disabled={!online} onClick={() => setEditing('new')}>
              Thêm món
            </Button>
          </div>
        )}
      </div>

      {!online && (
        <div className="notice notice-warning" role="status">
          <Icon name="wifiOff" />
          <span>Đang mất mạng: đây là menu đã lưu trên máy. Cần có mạng để thay đổi menu.</span>
        </div>
      )}
      {online && loadError && items.length > 0 && (
        <div className="notice notice-danger" role="alert">
          <Icon name="alert" />
          <span className="spacer">Không tải được menu mới nhất: {loadError}</span>
          <button type="button" className="notice-action" onClick={() => reload()}>
            Thử lại
          </button>
        </div>
      )}

      {menu === null ? (
        <MenuSkeleton />
      ) : items.length === 0 ? (
        loadError ? (
          <EmptyState
            icon="alert"
            title="Không tải được menu"
            description={loadError}
            action={
              <Button icon="refresh" onClick={() => reload()}>
                Thử lại
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon="coffee"
            title="Chưa có món nào"
            description={
              isOwner ? 'Thêm các món quán đang bán để bắt đầu nhận đơn.' : 'Chủ quán chưa thêm món nào vào menu.'
            }
            action={
              isOwner && (
                <Button variant="primary" icon="plus" disabled={!online} onClick={() => setEditing('new')}>
                  Thêm món đầu tiên
                </Button>
              )
            }
          />
        )
      ) : (
        <>
          <div className="menu-toolbar">
            <label className="search-box">
              <Icon name="search" />
              <span className="visually-hidden">Tìm món</span>
              <input type="search" placeholder="Tìm món..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <div className="chip-row" role="group" aria-label="Lọc theo nhóm">
              <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label="Tất cả" count={items.length} />
              {categories.map((c) => (
                <FilterChip
                  key={c.id}
                  active={filter === c.id}
                  onClick={() => setFilter(c.id)}
                  label={c.name}
                  count={items.filter((i) => i.categoryId === c.id).length}
                />
              ))}
              {hasUncategorized && (
                <FilterChip
                  active={filter === 'none'}
                  onClick={() => setFilter('none')}
                  label={NO_CATEGORY_LABEL}
                  count={items.filter((i) => i.categoryId === null).length}
                />
              )}
            </div>
          </div>

          {visibleGroups.length === 0 ? (
            <EmptyState
              icon="search"
              title="Không tìm thấy món phù hợp"
              description="Thử từ khóa khác hoặc chọn nhóm khác."
              action={<Button onClick={clearFilters}>Xóa bộ lọc</Button>}
            />
          ) : (
            visibleGroups.map((group) => (
              <div key={group.key} className="menu-group">
                <h2 className="menu-group-title">
                  {group.label} <span className="muted">· {group.items.length}</span>
                </h2>
                <ul className="menu-grid">
                  {group.items.map((item) => (
                    <MenuCard
                      key={item.id}
                      item={item}
                      canEdit={canEdit}
                      canToggle={online}
                      onEdit={() => setEditing(item)}
                      onToggle={(available) => void toggleAvailable(item, available)}
                    />
                  ))}
                </ul>
              </div>
            ))
          )}
        </>
      )}

      {editing !== null && (
        <MenuItemSheet
          key={editing === 'new' ? 'new' : editing.id}
          item={editing === 'new' ? null : editing}
          categories={categories.map((c) => c.name)}
          onClose={() => setEditing(null)}
          onSaved={(saved, isNew, warning) => void handleSaved(saved, isNew, warning)}
          onDeleted={(deleted) => void handleDeleted(deleted)}
        />
      )}
      {reordering && (
        <CategoryOrderSheet categories={categories} onClose={() => setReordering(false)} onSaved={handleReordered} />
      )}
    </section>
  )
}

function FilterChip(props: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      className={props.active ? 'chip is-active' : 'chip'}
      aria-pressed={props.active}
      onClick={props.onClick}
    >
      {props.label} <span className="count">{props.count}</span>
    </button>
  )
}

interface MenuCardProps {
  item: MenuItem
  canEdit: boolean
  canToggle: boolean
  onEdit: () => void
  onToggle: (available: boolean) => void
}

function MenuCard({ item, canEdit, canToggle, onEdit, onToggle }: MenuCardProps) {
  const info = (
    <>
      <ItemThumb name={item.name} category={item.category} imageUrl={item.imageUrl} />
      <span className="menu-card-text">
        <span className="menu-card-name">{item.name}</span>
        <span className="menu-card-meta">
          <span className="menu-card-price">{formatVnd(item.price)}</span>
          {!item.available && <span className="badge badge-danger">Hết món</span>}
        </span>
      </span>
    </>
  )
  return (
    <li className={item.available ? 'menu-card' : 'menu-card is-sold-out'}>
      {canEdit ? (
        <button type="button" className="menu-card-info is-clickable" onClick={onEdit} aria-label={`Sửa ${item.name}`}>
          {info}
          <Icon name="pencil" size={16} className="menu-card-edit-icon" />
        </button>
      ) : (
        <div className="menu-card-info">{info}</div>
      )}
      <div className="menu-card-toggle">
        <Switch
          checked={item.available}
          onChange={onToggle}
          disabled={!canToggle}
          label={`${item.available ? 'Báo hết' : 'Mở bán lại'} ${item.name}`}
        />
        <span className="menu-card-toggle-label">{item.available ? 'Còn' : 'Hết'}</span>
      </div>
    </li>
  )
}

function MenuSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải menu">
      <div className="skeleton" style={{ height: 44, marginBottom: 16 }} />
      <ul className="menu-grid">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="skeleton" style={{ height: 80 }} />
        ))}
      </ul>
    </div>
  )
}
