import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastKind } from '../hooks/useToast.ts'
import Icon from './Icon.tsx'
import './Toast.css'

interface Toast {
  id: number
  message: string
  kind: ToastKind
}

const DURATION_MS = 3500

/** Renders toasts and provides useToast() to the whole app. */
export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const show = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = nextId.current++
    setToasts((current) => [...current.slice(-2), { id, message, kind }])
    window.setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), DURATION_MS)
  }, [])

  const api = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.kind}`}>
            <Icon name={toast.kind === 'error' ? 'alert' : 'check'} />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
