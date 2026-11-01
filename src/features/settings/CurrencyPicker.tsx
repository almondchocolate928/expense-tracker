import { Check, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { db } from '../../db/database'

const CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CNY',
  'TWD',
  'INR',
  'CAD',
  'AUD',
  'NZD',
  'SGD',
  'HKD',
  'KRW',
  'CHF',
  'SEK',
  'NOK',
  'DKK',
  'BRL',
  'MXN',
  'ZAR',
  'AED',
  'SAR',
  'THB',
  'MYR',
  'IDR',
  'PHP',
  'VND',
  'TRY',
  'PLN',
  'CZK',
]

interface CurrencyPickerProps {
  current: string
  locale: string
  onClose: () => void
}

export function CurrencyPicker({ current, locale, onClose }: CurrencyPickerProps) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const options = useMemo(() => {
    const codes = [current, ...CURRENCIES.filter((code) => code !== current)]
    let displayNames: Intl.DisplayNames | null = null
    try {
      displayNames = new Intl.DisplayNames([locale], { type: 'currency' })
    } catch {
      // Fall back to currency codes below.
    }

    return codes.map((code) => {
      let name = code
      try {
        name = displayNames?.of(code) ?? code
      } catch {
        // Some runtimes reject unknown codes; keep the code as the label.
      }
      return { code, name }
    })
  }, [current, locale])

  const needle = query.trim().toLowerCase()
  const filtered = options.filter(
    (option) =>
      !needle ||
      option.code.toLowerCase().includes(needle) ||
      option.name.toLowerCase().includes(needle),
  )

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose, saving])

  async function choose(code: string) {
    if (saving) return
    if (code === current) {
      onClose()
      return
    }

    setSaving(true)
    setError(null)
    try {
      await db.settings.update('app', { currency: code })
      onClose()
    } catch {
      setSaving(false)
      setError('Could not change currency. Please try again.')
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        aria-label="Close currency picker"
        onClick={() => {
          if (!saving) onClose()
        }}
        className="sheet-backdrop animate-fade-in absolute inset-0 h-full w-full"
        disabled={saving}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose currency"
        className="animate-sheet-in absolute inset-x-0 bottom-0 mx-auto w-full max-w-[560px]"
      >
        <div className="sheet-glass flex max-h-[85dvh] flex-col rounded-t-[30px] border-t border-separator shadow-[0_-20px_60px_rgba(0,0,0,0.25)]">
          <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-[var(--tertiary-label)]" />

          <div className="grid shrink-0 grid-cols-3 items-center px-4 pb-1 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="justify-self-start px-2 py-2 text-[16px] font-medium text-accent disabled:opacity-40"
            >
              Cancel
            </button>
            <p className="text-center text-[16px] font-semibold">Currency</p>
            <span aria-hidden="true" />
          </div>

          <div className="shrink-0 px-5 pb-3">
            <label className="relative block">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tertiary"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search currencies"
                aria-label="Search currencies"
                autoComplete="off"
                className="h-11 w-full rounded-[12px] bg-surface-2 pl-9 pr-3 text-[16px] placeholder:text-tertiary"
              />
            </label>
            {error && (
              <p role="alert" className="mt-2 text-[12px] font-medium text-negative">
                {error}
              </p>
            )}
          </div>

          <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(env(safe-area-inset-bottom),16px)]">
            <div className="overflow-hidden rounded-[16px] border border-separator">
              {filtered.map((option, index) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => void choose(option.code)}
                  disabled={saving}
                  className={`flex w-full items-center gap-3 bg-surface px-4 py-3 text-left transition-colors active:bg-surface-2 disabled:opacity-60 ${
                    index > 0 ? 'border-t border-separator' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold">{option.code}</p>
                    <p className="truncate text-[12px] text-secondary">{option.name}</p>
                  </div>
                  {option.code === current && (
                    <Check size={18} className="shrink-0 text-accent" />
                  )}
                </button>
              ))}

              {filtered.length === 0 && (
                <p className="bg-surface px-4 py-8 text-center text-[14px] text-secondary">
                  No currencies found.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
