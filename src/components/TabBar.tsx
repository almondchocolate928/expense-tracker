import { ChartPie, House, Settings2, type LucideIcon } from 'lucide-react'
import type { Tab } from '../types'

const TABS: Array<{ id: Tab; label: string; Icon: LucideIcon }> = [
  { id: 'home', label: 'Home', Icon: House },
  { id: 'insights', label: 'Insights', Icon: ChartPie },
  { id: 'settings', label: 'Settings', Icon: Settings2 },
]

interface TabBarProps {
  active: Tab
  onChange: (tab: Tab) => void
}

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
      <nav
        aria-label="Primary"
        className="mx-auto w-full max-w-[560px] px-3 pb-[max(env(safe-area-inset-bottom),10px)]"
      >
        <div className="tabbar-glass pointer-events-auto flex h-[62px] items-stretch rounded-[24px] border border-separator px-1.5">
          {TABS.map(({ id, label, Icon }) => {
            const selected = active === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange(id)}
                aria-current={selected ? 'page' : undefined}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[18px] text-[10px] font-medium transition-colors duration-150 ${
                  selected ? 'text-accent' : 'text-secondary'
                }`}
              >
                <Icon size={22} strokeWidth={selected ? 2.2 : 1.9} />
                <span>{label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
