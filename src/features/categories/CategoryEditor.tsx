import { Check } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { db, requestPersistentStorage } from '../../db/database'
import { CATEGORY_HEX, categoryTint } from '../../lib/colors'
import { newId } from '../../lib/id'
import type { Category, CategoryColor } from '../../types'

const EMOJIS = [
  '🍔',
  '🛒',
  '🚕',
  '🛍️',
  '🧾',
  '💊',
  '🎬',
  '🏠',
  '📦',
  '☕',
  '🍕',
  '🚌',
  '⛽',
  '🎧',
  '💻',
  '✈️',
  '🎁',
  '🐾',
  '👶',
  '📚',
  '💪',
  '🧹',
  '🎵',
  '💡',
]

const COLORS: CategoryColor[] = [
  'orange',
  'green',
  'blue',
  'pink',
  'purple',
  'red',
  'teal',
  'yellow',
  'gray',
]

interface CategoryEditorProps {
  category?: Category
  activeCount: number
  onClose: () => void
}

export function CategoryEditor({ category, activeCount, onClose }: CategoryEditorProps) {
  const isEdit = category !== undefined
  const [name, setName] = useState(category?.name ?? '')
  const [emoji, setEmoji] = useState(category?.emoji ?? '📦')
  const [color, setColor] = useState<CategoryColor>(category?.color ?? 'gray')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmedName = name.trim()
  const canSave = trimmedName.length > 0 && !saving
  const canArchive = isEdit && activeCount > 1

  async function save() {
    if (!canSave) return
    setSaving(true)
    setError(null)

    try {
      const now = Date.now()
      if (category) {
        await db.categories.update(category.id, {
          name: trimmedName,
          emoji,
          color,
          updatedAt: now,
        })
      } else {
        const all = await db.categories.toArray()
        const maxSortOrder = all.reduce(
          (maximum, item) => Math.max(maximum, item.sortOrder),
          -1,
        )
        await db.categories.add({
          id: newId(),
          name: trimmedName,
          emoji,
          color,
          sortOrder: maxSortOrder + 1,
          archived: false,
          createdAt: now,
          updatedAt: now,
        })
      }
      void requestPersistentStorage()
      onClose()
    } catch {
      setSaving(false)
      setError('Could not save this category. Please try again.')
    }
  }

  async function archive() {
    if (!category || !canArchive || saving) return
    setSaving(true)
    setError(null)

    try {
      await db.categories.update(category.id, {
        archived: true,
        updatedAt: Date.now(),
      })
      onClose()
    } catch {
      setSaving(false)
      setError('Could not archive this category. Please try again.')
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        aria-label="Close category editor"
        onClick={onClose}
        className="sheet-backdrop animate-fade-in absolute inset-0 h-full w-full"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'Edit category' : 'New category'}
        className="animate-sheet-in absolute inset-x-0 bottom-0 mx-auto w-full max-w-[560px]"
      >
        <div className="sheet-glass flex max-h-[92dvh] flex-col rounded-t-[30px] border-t border-separator shadow-[0_-20px_60px_rgba(0,0,0,0.25)]">
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
              {isEdit ? 'Edit Category' : 'New Category'}
            </p>
            <span aria-hidden="true" />
          </div>

          <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-5 pb-2">
            <div className="flex flex-col items-center py-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full text-[30px]"
                style={{ backgroundColor: categoryTint(color) }}
                aria-hidden="true"
              >
                {emoji}
              </div>
              <p className="mt-2 text-[15px] font-medium text-secondary">
                {trimmedName || 'Category name'}
              </p>
            </div>

            <label htmlFor="category-name" className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.9px] text-secondary">
                Name
              </span>
              <input
                id="category-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Coffee"
                maxLength={30}
                autoFocus={!isEdit}
                autoComplete="off"
                enterKeyHint="done"
                className="mt-1.5 h-12 w-full rounded-[12px] bg-surface-2 px-3.5 text-[16px] placeholder:text-tertiary"
              />
            </label>

            <div className="mt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.9px] text-secondary">
                Icon
              </p>
              <div className="mt-2 grid grid-cols-6 gap-2">
                {EMOJIS.map((option) => {
                  const selected = option === emoji
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-label={`Choose emoji ${option}`}
                      aria-pressed={selected}
                      onClick={() => setEmoji(option)}
                      className={`flex h-11 items-center justify-center rounded-[12px] text-[22px] transition-colors ${
                        selected ? 'bg-accent-soft ring-2 ring-accent' : 'bg-surface-2'
                      }`}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.9px] text-secondary">
                Color
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {COLORS.map((option) => {
                  const selected = option === color
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-label={`Choose ${option} color`}
                      aria-pressed={selected}
                      onClick={() => setColor(option)}
                      className={`flex h-10 w-10 items-center justify-center rounded-full transition-transform ${
                        selected ? 'scale-110' : ''
                      }`}
                      style={{ backgroundColor: CATEGORY_HEX[option] }}
                    >
                      {selected && (
                        <Check
                          size={20}
                          strokeWidth={3}
                          className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
                        />
                      )}
                    </button>
                  )
                })}
              </div>
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
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add category'}
            </button>
            {isEdit && (
              <>
                <button
                  type="button"
                  onClick={() => void archive()}
                  disabled={!canArchive || saving}
                  className="pressable mt-2 h-[44px] w-full rounded-[14px] text-[15px] font-medium text-negative active:bg-surface-2 disabled:opacity-40"
                >
                  Archive category
                </button>
                {!canArchive && (
                  <p className="mt-1 text-center text-[11px] text-secondary">
                    Keep at least one active category.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
