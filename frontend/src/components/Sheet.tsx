import { useEffect, useId, useRef, type ReactNode } from 'react'
import Button from './Button.tsx'
import './Sheet.css'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Buttons at the bottom (stay visible while the body scrolls). */
  footer?: ReactNode
}

/**
 * Modal panel built on the native <dialog> element (focus trap and Esc for free).
 * Bottom sheet on phones, centered dialog on wider screens.
 */
export default function Sheet({ open, title, onClose, children, footer }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      // A click on the dialog element itself (not its content) is a click on the backdrop.
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
    >
      {open && (
        <div className="sheet-panel">
          <header className="sheet-header">
            <h2 id={titleId}>{title}</h2>
            <Button variant="ghost" icon="close" className="btn-icon" aria-label="Đóng" onClick={onClose} />
          </header>
          <div className="sheet-body">{children}</div>
          {footer && <footer className="sheet-footer">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}
