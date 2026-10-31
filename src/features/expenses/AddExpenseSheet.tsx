import { Calendar, Delete, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, requestPersistentStorage } from '../../db/database'
import { dateFieldLabel, expenseDateDefault, todayISO } from '../../lib/dates'
import { newId } from '../../lib/id'
import {
  applyAmountKey,
  currencyFractionDigits,
  currencySymbol,
  decimalSeparator,
  getLocale,
  groupAmountEntry,
  inputToMinor,
  minorToEntry,
} from '../../lib/money'
import type { Expense } from '../../types'

const LAST_CATEGORY_KEY = 'last-category-id'

interface AddExpenseSheetProps {
  month: Date
  expense?: Expense
  onClose: () => void
  onSaved: (date: string) => void
  onDeleted?: (expense: Expense) => void
}

export function AddExpenseSheet({
  month,
  expense,
  onClose,
  onSaved,
  onDeleted,
}: AddExpenseSheetProps) {
  const isEdit = expense !== undefined
  const settings = useLiveQuery(() => db.settings.get('app'), [])
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray(), [])

  const [amountOverride, setAmountOverride] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    expense?.categoryId ?? null,
  )
  const [date, setDate] = useState(() => expense?.date ?? expenseDateDefault(month))
  const [note, setNote] = useState(expense?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const savingRef = useRef(false)

  const currency = settings?.currency ?? 'USD'
  const locale = settings?.locale ?? getLocale()
  const fractionDigits = currencyFractionDigits(currency, locale)
  const decimal = decimalSeparator(locale)

  const visibleCategories = useMemo(
    () =>
      (categories ?? []).filter(
        (category) => !category.archived || category.id === expense?.categoryId,
      ),
    [categories, expense?.categoryId],
  )

  const defaultCategoryId = useMemo(() => {
    if (!visibleCategories.length) return null
    try {
      const last = localStorage.getItem(LAST_CATEGORY_KEY)
      if (last && visibleCategories.some((category) => category.id === last)) return last
    } catch {
      // Ignore storage restrictions.
    }
    return visibleCategories[0].id
  }, [visibleCategories])

  const categoryId = selectedCategoryId ?? defaultCategoryId
  const amount =
    amountOverride ?? (expense ? minorToEntry(expense.amount, currency, locale) : '')
  const minor = inputToMinor(amount, currency, locale)
  const canSave = minor > 0 && categoryId !== null && !saving && !deleting

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  function press(key: string) {
    // In edit mode the amount is prefilled; the first digit starts a fresh amount.
    if (isEdit && amountOverride === null && /^\d$/.test(key)) {
      setAmountOverride(key)
      return
    }
    setAmountOverride(applyAmountKey(amount, key, fractionDigits))
  }

  async function save() {
    if (!canSave || !categoryId || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setError(null)

    try {
      const now = Date.now()
      if (expense) {
        await db.expenses.update(expense.id, {
          amount: minor,
          categoryId,
          date,
          note: note.trim(),
          updatedAt: now,
        })
      } else {
        await db.expenses.add({
          id: newId(),
          amount: minor,
          categoryId,
          date,
          note: note.trim(),
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        })
        try {
          localStorage.setItem(LAST_CATEGORY_KEY, categoryId)
        } catch {
          // Remembering the last category is optional.
        }
      }
      void requestPersistentStorage()
      onSaved(date)
    } catch {
      savingRef.current = false
      setSaving(false)
      setError('Could not save this expense. Please try again.')
    }
  }

  async function remove() {
    if (!expense || savingRef.current || deleting) return
    savingRef.current = true
    setDeleting(true)
    setError(null)

    try {
      const now = Date.now()
      await db.expenses.update(expense.id, { deletedAt: now, updatedAt: now })
      if (onDeleted) onDeleted(expense)
      else onClose()
    } catch {
      savingRef.current = false
      setDeleting(false)
      setError('Could not delete this expense. Please try again.')
    }
  }

  const keypad: Array<{ key: string; label: string; ariaLabel?: string }> = [
    { key: '1', label: '1' },
    { key: '2', label: '2' },
    { key: '3', label: '3' },
    { key: '4', label: '4' },
    { key: '5', label: '5' },
    { key: '6', label: '6' },
    { key: '7', label: '7' },
    { key: '8', label: '8' },
    { key: '9', label: '9' },
    { key: '.', label: fractionDigits > 0 ? decimal : '' },
    { key: '0', label: '0' },
    { key: 'back', label: 'Delete', ariaLabel: 'Delete last digit' },
  ]

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close expense sheet"
        onClick={onClose}
        className="sheet-backdrop animate-fade-in absolute inset-0 h-full w-full"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'Edit expense' : 'Add expense'}
        className="animate-sheet-in absolute inset-x-0 bottom-0 mx-auto w-full max-w-[560px]"
      >
        <div className="sheet-glass flex max-h-[94dvh] flex-col rounded-t-[30px] border-t border-separator shadow-[0_-20px_60px_rgba(0,0,0,0.25)]">
          <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-[var(--tertiary-label)]" />

          <div className="grid shrink-0 grid-cols-3 items-center px-4 pb-1 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="justify-self-start px-2 py-2 text-[16px] font-medium text-accent"
            >
              Cancel
            </button>
            <p className="text-center text-[16px] font-semibold">
              {isEdit ? 'Edit Expense' : 'New Expense'}
            </p>
            {isEdit ? (
              <button
                type="button"
                onClick={() => void remove()}
                disabled={saving || deleting}
                aria-label="Delete expense"
                className="pressable flex h-10 w-10 items-center justify-center justify-self-end rounded-full text-negative active:bg-surface-2 disabled:opacity-40"
              >
                {deleting ? (
                  <span className="text-[13px] font-medium">…</span>
                ) : (
                  <Trash2 size={19} />
                )}
              </button>
            ) : (
              <span aria-hidden="true" />
            )}
          </div>

          <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-5 pb-2">
            <div className="py-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.9px] text-secondary">
                Amount
              </p>
              <div className="mt-1 flex max-w-full items-baseline justify-center gap-1.5 overflow-hidden px-2">
                <span className="shrink-0 text-[26px] font-semibold text-secondary">
                  {currencySymbol(currency, locale)}
                </span>
                <span
                  className={`amount-tabular overflow-hidden text-ellipsis whitespace-nowrap text-[50px] font-bold leading-none tracking-[-2px] ${
                    amount ? 'text-label' : 'text-tertiary'
                  }`}
                >
                  {groupAmountEntry(amount, locale)}
                </span>
              </div>
            </div>

            <div className="-mx-5 mt-1">
              <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-1">
                {visibleCategories.map((category) => {
                  const selected = category.id === categoryId
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(category.id)}
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
            </div>

            <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
              <label className="relative flex h-11 items-center gap-2 rounded-[12px] bg-surface-2 px-3 text-[14px] font-medium">
                <Calendar size={16} className="text-secondary" />
                <span>{dateFieldLabel(date)}</span>
                <input
                  type="date"
                  value={date}
                  max={todayISO()}
                  aria-label="Expense date"
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

            <div className="mt-5 grid select-none grid-cols-3 gap-2">
              {keypad.map(({ key, label, ariaLabel }) => {
                if (key === '.' && fractionDigits === 0) {
                  return <div key="decimal-placeholder" aria-hidden="true" />
                }
                return (
                  <button
                    key={key}
                    type="button"
                    aria-label={ariaLabel ?? label}
                    onClick={() => press(key)}
                    className="pressable flex h-[52px] items-center justify-center rounded-[16px] bg-surface-2 text-[23px] font-medium"
                  >
                    {key === 'back' ? <Delete size={22} /> : label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="shrink-0 px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-3">
            {error && (
              <p className="mb-2 text-center text-[13px] font-medium text-negative" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={!canSave}
              className="pressable h-[52px] w-full rounded-[16px] bg-accent text-[17px] font-semibold text-white disabled:bg-surface-2 disabled:text-tertiary"
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save expense'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
