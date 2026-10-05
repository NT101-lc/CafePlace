import { db, type LocalMenuCategory, type LocalMenuItem } from '../db/db.ts'
import { compareVi } from '../lib/format.ts'
import { apiFetch } from './client.ts'

// Menu API. Every successful call also updates the IndexedDB copy, so the menu is available offline.

export type MenuItem = LocalMenuItem
export type MenuCategory = LocalMenuCategory

export interface Menu {
  /** Sorted: category order, then name. */
  items: MenuItem[]
  /** Sorted by display order. */
  categories: MenuCategory[]
}

export interface MenuItemInput {
  name: string
  /** Category name; a new name creates the category. null = no category. */
  category: string | null
  price: number
  available: boolean
}

/** Menu saved on this device (may be stale). Empty if never loaded. */
export async function getCachedMenu(): Promise<Menu> {
  const [items, categories] = await Promise.all([db.menu_items.toArray(), db.menu_categories.toArray()])
  return sortMenu(items, categories)
}

/** Loads the menu from the server and replaces the local copy. */
export async function fetchMenu(): Promise<Menu> {
  const [items, categories] = await Promise.all([
    apiFetch<MenuItem[]>('/api/menu-items'),
    apiFetch<MenuCategory[]>('/api/menu-categories'),
  ])
  await db.transaction('rw', db.menu_items, db.menu_categories, async () => {
    await db.menu_items.clear()
    await db.menu_items.bulkPut(items)
    await db.menu_categories.clear()
    await db.menu_categories.bulkPut(categories)
  })
  return sortMenu(items, categories)
}

export async function createMenuItem(input: MenuItemInput): Promise<MenuItem> {
  return saveLocal(await apiFetch<MenuItem>('/api/menu-items', { method: 'POST', body: input }))
}

export async function updateMenuItem(id: number, input: MenuItemInput): Promise<MenuItem> {
  return saveLocal(await apiFetch<MenuItem>(`/api/menu-items/${id}`, { method: 'PUT', body: input }))
}

export async function setMenuItemAvailable(id: number, available: boolean): Promise<MenuItem> {
  return saveLocal(
    await apiFetch<MenuItem>(`/api/menu-items/${id}/availability`, { method: 'PATCH', body: { available } }),
  )
}

export async function deleteMenuItem(id: number): Promise<void> {
  await apiFetch<void>(`/api/menu-items/${id}`, { method: 'DELETE' })
  await db.menu_items.delete(id)
}

/** Uploads an already shrunk image (see lib/image.ts). */
export async function uploadMenuItemImage(id: number, image: Blob): Promise<MenuItem> {
  return saveLocal(await apiFetch<MenuItem>(`/api/menu-items/${id}/image`, { method: 'PUT', body: image }))
}

export async function removeMenuItemImage(id: number): Promise<MenuItem> {
  return saveLocal(await apiFetch<MenuItem>(`/api/menu-items/${id}/image`, { method: 'DELETE' }))
}

/** Saves the new category order; `ids` must list every category. */
export async function reorderCategories(ids: number[]): Promise<MenuCategory[]> {
  const categories = await apiFetch<MenuCategory[]>('/api/menu-categories/order', { method: 'PUT', body: { ids } })
  await db.transaction('rw', db.menu_categories, async () => {
    await db.menu_categories.clear()
    await db.menu_categories.bulkPut(categories)
  })
  return categories
}

/** Re-reads categories after an item change (a new category name creates one, an empty one disappears). */
export async function fetchCategories(): Promise<MenuCategory[]> {
  const categories = await apiFetch<MenuCategory[]>('/api/menu-categories')
  await db.transaction('rw', db.menu_categories, async () => {
    await db.menu_categories.clear()
    await db.menu_categories.bulkPut(categories)
  })
  return categories
}

/** Items in category display order (items without category last), then by name. */
export function sortMenu(items: MenuItem[], categories: MenuCategory[]): Menu {
  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder || compareVi(a.name, b.name))
  const position = new Map(sortedCategories.map((c, index) => [c.id, index]))
  const rank = (item: MenuItem) =>
    item.categoryId === null ? Number.MAX_SAFE_INTEGER : (position.get(item.categoryId) ?? Number.MAX_SAFE_INTEGER - 1)
  const sortedItems = [...items].sort((a, b) => rank(a) - rank(b) || compareVi(a.name, b.name))
  return { items: sortedItems, categories: sortedCategories }
}

async function saveLocal(item: MenuItem): Promise<MenuItem> {
  await db.menu_items.put(item)
  return item
}
