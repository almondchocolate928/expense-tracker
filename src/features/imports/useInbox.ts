import { useCallback, useEffect, useState } from 'react'
import {
  INBOX_CHANGED_EVENT,
  pullPendingImports,
  readInboxConfig,
  type PendingImport,
} from '../../lib/inbox'

export function useInbox() {
  const [pending, setPending] = useState<PendingImport[]>([])
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    await Promise.resolve()
    const config = readInboxConfig()
    if (!config) {
      setPending([])
      setError(null)
      return
    }

    try {
      const items = await pullPendingImports(config)
      setPending(items)
      setError(null)
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not check the inbox.',
      )
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(refresh)

    function onConfigChanged() {
      void refresh()
    }
    function onVisibilityChanged() {
      if (document.visibilityState === 'visible') void refresh()
    }

    window.addEventListener(INBOX_CHANGED_EVENT, onConfigChanged)
    document.addEventListener('visibilitychange', onVisibilityChanged)
    return () => {
      window.removeEventListener(INBOX_CHANGED_EVENT, onConfigChanged)
      document.removeEventListener('visibilitychange', onVisibilityChanged)
    }
  }, [refresh])

  const removePending = useCallback((id: string) => {
    setPending((items) => items.filter((item) => item.id !== id))
  }, [])

  return { pending, error, refresh, removePending }
}
