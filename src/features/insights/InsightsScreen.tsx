import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { ChevronLeft, ChevronRight, ChartPie } from 'lucide-react'
import { addMonths, endOfMonth, format, getDaysInMonth, startOfMonth } from 'date-fns'
import { db } from '../../db/database'
import { CATEGORY_HEX, categoryTint } from '../../lib/colors'
import {
  isCurrentMonth,
  monthKey,
  monthName,
  monthOfISO,
  monthYear,
  shiftMonth,
  toISO,
  todayISO,
} from '../../lib/dates'
import { formatMoney, getLocale } from '../../lib/money'
import type { Category, CategoryColor, Expense } from '../../types'

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

  const trendStart = toISO(startOfMonth(addMonths(month, -5)))
  const trendEnd = toISO(endOfMonth(month))
  const trendExpenses = useLiveQuery(
    () =>
      db.expenses
        .where('date')
        .between(trendStart, trendEnd, true, true)
        .filter((expense) => expense.deletedAt === null)
        .toArray(),
    [trendStart, trendEnd],
  )

  const currency = settings?.currency ?? 'USD'
  const locale = settings?.locale ?? getLocale()
  const selectedKey = monthKey(month)
  const categoryById = useMemo(
    () => new Map<string, Category>((categories ?? []).map((category) => [category.id, category])),
    [categories],
  )

  const selectedExpenses = useMemo(
    () => (trendExpenses ?? []).filter((expense) => expense.date.startsWith(selectedKey)),
    [trendExpenses, selectedKey],
  )
  const total = selectedExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const count = selectedExpenses.length

  const trend = useMemo(() => {
    const totals = new Map<string, number>()
    for (const expense of trendExpenses ?? []) {
      const key = expense.date.slice(0, 7)
      totals.set(key, (totals.get(key) ?? 0) + expense.amount)
    }

    return Array.from({ length: 6 }, (_, index) => {
      const date = addMonths(month, index - 5)
      const key = format(date, 'yyyy-MM')
      return {
        key,
        label: format(date, 'MMM'),
        total: totals.get(key) ?? 0,
      }
    })
  }, [month, trendExpenses])

  const maxTotal = Math.max(0, ...trend.map((item) => item.total))
  const largest = useMemo(
    () =>
      selectedExpenses.reduce<Expense | null>(
        (maximum, expense) => (!maximum || expense.amount > maximum.amount ? expense : maximum),
        null,
      ),
    [selectedExpenses],
  )

  const rows: CategoryRow[] = useMemo(() => {
    const totals = new Map<string, number>()
    for (const expense of selectedExpenses) {
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
  }, [selectedExpenses, categoryById, total])

  const current = isCurrentMonth(month)
  const daysInMonth = getDaysInMonth(month)
  const daysElapsed = current ? Number(todayISO().slice(8, 10)) : daysInMonth
  const dailyAverage = total > 0 ? Math.round(total / daysElapsed) : 0

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

      {trendExpenses === undefined ? (
        <div className="mt-5 px-4">
          <div className="h-56 animate-pulse rounded-[24px] bg-surface" />
        </div>
      ) : (
        <>
          {maxTotal > 0 && (
            <div className="mt-5 px-4">
              <div className="rounded-[24px] bg-surface p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-[13px] font-semibold text-secondary">Last 6 months</h2>
                  <span className="amount-tabular text-[12px] font-medium text-secondary">
                    {monthName(month)} · {formatMoney(total, currency, locale)}
                  </span>
                </div>
                <div className="mt-4 flex items-end gap-2">
                  {trend.map((item) => {
                    const selected = item.key === selectedKey
                    const height = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => onMonthChange(monthOfISO(`${item.key}-01`))}
                        aria-current={selected ? 'date' : undefined}
                        aria-label={`Show ${item.label} ${item.key.slice(0, 4)}, ${formatMoney(
                          item.total,
                          currency,
                          locale,
                        )}`}
                        className="flex min-w-0 flex-1 flex-col items-center gap-2"
                      >
                        <div className="flex h-28 w-full items-end justify-center">
                          <div
                            className={`w-full max-w-[26px] rounded-t-[6px] transition-colors ${
                              selected ? 'bg-accent' : 'bg-accent-soft'
                            }`}
                            style={{
                              height: `${item.total > 0 ? Math.max(height, 6) : 3}%`,
                            }}
                          />
                        </div>
                        <span
                          className={`text-[10px] font-medium ${
                            selected ? 'text-accent' : 'text-secondary'
                          }`}
                        >
                          {item.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {total > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-3 px-4">
              <div className="rounded-[20px] bg-surface p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.7px] text-secondary">
                  Daily average
                </p>
                <p className="amount-tabular mt-1 text-[22px] font-semibold">
                  {formatMoney(dailyAverage, currency, locale)}
                </p>
                <p className="mt-0.5 text-[11px] text-secondary">
                  {current
                    ? `Over ${daysElapsed} ${daysElapsed === 1 ? 'day' : 'days'}`
                    : `Over ${daysInMonth} days`}
                </p>
              </div>
              <div className="rounded-[20px] bg-surface p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.7px] text-secondary">
                  Largest
                </p>
                <p className="amount-tabular mt-1 text-[22px] font-semibold">
                  {largest ? formatMoney(largest.amount, currency, locale) : '—'}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-secondary">
                  {largest ? (categoryById.get(largest.categoryId)?.name ?? 'Uncategorized') : '—'}
                </p>
              </div>
            </div>
          )}

          {rows.length === 0 ? (
            <div className="mt-5 px-4">
              <div className="rounded-[24px] bg-surface px-6 py-9 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <ChartPie size={26} strokeWidth={1.9} />
                </div>
                <h2 className="mt-4 text-[19px] font-semibold">
                  No spending in {monthName(month)}
                </h2>
                <p className="mx-auto mt-1.5 max-w-[270px] text-[14px] leading-snug text-secondary">
                  Add an expense from Home, or choose another month from the chart.
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
        </>
      )}
    </div>
  )
}
