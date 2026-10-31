import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { db } from '../../db/database'
import { categoryTint } from '../../lib/colors'
import {
  currentMonthStart,
  dayLabel,
  isCurrentMonth,
  monthName,
  monthRange,
  monthYear,
  previousComparisonRange,
  shiftMonth,
} from '../../lib/dates'
import { formatMoney, getLocale } from '../../lib/money'
import type { Category, Expense } from '../../types'
import { InstallCard } from '../../components/InstallCard'

interface HomeScreenProps {
  month: Date
  onMonthChange: (month: Date) => void
  onAdd: () => void
}

interface DayGroup {
  date: string
  items: Expense[]
  total: number
}

function groupByDay(expenses: Expense[]): DayGroup[] {
  const grouped = new Map<string, Expense[]>()
  for (const expense of expenses) {
    const existing = grouped.get(expense.date)
    if (existing) existing.push(expense)
    else grouped.set(expense.date, [expense])
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => {
      items.sort((a, b) => b.createdAt - a.createdAt)
      return {
        date,
        items,
        total: items.reduce((sum, item) => sum + item.amount, 0),
      }
    })
}

export function HomeScreen({ month, onMonthChange, onAdd }: HomeScreenProps) {
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

  const comparison = previousComparisonRange(month)
  const previousTotal = useLiveQuery(
    async () => {
      const previousExpenses = await db.expenses
        .where('date')
        .between(comparison.start, comparison.end, true, true)
        .filter((expense) => expense.deletedAt === null)
        .toArray()
      return previousExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    },
    [comparison.start, comparison.end],
  )

  const currency = settings?.currency ?? 'USD'
  const locale = settings?.locale ?? getLocale()
  const categoryById = useMemo(
    () => new Map<string, Category>((categories ?? []).map((category) => [category.id, category])),
    [categories],
  )
  const groups = useMemo(() => groupByDay(expenses ?? []), [expenses])
  const total = useMemo(
    () => (expenses ?? []).reduce((sum, expense) => sum + expense.amount, 0),
    [expenses],
  )
  const count = expenses?.length ?? 0

  const showComparison = total > 0 && (previousTotal ?? 0) > 0
  const percentChange =
    showComparison && previousTotal
      ? Math.round(((total - previousTotal) / previousTotal) * 100)
      : 0
  const isUp = percentChange > 0
  const current = isCurrentMonth(month)

  return (
    <div>
      <header className="px-4 pt-[max(env(safe-area-inset-top),16px)]">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => onMonthChange(shiftMonth(month, -1))}
            className="pressable flex h-11 w-11 items-center justify-center rounded-full text-label active:bg-surface-2"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="select-none text-center">
            <h1 className="text-[32px] font-semibold leading-none tracking-[-0.8px]">
              {monthName(month)}
            </h1>
            <p className="mt-1 text-[13px] font-medium text-secondary">{monthYear(month)}</p>
          </div>

          <button
            type="button"
            aria-label="Next month"
            onClick={() => onMonthChange(shiftMonth(month, 1))}
            disabled={current}
            className="pressable flex h-11 w-11 items-center justify-center rounded-full text-label active:bg-surface-2 disabled:opacity-20"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {!current && (
          <div className="mt-1 flex justify-center">
            <button
              type="button"
              onClick={() => onMonthChange(currentMonthStart())}
              className="rounded-full bg-surface-2 px-3 py-1 text-[12px] font-medium text-secondary"
            >
              Back to this month
            </button>
          </div>
        )}
      </header>

      <section className="px-5 pt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.9px] text-secondary">
          Total spent
        </p>
        <p className="amount-tabular mt-1.5 overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(2.15rem,10vw,2.75rem)] font-bold leading-none tracking-[-1.4px]">
          {formatMoney(total, currency, locale)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
          <span className="font-medium text-secondary">
            {count} {count === 1 ? 'expense' : 'expenses'}
          </span>
          {showComparison && (
            <>
              <span className="text-tertiary">·</span>
              <span
                className={`inline-flex items-center gap-0.5 font-medium ${
                  isUp ? 'text-negative' : percentChange < 0 ? 'text-positive' : 'text-secondary'
                }`}
              >
                {isUp && <TrendingUp size={13} strokeWidth={2.2} />}
                {percentChange < 0 && <TrendingDown size={13} strokeWidth={2.2} />}
                {percentChange === 0
                  ? 'Same as last month'
                  : `${Math.abs(percentChange)}% ${isUp ? 'more' : 'less'}`}
              </span>
              <span className="text-secondary">
                {current ? 'vs. this point last month' : 'vs. last month'}
              </span>
            </>
          )}
        </div>
      </section>

      <InstallCard />

      {expenses === undefined ? (
        <div className="mt-7 px-4">
          <div className="h-44 animate-pulse rounded-[22px] bg-surface" />
        </div>
      ) : groups.length === 0 ? (
        <div className="mt-7 px-4">
          <div className="rounded-[24px] bg-surface px-6 py-9 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
              <ReceiptText size={26} strokeWidth={1.9} />
            </div>
            <h2 className="mt-4 text-[19px] font-semibold">
              {current ? 'No expenses yet' : `Nothing in ${monthName(month)}`}
            </h2>
            <p className="mx-auto mt-1.5 max-w-[270px] text-[14px] leading-snug text-secondary">
              {current
                ? 'Add your first expense and your month will start to take shape.'
                : 'Add an expense for this month, or head back to today.'}
            </p>
            <button
              type="button"
              onClick={onAdd}
              className="pressable mt-5 inline-flex h-11 items-center justify-center rounded-full bg-accent px-6 text-[15px] font-semibold text-white"
            >
              Add expense
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-7 px-4">
          {groups.map((group) => (
            <section key={group.date} className="mb-5">
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="text-[13px] font-semibold text-secondary">
                  {dayLabel(group.date)}
                </h2>
                <span className="amount-tabular text-[13px] font-medium text-secondary">
                  {formatMoney(group.total, currency, locale)}
                </span>
              </div>
              <div className="overflow-hidden rounded-[20px] bg-surface">
                {group.items.map((expense, index) => {
                  const category = categoryById.get(expense.categoryId)
                  return (
                    <div
                      key={expense.id}
                      className={index > 0 ? 'border-t border-separator' : undefined}
                    >
                      <div className="flex items-center gap-3 px-3.5 py-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[19px]"
                          style={{
                            backgroundColor: category
                              ? categoryTint(category.color)
                              : 'var(--surface-2)',
                          }}
                          aria-hidden="true"
                        >
                          {category?.emoji ?? '🧾'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[16px] font-medium">
                            {category?.name ?? 'Uncategorized'}
                          </p>
                          {expense.note && (
                            <p className="truncate text-[13px] text-secondary">{expense.note}</p>
                          )}
                        </div>
                        <p className="amount-tabular shrink-0 text-[16px] font-semibold">
                          {formatMoney(expense.amount, currency, locale)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
