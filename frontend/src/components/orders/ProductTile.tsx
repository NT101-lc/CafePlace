import type { MenuItem } from '../../api/menu.ts'
import { formatVnd } from '../../lib/format.ts'
import ItemThumb from '../menu/ItemThumb.tsx'
import './ProductTile.css'

interface Props {
  item: MenuItem
  /** How many of this item are in the cart. */
  quantity: number
  onAdd: () => void
}

/** One tap = add one to the cart. Sold-out items are shown but cannot be added. */
export default function ProductTile({ item, quantity, onAdd }: Props) {
  return (
    <button
      type="button"
      className={item.available ? 'product-tile' : 'product-tile is-sold-out'}
      disabled={!item.available}
      onClick={onAdd}
      aria-label={`Thêm ${item.name}, ${formatVnd(item.price)}${quantity > 0 ? `, đã có ${quantity}` : ''}`}
    >
      <span className="product-tile-image">
        <ItemThumb name={item.name} category={item.category} imageUrl={item.imageUrl} size="fill" />
        {quantity > 0 && <span className="product-tile-qty">{quantity}</span>}
        {!item.available && <span className="product-tile-soldout">Hết món</span>}
      </span>
      <span className="product-tile-name">{item.name}</span>
      <span className="product-tile-price">{formatVnd(item.price)}</span>
    </button>
  )
}
