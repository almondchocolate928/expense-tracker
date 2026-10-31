import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { ChevronLeft, ChevronRight, ChartPie, Sparkles } from 'lucide-react'
import { db } from '../../db/database'
import { CATEGORY_HEX, categoryTint } from '../../lib/colors'
import {
  isCurrentMonth,
  monthName,
  monthRange,
  monthYear,
  shiftMonth,
} from '../../lib/dates'
import { formatMoney, getLocale } from '../../lib/money'
import type { Category, CategoryColor } from '../../types'

interface InsightsScreenProps {
  month: Date
  onMonthChange: (month: Date) => void
}

interface CategoryRow {
  id: string
  name: string
  emoji: string
  color: CategoryColor
  amount: number
  percent: number
}

export function InsightsScreen({ month, onMonthChange }: InsightsScreenProps) {
  const settings = useLiveQuery(() => db.settings.get('app'), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])
  const { start, end } = monthRange(month)
  const expenses = useLiveQuery(
    () =>
      db.expenses
        .where('date')
        .between(start, end, true, true)
        .filter((expense) => expense.deletedAt === null)
        .toArray(),
    [start, end],
  )

  const currency = settings?.currency ?? 'USD'
  const locale = settings?.locale ?? getLocale()
  const categoryById = useMemo(
    () => new Map<string, Category>((categories ?? []).map((category) => [category.id, category])),
    [categories],
  )

  const total = (expenses ?? []).reduce((sum, expense) => sum + expense.amount, 0)
  const count = expenses?.length ?? 0

  const rows: CategoryRow[] = useMemo(() => {
    const totals = new Map<string, number>()
    for (const expense of expenses ?? []) {
      totals.set(expense.categoryId, (totals.get(expense.categoryId) ?? 0) + expense.amount)
    }

    return [...totals.entries()]
      .map(([id, amount]) => {
        const category = categoryById.get(id)
        return {
          id,
          name: category?.name ?? 'Uncategorized',
          emoji: category?.emoji ?? '🧾',
          color: category?.color ?? 'gray',
          amount,
          percent: total > 0 ? (amount / total) * 100 : 0,
        }
      })
      .sort((a, b) => b.amount - a.amount)
  }, [expenses, categoryById, total])

  const current = isCurrentMonth(month)

  return (
    <div>
      <header className="px-5 pt-[max(env(safe-area-inset-top),18px)]">
        <h1 className="text-[34px] font-bold tracking-[-1px]">Insights</h1>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center rounded-full bg-surface-2 p-0.5">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => onMonthChange(shiftMonth(month, -1))}
              className="pressable flex h-8 w-8 items-center justify-center rounded-full text-label active:bg-surface"
            >
              <ChevronLeft size={17} />
            </button>
            <span className="min-w-[112px] px-1 text-center text-[13px] font-semibold">
              {monthName(month)} {monthYear(month)}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => onMonthChange(shiftMonth(month, 1))}
              disabled={current}
              className="pressable flex h-8 w-8 items-center justify-center rounded-full text-label active:bg-surface disabled:opacity-20"
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <span className="text-[12px] font-medium text-secondary">
            {count} {count === 1 ? 'expense' : 'expenses'}
          </span>
        </div>
      </header>

      <div className="mt-5 px-4">
        <div className="rounded-[24px] bg-surface p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.9px] text-secondary">
            Spent in {monthName(month)}
          </p>
          <p className="amount-tabular mt-1.5 overflow-hidden text-ellipsis whitespace-nowrap text-[36px] font-bold leading-none tracking-[-1.3px]">
            {formatMoney(total, currency, locale)}
          </p>
          <p className="mt-2 text-[13px] text-secondary">
            {rows.length === 0
              ? 'No spending recorded yet.'
              : `Across ${rows.length} ${rows.length === 1 ? 'category' : 'categories'}.`}
          </p>
        </div>
      </div>

      {expenses === undefined ? (
        <div className="mt-5 px-4">
          <div className="h-56 animate-pulse rounded-[24px] bg-surface" />
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-5 px-4">
          <div className="rounded-[24px] bg-surface px-6 py-9 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
              <ChartPie size={26} strokeWidth={1.9} />
            </div>
            <h2 className="mt-4 text-[19px] font-semibold">No breakdown yet</h2>
            <p className="mx-auto mt-1.5 max-w-[270px] text-[14px] leading-snug text-secondary">
              Add an expense and this month's categories will show up here.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-5 px-4">
          <h2 className="mb-2 px-1 text-[13px] font-semibold text-secondary">
            By category
          </h2>
          <div className="rounded-[24px] bg-surface px-4">
            {rows.map((row, index) => (
              <div
                key={row.id}
                className={`py-3.5 ${index > 0 ? 'border-t border-separator' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[19px]"
                    style={{ backgroundColor: categoryTint(row.color) }}
                    aria-hidden="true"
                  >
                    {row.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{row.name}</p>
                    <p className="amount-tabular text-[12px] text-secondary">
                      {Math.round(row.percent)}% of month
                    </p>
                  </div>
                  <p className="amount-tabular shrink-0 text-[15px] font-semibold">
                    {formatMoney(row.amount, currency, locale)}
                  </p>
                </div>
                <div className="ml-[52px] mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(row.percent, 2)}%`,
                      backgroundColor: CATEGORY_HEX[row.color],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 px-4">
        <div className="flex gap-3 rounded-[20px] border border-dashed border-separator p-4">
          <Sparkles size={18} className="mt-0.5 shrink-0 text-accent" />
          <p className="text-[13px] leading-snug text-secondary">
            Six-month trends and daily averages arrive in the next build. Category breakdown
            is live now.
          </p>
        </div>
      </div>
    </div>
  )
}
