export type CategoryColor =
  | 'orange'
  | 'green'
  | 'blue'
  | 'pink'
  | 'purple'
  | 'red'
  | 'teal'
  | 'yellow'
  | 'gray'

export interface Category {
  id: string
  name: string
  emoji: string
  color: CategoryColor
  sortOrder: number
  archived: boolean
  createdAt: number
  updatedAt: number
}

export interface Expense {
  id: string
  /** Integer amount in the currency's minor unit (cents, pence, yen...). */
  amount: number
  categoryId: string
  /** Local calendar date, YYYY-MM-DD. Never a UTC timestamp. */
  date: string
  note: string
  createdAt: number
  updatedAt: number
  /** Soft delete so Undo and future sync can work. */
  deletedAt: number | null
}

export type ThemePreference = 'system' | 'light' | 'dark'

export interface Settings {
  key: 'app'
  currency: string
  locale: string
  theme: ThemePreference
  lastBackupAt: number | null
  schemaVersion: number
}

export type Tab = 'home' | 'insights' | 'settings'
