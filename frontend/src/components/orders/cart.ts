// Cart model for the sales screen (plain functions, no React).

import type { MenuItem } from '../../api/menu.ts'

export interface CartLine {
  menuItemId: number
  name: string
  category: string | null
  imageUrl: string | null
  /** VND, copied from the menu when added (what the customer pays). */
  unitPrice: number
  quantity: number
}

export const MAX_QUANTITY = 999

export function addToCart(lines: CartLine[], item: MenuItem): CartLine[] {
  const existing = lines.find((l) => l.menuItemId === item.id)
  if (existing) {
    return lines.map((l) =>
      l.menuItemId === item.id ? { ...l, quantity: Math.min(MAX_QUANTITY, l.quantity + 1) } : l,
    )
  }
  return [
    ...lines,
    {
      menuItemId: item.id,
      name: item.name,
      category: item.category,
      imageUrl: item.imageUrl,
      unitPrice: item.price,
      quantity: 1,
    },
  ]
}

/** quantity 0 removes the line. */
export function setQuantity(lines: CartLine[], menuItemId: number, quantity: number): CartLine[] {
  if (quantity <= 0) return lines.filter((l) => l.menuItemId !== menuItemId)
  return lines.map((l) => (l.menuItemId === menuItemId ? { ...l, quantity: Math.min(MAX_QUANTITY, quantity) } : l))
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0)
}

/** Amounts a customer typically hands over for `total`: exact, then the next round notes. */
export function cashSuggestions(total: number): number[] {
  if (total <= 0) return []
  const candidates = [total, roundUp(total, 10_000), roundUp(total, 50_000), roundUp(total, 100_000), 200_000, 500_000]
  return [...new Set(candidates.filter((v) => v >= total))].sort((a, b) => a - b).slice(0, 4)
}

function roundUp(value: number, step: number): number {
  return Math.ceil(value / step) * step
}

/** Cart kept per shop in sessionStorage, so switching tabs does not lose the order being taken. */
export function loadCart(shopId: number): CartLine[] {
  try {
    const raw = sessionStorage.getItem(cartKey(shopId))
    return raw ? (JSON.parse(raw) as CartLine[]) : []
  } catch {
    return []
  }
}

export function saveCart(shopId: number, lines: CartLine[]): void {
  try {
    if (lines.length === 0) sessionStorage.removeItem(cartKey(shopId))
    else sessionStorage.setItem(cartKey(shopId), JSON.stringify(lines))
  } catch {
    // Storage full or blocked: the cart just won't survive a reload.
  }
}

function cartKey(shopId: number): string {
  return `cms.cart.${shopId}`
}
