import { Download, RotateCcw } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { BackupFile } from '../../db/backup'

interface RestoreConfirmProps {
  backup: BackupFile
  fileName: string
  locale: string
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}

function formatExportedAt(value: string, locale: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'an unknown date'
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function RestoreConfirm({
  backup,
  fileName,
  locale,
  busy,
  onCancel,
  onConfirm,
}: RestoreConfirmProps) {
  const expenseCount = backup.expenses.filter((expense) => expense.deletedAt === null).length

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onCancel()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [busy, onCancel])

  return createPortal(
    <div className="fixed inset-0 z-[75]">
      <button
        type="button"
        aria-label="Cancel restore"
        onClick={() => {
          if (!busy) onCancel()
        }}
        className="sheet-backdrop animate-fade-in absolute inset-0 h-full w-full"
        disabled={busy}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Restore backup"
        className="animate-sheet-in absolute inset-x-0 bottom-0 mx-auto w-full max-w-[560px]"
      >
        <div className="sheet-glass rounded-t-[30px] border-t border-separator px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-2.5 shadow-[0_-20px_60px_rgba(0,0,0,0.25)]">
          <div className="mx-auto h-1 w-9 rounded-full bg-[var(--tertiary-label)]" />

          <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-negative/10 text-negative">
            <RotateCcw size={22} />
          </div>
          <h2 className="mt-3 text-[20px] font-semibold">Restore this backup?</h2>
          <p className="mt-1 text-[14px] leading-snug text-secondary">
            This replaces all expenses and categories currently on this device.
          </p>

          <div className="mt-4 rounded-[16px] bg-surface-2 p-3">
            <p className="truncate text-[13px] font-medium">{fileName}</p>
            <p className="mt-1 text-[12px] text-secondary">
              {expenseCount} {expenseCount === 1 ? 'expense' : 'expenses'} ·{' '}
              {backup.categories.length}{' '}
              {backup.categories.length === 1 ? 'category' : 'categories'} · exported{' '}
              {formatExportedAt(backup.exportedAt, locale)}
            </p>
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-[14px] bg-accent-soft p-3 text-[12px] leading-snug text-accent">
            <Download size={15} className="mt-0.5 shrink-0" />
            <span>A safety copy of your current data will be downloaded first.</span>
          </div>

          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="pressable mt-4 h-12 w-full rounded-[16px] bg-negative text-[16px] font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Restoring…' : 'Restore backup'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="pressable mt-2 h-11 w-full rounded-[14px] text-[15px] font-medium text-accent active:bg-surface-2 disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
