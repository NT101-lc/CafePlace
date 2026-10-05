import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { fetchMenu, getCachedMenu, type Menu } from '../api/menu.ts'
import { useOnlineStatus } from './useOnlineStatus.ts'

export interface MenuState {
  /** null while loading for the first time. */
  menu: Menu | null
  setMenu: Dispatch<SetStateAction<Menu | null>>
  /** Set when the server could not be reached; the cached menu (if any) is still shown. */
  loadError: string | null
  reload: () => void
}

/**
 * Menu for the current shop: shows the copy saved on the device right away, then refreshes from the
 * server whenever the app is (or comes back) online. Used by the menu and sales pages.
 */
export function useMenu(): MenuState {
  const online = useOnlineStatus()
  const [menu, setMenu] = useState<Menu | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const cached = await getCachedMenu()
      if (cancelled) return
      if (cached.items.length > 0) setMenu(cached)
      if (!navigator.onLine) {
        if (cached.items.length === 0) setMenu(cached)
        return
      }
      try {
        const fresh = await fetchMenu()
        if (cancelled) return
        setMenu(fresh)
        setLoadError(null)
      } catch (err) {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : 'Không tải được menu')
        if (cached.items.length === 0) setMenu(cached)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [online, reloadKey])

  return { menu, setMenu, loadError, reload: () => setReloadKey((k) => k + 1) }
}
