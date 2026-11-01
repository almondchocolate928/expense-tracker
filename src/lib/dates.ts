import {
  addMonths,
  endOfMonth,
  format,
  getDaysInMonth,
  isSameMonth,
  isToday,
  isYesterday,
  startOfMonth,
} from 'date-fns'

/** Build a local Date from YYYY-MM-DD. Never use `new Date("YYYY-MM-DD")`. */
export function isoToLocalDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function toISO(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function todayISO(): string {
  return toISO(new Date())
}

export function currentMonthStart(): Date {
  return startOfMonth(new Date())
}

export function monthStart(date: Date): Date {
  return startOfMonth(date)
}

export function shiftMonth(month: Date, delta: number): Date {
  return startOfMonth(addMonths(month, delta))
}

export function monthRange(month: Date): { start: string; end: string } {
  return {
    start: toISO(startOfMonth(month)),
    end: toISO(endOfMonth(month)),
  }
}

export function monthOfISO(iso: string): Date {
  return startOfMonth(isoToLocalDate(iso))
}

export function monthName(month: Date): string {
  return format(month, 'MMMM')
}

export function monthYear(month: Date): string {
  return format(month, 'yyyy')
}

export function isCurrentMonth(month: Date): boolean {
  return isSameMonth(month, new Date())
}

export function monthKey(month: Date): string {
  return format(month, 'yyyy-MM')
}

export function dayLabel(iso: string): string {
  const date = isoToLocalDate(iso)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  if (date.getFullYear() === new Date().getFullYear()) {
    return format(date, 'EEE, MMM d')
  }
  return format(date, 'MMM d, yyyy')
}

export function dateFieldLabel(iso: string): string {
  const date = isoToLocalDate(iso)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'MMM d, yyyy')
}

export function expenseDateDefault(month: Date): string {
  return isCurrentMonth(month) ? todayISO() : toISO(endOfMonth(month))
}

/**
 * Range used for "vs last month". For the current month we compare against the
 * same number of elapsed days in the previous month; past months compare fully.
 */
export function previousComparisonRange(month: Date): {
  start: string
  end: string
  partial: boolean
} {
  const now = new Date()
  const target = startOfMonth(month)
  const previous = addMonths(target, -1)

  if (isSameMonth(target, now)) {
    const days = Math.min(now.getDate(), getDaysInMonth(previous))
    return {
      start: toISO(previous),
      end: toISO(new Date(previous.getFullYear(), previous.getMonth(), days)),
      partial: true,
    }
  }

  return {
    start: toISO(previous),
    end: toISO(endOfMonth(previous)),
    partial: false,
  }
}

export function isBackupStale(lastBackupAt: number | null, days = 30): boolean {
  if (lastBackupAt === null) return true
  return Date.now() - lastBackupAt > days * 24 * 60 * 60 * 1000
}
