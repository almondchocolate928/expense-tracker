import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { TabBar } from './components/TabBar'
import { UndoToast } from './components/UndoToast'
import { UpdatePrompt } from './components/UpdatePrompt'
import { db } from './db/database'
import { AddExpenseSheet } from './features/expenses/AddExpenseSheet'
import { HomeScreen } from './features/home/HomeScreen'
import { InsightsScreen } from './features/insights/InsightsScreen'
import { SettingsScreen } from './features/settings/SettingsScreen'
import { currentMonthStart, monthOfISO } from './lib/dates'
import type { Expense, Tab } from './types'

type SheetState = { mode: 'new' } | { mode: 'edit'; expense: Expense }

interface ToastState {
  message: string
  onUndo: () => void
}

function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [month, setMonth] = useState(() => currentMonthStart())
  const [sheet, setSheet] = useState<SheetState | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 6000)
    return () => window.clearTimeout(timer)
  }, [toast])

  function openSheet(next: SheetState) {
    setToast(null)
    setSheet(next)
  }

  function handleSaved(date: string) {
    setSheet(null)
    setMonth(monthOfISO(date))
  }

  async function undoDelete(expense: Expense) {
    try {
      await db.expenses.update(expense.id, {
        deletedAt: null,
        updatedAt: Date.now(),
      })
      setMonth(monthOfISO(expense.date))
      setToast(null)
    } catch {
      // Keep the toast visible so the user can try again.
    }
  }

  function handleDeleted(expense: Expense) {
    setSheet(null)
    setToast({
      message: 'Expense deleted',
      onUndo: () => void undoDelete(expense),
    })
  }

  return (
    <div className="min-h-dvh">
      <main className="mx-auto min-h-dvh w-full max-w-[560px] pb-[calc(env(safe-area-inset-bottom)+112px)] min-[600px]:border-x min-[600px]:border-separator">
        <div key={tab} className="animate-fade-in">
          {tab === 'home' && (
            <HomeScreen
              month={month}
              onMonthChange={setMonth}
              onAdd={() => openSheet({ mode: 'new' })}
              onEdit={(expense) => openSheet({ mode: 'edit', expense })}
            />
          )}
          {tab === 'insights' && (
            <InsightsScreen month={month} onMonthChange={setMonth} />
          )}
          {tab === 'settings' && <SettingsScreen />}
        </div>
      </main>

      {tab !== 'settings' && !sheet && !toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
          <div className="mx-auto flex w-full max-w-[560px] justify-end px-4 pb-[calc(env(safe-area-inset-bottom)+84px)]">
            <button
              type="button"
              aria-label="Add expense"
              onClick={() => openSheet({ mode: 'new' })}
              className="pressable pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-[0_10px_30px_rgba(10,132,255,0.42)]"
            >
              <Plus size={27} strokeWidth={2.3} />
            </button>
          </div>
        </div>
      )}

      {!sheet && <TabBar active={tab} onChange={setTab} />}

      {sheet && (
        <AddExpenseSheet
          month={month}
          expense={sheet.mode === 'edit' ? sheet.expense : undefined}
          onClose={() => setSheet(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}

      {toast && (
        <UndoToast
          message={toast.message}
          onUndo={toast.onUndo}
          onDismiss={() => setToast(null)}
        />
      )}

      <UpdatePrompt />
    </div>
  )
}

export default App
