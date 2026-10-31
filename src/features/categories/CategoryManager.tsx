import { ArrowDown, ArrowUp, ChevronRight, Plus, RotateCcw, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/database'
import { categoryTint } from '../../lib/colors'
import type { Category } from '../../types'
import { CategoryEditor } from './CategoryEditor'

interface CategoryManagerProps {
  onClose: () => void
}

type EditorState = { mode: 'new' } | { mode: 'edit'; category: Category } | null

function CategoryIcon({ category, muted = false }: { category: Category; muted?: boolean }) {
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[19px] ${
        muted ? 'opacity-50' : ''
      }`}
      style={{ backgroundColor: categoryTint(category.color) }}
      aria-hidden="true"
    >
      {category.emoji}
    </div>
  )
}

async function moveCategory(
  active: Category[],
  category: Category,
  delta: -1 | 1,
) {
  const index = active.findIndex((item) => item.id === category.id)
  const target = active[index + delta]
  if (!target) return

  const now = Date.now()
  await db.transaction('rw', db.categories, async () => {
    const current = await db.categories.get(category.id)
    const other = await db.categories.get(target.id)
    if (!current || !other) return
    await db.categories.update(current.id, {
      sortOrder: other.sortOrder,
      updatedAt: now,
    })
    await db.categories.update(other.id, {
      sortOrder: current.sortOrder,
      updatedAt: now,
    })
  })
}

async function restoreCategory(category: Category) {
  await db.categories.update(category.id, {
    archived: false,
    updatedAt: Date.now(),
  })
}

export function CategoryManager({ onClose }: CategoryManagerProps) {
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray(), [])
  const [reordering, setReordering] = useState(false)
  const [editor, setEditor] = useState<EditorState>(null)

  const active = (categories ?? []).filter((category) => !category.archived)
  const archived = (categories ?? []).filter((category) => category.archived)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (editor) setEditor(null)
      else onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editor, onClose])

  async function move(category: Category, delta: -1 | 1) {
    await moveCategory(active, category, delta)
  }

  async function restore(category: Category) {
    await restoreCategory(category)
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Categories"
      className="fixed inset-0 z-[60] flex flex-col bg-bg"
    >
      <header className="shrink-0 border-b border-separator bg-bg pt-[max(env(safe-area-inset-top),8px)]">
        <div className="mx-auto grid h-14 w-full max-w-[560px] grid-cols-3 items-center px-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close categories"
            className="pressable flex h-10 w-10 items-center justify-center justify-self-start rounded-full text-label active:bg-surface-2"
          >
            <X size={22} />
          </button>
          <h1 className="text-center text-[17px] font-semibold">Categories</h1>
          <button
            type="button"
            onClick={() => setReordering((value) => !value)}
            disabled={active.length < 2}
            className="justify-self-end rounded-full px-2 py-1.5 text-[15px] font-medium text-accent disabled:opacity-30"
          >
            {reordering ? 'Done' : 'Reorder'}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[560px] px-4 pb-[calc(env(safe-area-inset-bottom)+24px)]">
          <h2 className="mb-2 mt-6 px-1 text-[12px] font-semibold uppercase tracking-[0.7px] text-secondary">
            Active · {active.length}
          </h2>

          <div className="overflow-hidden rounded-[20px] bg-surface">
            {active.map((category, index) => (
              <div
                key={category.id}
                className={index > 0 ? 'border-t border-separator' : undefined}
              >
                {reordering ? (
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <CategoryIcon category={category} />
                    <p className="min-w-0 flex-1 truncate text-[15px] font-medium">
                      {category.name}
                    </p>
                    <button
                      type="button"
                      aria-label={`Move ${category.name} up`}
                      disabled={index === 0}
                      onClick={() => void move(category, -1)}
                      className="pressable flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 disabled:opacity-25"
                    >
                      <ArrowUp size={17} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${category.name} down`}
                      disabled={index === active.length - 1}
                      onClick={() => void move(category, 1)}
                      className="pressable flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 disabled:opacity-25"
                    >
                      <ArrowDown size={17} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditor({ mode: 'edit', category })}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-surface-2"
                  >
                    <CategoryIcon category={category} />
                    <p className="min-w-0 flex-1 truncate text-[15px] font-medium">
                      {category.name}
                    </p>
                    <ChevronRight size={17} className="shrink-0 text-tertiary" />
                  </button>
                )}
              </div>
            ))}

            {active.length === 0 && (
              <p className="px-4 py-6 text-center text-[14px] text-secondary">
                No active categories. Add one below.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setEditor({ mode: 'new' })}
            className="mt-3 flex w-full items-center gap-3 rounded-[20px] bg-surface px-4 py-3.5 text-left transition-colors active:bg-surface-2"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Plus size={20} />
            </span>
            <span className="text-[15px] font-medium text-accent">Add category</span>
          </button>

          {archived.length > 0 && (
            <section className="mt-7">
              <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.7px] text-secondary">
                Archived · {archived.length}
              </h2>
              <div className="overflow-hidden rounded-[20px] bg-surface">
                {archived.map((category, index) => (
                  <div
                    key={category.id}
                    className={index > 0 ? 'border-t border-separator' : undefined}
                  >
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <CategoryIcon category={category} muted />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium">{category.name}</p>
                        <p className="text-[12px] text-secondary">Hidden from new expenses</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void restore(category)}
                        aria-label={`Restore ${category.name}`}
                        className="pressable flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 text-[12px] font-semibold text-accent"
                      >
                        <RotateCcw size={13} />
                        Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <p className="px-2 pt-7 text-center text-[12px] leading-snug text-tertiary">
            Archiving hides a category from new expenses but keeps it on past ones.
            Nothing is deleted.
          </p>
        </div>
      </div>

      {editor && (
        <CategoryEditor
          category={editor.mode === 'edit' ? editor.category : undefined}
          activeCount={active.length}
          onClose={() => setEditor(null)}
        />
      )}
    </div>,
    document.body,
  )
}
