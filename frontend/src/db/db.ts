import Dexie, { type EntityTable } from 'dexie'

// Local IndexedDB database. Lets the app show the menu and create orders while offline.

/** Copy of a server menu item, refreshed whenever the app is online. */
export interface LocalMenuItem {
  id: number
  name: string
  category: string | null
  /** VND. */
  price: number
  available: boolean
  /** ISO timestamp from the server. */
  updatedAt: string
}

export interface PendingOrderItem {
  menuItemId: number | null
  itemName: string
  /** VND at the time of sale. */
  unitPrice: number
  quantity: number
}

/** An order created on this device that the server has not confirmed yet. */
export interface PendingOrder {
  /** UUID made on the device (crypto.randomUUID()); the server uses it to ignore duplicates. */
  clientId: string
  /** Shop that created it, so a different shop logging in on this device never sends it. */
  shopId: number
  /** ISO timestamp of creation on the device. */
  createdAt: string
  note?: string
  items: PendingOrderItem[]
  /** Number of failed sync attempts, and the last error message from the server. */
  attempts: number
  lastError?: string
}

export const db = new Dexie('cms') as Dexie & {
  menu_items: EntityTable<LocalMenuItem, 'id'>
  pending_orders: EntityTable<PendingOrder, 'clientId'>
}

// Only primary keys and fields used in queries are listed; other fields are stored anyway.
// To change the schema later, add db.version(2).stores({...}) — never edit version 1.
db.version(1).stores({
  menu_items: 'id, category',
  pending_orders: 'clientId, shopId, createdAt',
})
