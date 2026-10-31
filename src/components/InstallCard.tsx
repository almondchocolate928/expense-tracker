import { Share, X } from 'lucide-react'
import { useState } from 'react'
import { isIOS, isStandalone } from '../lib/platform'

const DISMISS_KEY = 'install-card-dismissed'

export function InstallCard() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  if (dismissed || !isIOS() || isStandalone()) return null

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Private mode: dismissal only lasts for this session.
    }
  }

  return (
    <div className="mx-4 mt-5 flex items-start gap-3 rounded-[18px] border border-separator bg-surface p-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Share size={19} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold">Install on your iPhone</p>
        <p className="mt-0.5 text-[13px] leading-snug text-secondary">
          In Safari, tap Share, then <span className="font-medium text-label">Add to Home Screen</span>.
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install tip"
        className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-tertiary active:bg-surface-2"
      >
        <X size={17} />
      </button>
    </div>
  )
}
