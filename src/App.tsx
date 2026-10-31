import { Plus } from 'lucide-react'
import { useState } from 'react'
import { TabBar } from './components/TabBar'
import { UpdatePrompt } from './components/UpdatePrompt'
import { AddExpenseSheet } from './features/expenses/AddExpenseSheet'
import { HomeScreen } from './features/home/HomeScreen'
import { InsightsScreen } from './features/insights/InsightsScreen'
import { SettingsScreen } from './features/settings/SettingsScreen'
import { currentMonthStart, monthOfISO } from './lib/dates'
import type { Tab } from './types'

function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [month, setMonth] = useState(() => currentMonthStart())
  const [addOpen, setAddOpen] = useState(false)

  function handleSaved(date: string) {
    setAddOpen(false)
    setMonth(monthOfISO(date))
  }

  return (
    <div className="min-h-dvh">
      <main className="mx-auto min-h-dvh w-full max-w-[560px] pb-[calc(env(safe-area-inset-bottom)+112px)] min-[600px]:border-x min-[600px]:border-separator">
        <div key={tab} className="animate-fade-in">
          {tab === 'home' && (
            <HomeScreen month={month} onMonthChange={setMonth} onAdd={() => setAddOpen(true)} />
          )}
          {tab === 'insights' && (
            <InsightsScreen month={month} onMonthChange={setMonth} />
          )}
          {tab === 'settings' && <SettingsScreen />}
        </div>
      </main>

      {tab !== 'settings' && !addOpen && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
          <div className="mx-auto flex w-full max-w-[560px] justify-end px-4 pb-[calc(env(safe-area-inset-bottom)+84px)]">
            <button
              type="button"
              aria-label="Add expense"
              onClick={() => setAddOpen(true)}
              className="pressable pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-[0_10px_30px_rgba(10,132,255,0.42)]"
            >
              <Plus size={27} strokeWidth={2.3} />
            </button>
          </div>
        </div>
      )}

      {!addOpen && <TabBar active={tab} onChange={setTab} />}

      {addOpen && (
        <AddExpenseSheet
          month={month}
          onClose={() => setAddOpen(false)}
          onSaved={handleSaved}
        />
      )}

      <UpdatePrompt />
    </div>
  )
}

export default App
