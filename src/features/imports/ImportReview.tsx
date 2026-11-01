import { Calendar } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, requestPersistentStorage } from '../../db/database'
import { dateFieldLabel, todayISO } from '../../lib/dates'
import { newId } from '../../lib/id'
import {
  acknowledgeImport,
  readInboxConfig,
  type PendingImport,
} from '../../lib/inbox'
import { parsePendingImport } from '../../lib/importParser'
import {
  currencyFractionDigits,
  currencySymbol,
  getLocale,
  inputToMinor,
} from '../../lib/money'
import type { Category } from '../../types'

interface ImportReviewProps {
  items: PendingImport[]
  onClose: () => void
  onImported: (id: string) => void
}

export function ImportReview({ items, onClose, onImported }: ImportReviewProps) {
  const [queue, setQueue] = useState(items)
  const [total] = useState(items.length)
  const [reviewed, setReviewed] = useState(0)
  const settings = useLiveQuery(() => db.settings.get('app'), [])
  const categories = useLiveQuery(async () => {
    const all = await db.categories.orderBy('sortOrder').toArray()
    return all.filter((category) => !category.archived)
  }, [])

  const current = queue[0]
  if (!current) return null

  const currency = settings?.currency ?? 'USD'
  const locale = settings?.locale ?? getLocale()

  function advance(importedId: string | null) {
    if (importedId) onImported(importedId)
    setReviewed((value) => value + 1)
    setQueue((remaining) => remaining.slice(1))
    if (queue.length <= 1) onClose()
  }

  return (
    <ImportForm
      key={current.id}
      item={current}
      categories={categories ?? []}
      currency={currency}
      locale={locale}
      position={reviewed + 1}
      total={total}
      onClose={onClose}
      onAdvance={advance}
    />
  )
}

interface ImportFormProps {
  item: PendingImport
  categories: Category[]
  currency: string
  locale: string
  position: number
  total: number
  onClose: () => void
  onAdvance: (importedId: string | null) => void
}

function cleanAmount(value: string, fractionDigits: number): string {
  const normalized = value.replace(/,/g, '.').replace(/[^\d.]/g, '')
  const [whole = '', ...rest] = normalized.split('.')
  if (rest.length === 0) return whole
  return `${whole}.${rest.join('').slice(0, fractionDigits)}`
}

function ImportForm({
  item,
  categories,
  currency,
  locale,
  position,
  total,
  onClose,
  onAdvance,
}: ImportFormProps) {
  const [initial] = useState(() => parsePendingImport(item))
  const [amount, setAmount] = useState(initial.amount)
  const [note, setNote] = useState(initial.note)
  const [date, setDate] = useState(initial.date)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectiveCategory = categoryId
  const fractionDigits = currencyFractionDigits(currency, locale)
  const minor = inputToMinor(amount, currency, locale)
  const canSave = minor > 0 && effectiveCategory !== null && !saving

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

  async function save() {
    if (!canSave || !effectiveCategory || saving) return
    setSaving(true)
    setError(null)

    try {
      const now = Date.now()
      await db.transaction('rw', db.expenses, db.imports, async () => {
        await db.expenses.add({
          id: newId(),
          amount: minor,
          categoryId: effectiveCategory,
          date,
          note: note.trim(),
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        })
        await db.imports.put({ externalId: item.externalId, importedAt: now })
      })

      const config = readInboxConfig()
      if (config) {
        void acknowledgeImport(config, item.id).catch(() => {
          // The local marker prevents a duplicate; a later refresh retries the ack.
        })
      }
      void requestPersistentStorage()
      onAdvance(item.id)
    } catch {
      setSaving(false)
      setError('Could not save this import. Please try again.')
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        aria-label="Close import review"
        onClick={() => {
          if (!saving) onClose()
        }}
        className="sheet-backdrop animate-fade-in absolute inset-0 h-full w-full"
        disabled={saving}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Review imported notification"
        className="animate-sheet-in absolute inset-x-0 bottom-0 mx-auto w-full max-w-[560px]"
      >
        <div className="sheet-glass flex max-h-[90dvh] flex-col rounded-t-[30px] border-t border-separator shadow-[0_-20px_60px_rgba(0,0,0,0.25)]">
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
            <div className="text-center">
              <p className="text-[16px] font-semibold">Review Import</p>
              <p className="text-[11px] text-secondary">
                {position} of {total}
              </p>
            </div>
            <span aria-hidden="true" />
          </div>

          <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-5 pb-2">
            <div className="mt-3 rounded-[16px] bg-surface-2 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.6px] text-secondary">
                {item.source ?? 'Notification'}
              </p>
              <p className="mt-1 text-[13px] font-medium">
                {item.title || item.subtitle || 'Notification'}
              </p>
              {item.body && (
                <p className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap text-[12px] leading-snug text-secondary">
                  {item.body}
                </p>
              )}
            </div>

            <label className="mt-4 block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.9px] text-secondary">
                Amount
              </span>
              <div className="relative mt-1.5">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[16px] font-semibold text-secondary">
                  {currencySymbol(currency, locale)}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) =>
                    setAmount(cleanAmount(event.target.value, fractionDigits))
                  }
                  placeholder="0.00"
                  className="h-12 w-full rounded-[12px] bg-surface-2 pl-10 pr-3 text-[20px] font-semibold amount-tabular placeholder:text-tertiary"
                />
              </div>
            </label>

            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.9px] text-secondary">
                Category
              </p>
              <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1">
                {categories.map((category) => {
                  const selected = category.id === effectiveCategory
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setCategoryId(category.id)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors ${
                        selected
                          ? 'border-accent bg-accent-soft text-accent'
                          : 'border-transparent bg-surface-2 text-label'
                      }`}
                    >
                      <span className="text-[16px]" aria-hidden="true">
                        {category.emoji}
                      </span>
                      {category.name}
                    </button>
                  )
                })}
              </div>
              {!effectiveCategory && (
                <p className="mt-1.5 text-[11px] text-secondary">
                  Choose a category to save this import.
                </p>
              )}
            </div>

            <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
              <label className="relative flex h-11 items-center gap-2 rounded-[12px] bg-surface-2 px-3 text-[14px] font-medium">
                <Calendar size={16} className="text-secondary" />
                <span>{dateFieldLabel(date)}</span>
                <input
                  type="date"
                  value={date}
                  max={todayISO()}
                  aria-label="Import date"
                  onChange={(event) => {
                    if (event.target.value) setDate(event.target.value)
                  }}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
              <input
                type="text"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add a note (optional)"
                maxLength={80}
                enterKeyHint="done"
                autoComplete="off"
                className="h-11 min-w-0 rounded-[12px] bg-surface-2 px-3.5 text-[16px] placeholder:text-tertiary"
              />
            </div>

            {error && (
              <p role="alert" className="mt-3 text-center text-[13px] font-medium text-negative">
                {error}
              </p>
            )}
          </div>

          <div className="shrink-0 px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onAdvance(null)}
                disabled={saving}
                className="pressable h-[52px] rounded-[16px] bg-surface-2 px-5 text-[15px] font-medium text-secondary disabled:opacity-40"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={!canSave}
                className="pressable h-[52px] flex-1 rounded-[16px] bg-accent text-[17px] font-semibold text-white disabled:bg-surface-2 disabled:text-tertiary"
              >
                {saving ? 'Saving…' : 'Add expense'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
