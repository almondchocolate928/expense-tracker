import { X } from 'lucide-react'

interface UndoToastProps {
  message: string
  onUndo: () => void
  onDismiss: () => void
}

export function UndoToast({ message, onUndo, onDismiss }: UndoToastProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+94px)] z-[80] flex justify-center px-4">
      <div className="animate-toast-in pointer-events-auto flex w-full max-w-[520px] items-center gap-2 rounded-[16px] border border-white/10 bg-[#1c1c1e] px-4 py-2.5 text-white shadow-[0_14px_40px_rgba(0,0,0,0.35)]" role="status">
        <p className="min-w-0 flex-1 truncate text-[14px] font-medium">{message}</p>
        <button
          type="button"
          onClick={onUndo}
          className="shrink-0 rounded-full px-2.5 py-1.5 text-[14px] font-semibold text-[#0a84ff] active:bg-white/10"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/60 active:bg-white/10"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
