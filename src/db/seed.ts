import { detectCurrency, getLocale } from '../lib/money'
import type { Category, Settings } from '../types'

/** Fixed IDs make the defaults stable across launches and future syncs. */
export function defaultCategories(): Category[] {
  const now = Date.now()
  const base = { createdAt: now, updatedAt: now, archived: false }

  return [
    { ...base, id: 'cat-food', name: 'Food & Drink', emoji: '🍔', color: 'orange', sortOrder: 0 },
    { ...base, id: 'cat-groceries', name: 'Groceries', emoji: '🛒', color: 'green', sortOrder: 1 },
    { ...base, id: 'cat-transport', name: 'Transport', emoji: '🚕', color: 'blue', sortOrder: 2 },
    { ...base, id: 'cat-shopping', name: 'Shopping', emoji: '🛍️', color: 'pink', sortOrder: 3 },
    { ...base, id: 'cat-bills', name: 'Bills & Utilities', emoji: '🧾', color: 'purple', sortOrder: 4 },
    { ...base, id: 'cat-health', name: 'Health', emoji: '💊', color: 'red', sortOrder: 5 },
    { ...base, id: 'cat-entertainment', name: 'Entertainment', emoji: '🎬', color: 'teal', sortOrder: 6 },
    { ...base, id: 'cat-home', name: 'Home', emoji: '🏠', color: 'yellow', sortOrder: 7 },
    { ...base, id: 'cat-other', name: 'Other', emoji: '📦', color: 'gray', sortOrder: 8 },
  ]
}

export function defaultSettings(): Settings {
  const locale = getLocale()
  return {
    key: 'app',
    currency: detectCurrency(locale),
    locale,
    theme: 'system',
    lastBackupAt: null,
    schemaVersion: 1,
  }
}
