import Dexie, { type EntityTable } from 'dexie'
import type { Category, Expense, ImportMarker, Settings } from '../types'
import { defaultCategories, defaultSettings } from './seed'

class ExpenseTrackerDatabase extends Dexie {
  expenses!: EntityTable<Expense, 'id'>
  categories!: EntityTable<Category, 'id'>
  settings!: EntityTable<Settings, 'key'>
  imports!: EntityTable<ImportMarker, 'externalId'>

  constructor() {
    super('expense-tracker')

    this.version(1).stores({
      expenses: 'id, date, categoryId, updatedAt, deletedAt',
      categories: 'id, sortOrder, archived',
      settings: 'key',
    })

    this.version(2).stores({
      imports: 'externalId, importedAt',
    })

    this.on('populate', () => this.seed())
  }

  private async seed(): Promise<void> {
    await this.categories.bulkAdd(defaultCategories())
    await this.settings.add(defaultSettings())
  }
}

export const db = new ExpenseTrackerDatabase()

/** Best-effort request to protect storage from eviction. */
export async function requestPersistentStorage(): Promise<void> {
  try {
    await navigator.storage?.persist?.()
  } catch {
    // Persistence is a bonus, not a guarantee.
  }
}
