import { RefreshCw, X } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-[max(env(safe-area-inset-top),10px)]">
      <div className="animate-toast-in pointer-events-auto flex w-full max-w-[520px] items-center gap-3 rounded-[18px] border border-separator bg-surface p-3 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <RefreshCw size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">New version available</p>
          <p className="text-[12px] text-secondary">Reload to get the latest build.</p>
        </div>
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-white"
        >
          Reload
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          aria-label="Dismiss update"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-tertiary active:bg-surface-2"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
