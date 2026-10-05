import { createContext, useContext } from 'react'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastApi {
  /** Shows a short message at the bottom of the screen for a few seconds. */
  show: (message: string, kind?: ToastKind) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

/** Use inside components rendered under <ToastProvider>. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast must be used inside <ToastProvider>')
  return api
}
