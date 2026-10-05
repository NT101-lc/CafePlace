import { useState } from 'react'
import { PAYMENT_LABELS, type PaymentMethod } from '../../api/orders.ts'
import { digitsOnly, formatNumber, formatVnd } from '../../lib/format.ts'
import Button from '../Button.tsx'
import Icon from '../Icon.tsx'
import ItemThumb from '../menu/ItemThumb.tsx'
import { cartTotal, cashSuggestions, type CartLine } from './cart.ts'
import './CartPanel.css'

export interface Checkout {
  paymentMethod: PaymentMethod
  note: string
  /** Cash handed over by the customer, null if not entered. */
  cashReceived: number | null
}

interface Props {
  /** Hidden when the panel is inside a Sheet that already shows a title. */
  showTitle?: boolean
  lines: CartLine[]
  onQuantityChange: (menuItemId: number, quantity: number) => void
  onClear: () => void
  onCheckout: (checkout: Checkout) => Promise<void>
}

/** Current order: lines, note, payment and the "Hoàn tất" button. */
export default function CartPanel({ showTitle = true, lines, onQuantityChange, onClear, onCheckout }: Props) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [note, setNote] = useState('')
  const [receivedDigits, setReceivedDigits] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const total = cartTotal(lines)
  const received = receivedDigits ? Number(receivedDigits) : null
  const change = received !== null ? received - total : null
  const notEnough = paymentMethod === 'CASH' && change !== null && change < 0

  async function submit() {
    setSubmitting(true)
    try {
      await onCheckout({ paymentMethod, note, cashReceived: paymentMethod === 'CASH' ? received : null })
      setNote('')
      setReceivedDigits('')
      setPaymentMethod('CASH')
    } finally {
      setSubmitting(false)
    }
  }

  if (lines.length === 0) {
    return (
      <div className="cart-panel cart-empty">
        <Icon name="receipt" size={32} />
        <p className="muted">Chạm vào món để thêm vào đơn</p>
      </div>
    )
  }

  return (
    <div className="cart-panel">
      <div className="cart-header">
        {showTitle ? <h2>Đơn mới</h2> : <span className="muted">{lines.length} món</span>}
        <Button variant="ghost" icon="trash" onClick={onClear} disabled={submitting}>
          Xoá hết
        </Button>
      </div>

      <ul className="cart-lines">
        {lines.map((line) => (
          <li key={line.menuItemId} className="cart-line">
            <ItemThumb name={line.name} category={line.category} imageUrl={line.imageUrl} />
            <div className="cart-line-info">
              <span className="cart-line-name">{line.name}</span>
              <span className="muted cart-line-price">{formatVnd(line.unitPrice)}</span>
            </div>
            <div className="qty-stepper">
              <button
                type="button"
                aria-label={`Bớt 1 ${line.name}`}
                onClick={() => onQuantityChange(line.menuItemId, line.quantity - 1)}
              >
                <Icon name={line.quantity === 1 ? 'trash' : 'minus'} size={18} />
              </button>
              <span aria-live="polite">{line.quantity}</span>
              <button
                type="button"
                aria-label={`Thêm 1 ${line.name}`}
                onClick={() => onQuantityChange(line.menuItemId, line.quantity + 1)}
              >
                <Icon name="plus" size={18} />
              </button>
            </div>
            <span className="cart-line-total">{formatVnd(line.unitPrice * line.quantity)}</span>
          </li>
        ))}
      </ul>

      <label className="cart-note">
        <span className="visually-hidden">Ghi chú</span>
        <input
          type="text"
          maxLength={255}
          placeholder="Ghi chú (ít đá, mang về...)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      <div className="segmented" role="radiogroup" aria-label="Hình thức thanh toán">
        {(['CASH', 'TRANSFER'] as const).map((method) => (
          <button
            key={method}
            type="button"
            role="radio"
            aria-checked={paymentMethod === method}
            className={paymentMethod === method ? 'is-active' : undefined}
            onClick={() => setPaymentMethod(method)}
          >
            {PAYMENT_LABELS[method]}
          </button>
        ))}
      </div>

      {paymentMethod === 'CASH' ? (
        <div className="cash-box">
          <div className="chip-row" aria-label="Khách đưa">
            {cashSuggestions(total).map((amount) => (
              <button
                key={amount}
                type="button"
                className={received === amount ? 'chip is-active' : 'chip'}
                onClick={() => setReceivedDigits(String(amount))}
              >
                {amount === total ? 'Vừa đủ' : formatNumber(amount)}
              </button>
            ))}
          </div>
          <label className="cash-input">
            <span>Khách đưa</span>
            <input
              inputMode="numeric"
              placeholder="0"
              value={receivedDigits ? formatNumber(Number(receivedDigits)) : ''}
              onChange={(e) => setReceivedDigits(digitsOnly(e.target.value).replace(/^0+(?=\d)/, '').slice(0, 10))}
            />
            <span className="muted">đ</span>
          </label>
          {change !== null && (
            <div className={notEnough ? 'cash-change is-short' : 'cash-change'}>
              {notEnough ? `Còn thiếu ${formatVnd(-change)}` : `Tiền thối: ${formatVnd(change)}`}
            </div>
          )}
        </div>
      ) : (
        <p className="muted transfer-hint">Kiểm tra đã nhận tiền chuyển khoản rồi mới bấm Hoàn tất.</p>
      )}

      <div className="cart-footer">
        <div className="cart-total">
          <span>Tổng cộng</span>
          <strong>{formatVnd(total)}</strong>
        </div>
        <Button variant="primary" size="lg" icon="check" loading={submitting} disabled={notEnough} onClick={submit}>
          Hoàn tất
        </Button>
      </div>
    </div>
  )
}
