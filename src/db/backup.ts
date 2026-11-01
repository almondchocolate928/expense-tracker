import { format } from 'date-fns'
import { z } from 'zod'
import { currencyFractionDigits } from '../lib/money'
import { db } from './database'

const CATEGORY_COLORS = [
  'orange',
  'green',
  'blue',
  'pink',
  'purple',
  'red',
  'teal',
  'yellow',
  'gray',
] as const

function isValidLocale(value: string): boolean {
  try {
    return Intl.DateTimeFormat.supportedLocalesOf([value]).length > 0
  } catch {
    return false
  }
}

function isValidISODate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  emoji: z.string().min(1),
  color: z.enum(CATEGORY_COLORS),
  sortOrder: z.number(),
  archived: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

const expenseSchema = z.object({
  id: z.string().min(1),
  amount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  categoryId: z.string().min(1),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(isValidISODate),
  note: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
})

const settingsSchema = z.object({
  key: z.literal('app'),
  currency: z.string().regex(/^[A-Z]{3}$/),
  locale: z.string().min(1).refine(isValidLocale),
  theme: z.enum(['system', 'light', 'dark']),
  lastBackupAt: z.number().nullable(),
  schemaVersion: z.number().int().nonnegative(),
})

const backupSchema = z
  .object({
    app: z.literal('expense-tracker'),
    schemaVersion: z.number().int().positive(),
    exportedAt: z.string(),
    settings: settingsSchema,
    categories: z.array(categorySchema).min(1),
    expenses: z.array(expenseSchema),
  })
  .refine((backup) => backup.categories.some((category) => !category.archived), {
    message: 'A backup must contain at least one active category.',
  })

export type BackupFile = z.infer<typeof backupSchema>

export const BACKUP_SCHEMA_VERSION = 1

function backupFileName(date = new Date()): string {
  return `expenses-backup-${format(date, 'yyyy-MM-dd')}.json`
}

function triggerDownload(contents: BlobPart, fileName: string, type: string): void {
  const blob = contents instanceof Blob ? contents : new Blob([contents], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function isShareCanceled(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export async function buildBackup(): Promise<BackupFile> {
  const [settings, categories, expenses] = await Promise.all([
    db.settings.get('app'),
    db.categories.toArray(),
    db.expenses.toArray(),
  ])

  if (!settings) throw new Error('Settings are missing.')
  if (categories.length === 0) throw new Error('There are no categories to back up.')

  return {
    app: 'expense-tracker',
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    categories,
    expenses,
  }
}

async function shareOrDownload(file: File, title: string): Promise<'shared' | 'downloaded'> {
  if (
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ title, files: [file] })
      return 'shared'
    } catch (error) {
      if (isShareCanceled(error)) throw error
      // Fall back to a regular download if sharing is unavailable.
    }
  }

  triggerDownload(file, file.name, file.type || 'application/json')
  return 'downloaded'
}

async function shareBackup(backup: BackupFile): Promise<'shared' | 'downloaded'> {
  const file = new File([JSON.stringify(backup, null, 2)], backupFileName(), {
    type: 'application/json',
  })
  return shareOrDownload(file, 'Expense Tracker backup')
}

export async function backUpNow(): Promise<'shared' | 'downloaded'> {
  const backup = await buildBackup()
  const method = await shareBackup(backup)
  await db.settings.update('app', { lastBackupAt: Date.now() })
  return method
}

export async function createSafetyBackupFile(): Promise<File> {
  const backup = await buildBackup()
  return new File(
    [JSON.stringify(backup, null, 2)],
    `expenses-before-restore-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`,
    { type: 'application/json' },
  )
}

export async function saveSafetyBackup(file: File): Promise<void> {
  await shareOrDownload(file, 'Expense Tracker safety copy')
}

function csvCell(value: string): string {
  let text = value
  // Avoid spreadsheet formula injection when notes start with =, +, -, or @.
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`
  return text
}

export async function exportCsv(): Promise<void> {
  const [settings, categories, expenses] = await Promise.all([
    db.settings.get('app'),
    db.categories.toArray(),
    db.expenses.toArray(),
  ])

  const currency = settings?.currency ?? 'USD'
  const locale = settings?.locale ?? 'en-US'
  const digits = currencyFractionDigits(currency, locale)
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]))
  const rows: string[][] = [['Date', 'Category', 'Note', 'Amount', 'Currency']]

  const visibleExpenses = expenses
    .filter((expense) => expense.deletedAt === null)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)

  for (const expense of visibleExpenses) {
    rows.push([
      expense.date,
      categoryNames.get(expense.categoryId) ?? 'Uncategorized',
      expense.note,
      (expense.amount / 10 ** digits).toFixed(digits),
      currency,
    ])
  }

  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`
  triggerDownload(
    csv,
    `expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`,
    'text/csv;charset=utf-8',
  )
}

export async function parseBackupFile(file: File): Promise<BackupFile> {
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('That backup is too large (over 10 MB).')
  }

  let json: unknown
  try {
    json = JSON.parse(await file.text())
  } catch {
    throw new Error('That file is not valid JSON.')
  }

  const result = backupSchema.safeParse(json)
  if (!result.success) {
    throw new Error('That file is not a valid Expense Tracker backup.')
  }
  if (result.data.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error('That backup was created by an unsupported app version.')
  }

  const categoryIds = new Set<string>()
  for (const category of result.data.categories) {
    if (categoryIds.has(category.id)) throw new Error('That backup contains duplicate categories.')
    categoryIds.add(category.id)
  }

  const expenseIds = new Set<string>()
  for (const expense of result.data.expenses) {
    if (expenseIds.has(expense.id)) throw new Error('That backup contains duplicate expenses.')
    expenseIds.add(expense.id)
  }

  return result.data
}

export async function restoreBackup(backup: BackupFile): Promise<void> {
  const now = Date.now()

  await db.transaction('rw', db.categories, db.expenses, db.settings, async () => {
    await db.expenses.clear()
    await db.categories.clear()
    await db.settings.clear()
    await db.categories.bulkAdd(backup.categories)
    await db.expenses.bulkAdd(backup.expenses)
    await db.settings.put({
      ...backup.settings,
      lastBackupAt: now,
      schemaVersion: BACKUP_SCHEMA_VERSION,
    })
  })
}
