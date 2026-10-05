import Dexie, { type EntityTable } from 'dexie'

// Local IndexedDB database. Lets the app show the menu and create orders while offline.

/** Copy of a server menu item, refreshed whenever the app is online. */
export interface LocalMenuItem {
  id: number
  name: string
  /** null = no category ("Khác"). */
  categoryId: number | null
  category: string | null
  /** VND. */
  price: number
  available: boolean
  /** Relative URL like /api/media/menu/12/<uuid>.webp, or null. Cached by the service worker. */
  imageUrl: string | null
  /** ISO timestamp from the server. */
  updatedAt: string
}

/** Copy of a server menu category; sortOrder 0 is shown first. */
export interface LocalMenuCategory {
  id: number
  name: string
  sortOrder: number
}

export interface PendingOrderItem {
  menuItemId: number | null
  itemName: string
  /** VND at the time of sale. */
  unitPrice: number
  quantity: number
}

export type PaymentMethod = 'CASH' | 'TRANSFER'

/** An order created on this device that the server has not confirmed yet. */
export interface PendingOrder {
  /** UUID made on the device (crypto.randomUUID()); the server uses it to ignore duplicates. */
  clientId: string
  /** Shop that created it, so a different shop logging in on this device never sends it. */
  shopId: number
  /** ISO timestamp of creation on the device. */
  createdAt: string
  paymentMethod: PaymentMethod
  /** VND, sum of the lines (the server recomputes it). */
  totalAmount: number
  note?: string
  items: PendingOrderItem[]
  /** Number of failed sync attempts, and the last error message from the server. */
  attempts: number
  lastError?: string
}

export const db = new Dexie('cms') as Dexie & {
  menu_items: EntityTable<LocalMenuItem, 'id'>
  menu_categories: EntityTable<LocalMenuCategory, 'id'>
  pending_orders: EntityTable<PendingOrder, 'clientId'>
}

// Only primary keys and fields used in queries are listed; other fields are stored anyway.
// To change the schema, add a new db.version(n) — never edit an existing version.
db.version(1).stores({
  menu_items: 'id, category',
  pending_orders: 'clientId, shopId, createdAt',
})

// v2: categories have their own table (with display order); menu items reference them by id.
db.version(2)
  .stores({
    menu_items: 'id, categoryId',
    menu_categories: 'id',
  })
  // The old cached menu has the wrong shape; it is refetched on the next online load.
  .upgrade((tx) => tx.table('menu_items').clear())
