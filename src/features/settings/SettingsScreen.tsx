import { useLiveQuery } from 'dexie-react-hooks'
import type { LucideIcon } from 'lucide-react'
import {
  Check,
  ChevronRight,
  Database,
  Download,
  FileSpreadsheet,
  Globe,
  Share,
  Smartphone,
  SunMoon,
  Tag,
  Tags,
  Upload,
} from 'lucide-react'
import { useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { db } from '../../db/database'
import {
  backUpNow,
  downloadSafetyBackup,
  exportCsv,
  isShareCanceled,
  parseBackupFile,
  restoreBackup,
  type BackupFile,
} from '../../db/backup'
import { getLocale } from '../../lib/money'
import { isIOS, isStandalone } from '../../lib/platform'
import { CategoryManager } from '../categories/CategoryManager'
import { RestoreConfirm } from './RestoreConfirm'

const APP_VERSION = '0.5.0'

const CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CNY',
  'TWD',
  'INR',
  'CAD',
  'AUD',
  'NZD',
  'SGD',
  'HKD',
  'KRW',
  'CHF',
  'SEK',
  'NOK',
  'DKK',
  'BRL',
  'MXN',
  'ZAR',
  'AED',
  'SAR',
  'THB',
  'MYR',
  'IDR',
  'PHP',
  'VND',
  'TRY',
  'PLN',
  'CZK',
]

const THEMES = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const

interface SectionProps {
  title: string
  children: ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <section className="mt-6 px-4">
      <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.7px] text-secondary">
        {title}
      </h2>
      <div className="overflow-hidden rounded-[20px] bg-surface">{children}</div>
    </section>
  )
}

interface RowProps {
  icon: LucideIcon
  label: string
  value?: string
  detail?: string
}

function Row({ icon: Icon, label, value, detail }: RowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-secondary">
        <Icon size={18} strokeWidth={1.9} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium">{label}</p>
        {detail && <p className="mt-0.5 text-[12px] leading-snug text-secondary">{detail}</p>}
      </div>
      {value && <span className="shrink-0 text-[14px] text-secondary">{value}</span>}
    </div>
  )
}

interface ActionRowProps {
  icon: LucideIcon
  title: string
  detail: string
  value?: string
  disabled?: boolean
  onClick: () => void
}

function ActionRow({
  icon: Icon,
  title,
  detail,
  value,
  disabled,
  onClick,
}: ActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-surface-2 disabled:opacity-50"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-secondary">
        <Icon size={18} strokeWidth={1.9} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium">{title}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-secondary">{detail}</p>
      </div>
      {value && (
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.5px] text-tertiary">
          {value}
        </span>
      )}
    </button>
  )
}

interface DataStatus {
  message: string
  error?: boolean
}

export function SettingsScreen() {
  const settings = useLiveQuery(() => db.settings.get('app'), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])
  const [installed] = useState(() => isStandalone())
  const [ios] = useState(() => isIOS())
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [backupBusy, setBackupBusy] = useState(false)
  const [backupStatus, setBackupStatus] = useState<DataStatus | null>(null)
  const [pendingRestore, setPendingRestore] = useState<{
    backup: BackupFile
    fileName: string
  } | null>(null)
  const restoreInputRef = useRef<HTMLInputElement>(null)
  const locale = settings?.locale ?? getLocale()
  const activeCategories = (categories ?? []).filter((category) => !category.archived).length
  const archivedCategories = (categories ?? []).filter((category) => category.archived).length
  const currencyOptions = Array.from(
    new Set([settings?.currency ?? 'USD', ...CURRENCIES]),
  )

  async function updateSetting(patch: {
    currency?: string
    theme?: 'system' | 'light' | 'dark'
  }) {
    await db.settings.update('app', patch)
  }

  const lastBackupLabel = settings
    ? settings.lastBackupAt
      ? new Intl.DateTimeFormat(locale, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(settings.lastBackupAt)
      : 'Never'
    : '—'

  async function handleBackup() {
    if (backupBusy) return
    setBackupBusy(true)
    setBackupStatus(null)

    try {
      const method = await backUpNow()
      setBackupStatus({
        message:
          method === 'shared'
            ? 'Backup shared. Save it to Files or iCloud Drive.'
            : 'Backup downloaded. Keep it somewhere safe.',
      })
    } catch (error) {
      if (!isShareCanceled(error)) {
        setBackupStatus({
          message: 'Could not create the backup. Please try again.',
          error: true,
        })
      }
    } finally {
      setBackupBusy(false)
    }
  }

  async function handleCsv() {
    if (backupBusy) return
    setBackupBusy(true)
    setBackupStatus(null)

    try {
      await exportCsv()
      setBackupStatus({ message: 'CSV exported.' })
    } catch {
      setBackupStatus({
        message: 'Could not export CSV. Please try again.',
        error: true,
      })
    } finally {
      setBackupBusy(false)
    }
  }

  function handleRestoreFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    setBackupBusy(true)
    setBackupStatus(null)

    void (async () => {
      try {
        const backup = await parseBackupFile(file)
        setPendingRestore({ backup, fileName: file.name })
      } catch (error) {
        setBackupStatus({
          message:
            error instanceof Error
              ? error.message
              : 'Could not read that backup file. Please try again.',
          error: true,
        })
      } finally {
        setBackupBusy(false)
      }
    })()
  }

  async function confirmRestore() {
    if (!pendingRestore || backupBusy) return
    setBackupBusy(true)

    try {
      await downloadSafetyBackup()
      await restoreBackup(pendingRestore.backup)
      setPendingRestore(null)
      setBackupStatus({ message: 'Backup restored. All data was replaced.' })
    } catch {
      setPendingRestore(null)
      setBackupStatus({
        message: 'Could not restore that backup. Your current data was not changed.',
        error: true,
      })
    } finally {
      setBackupBusy(false)
    }
  }

  return (
    <div>
      <header className="px-5 pt-[max(env(safe-area-inset-top),18px)]">
        <h1 className="text-[34px] font-bold tracking-[-1px]">Settings</h1>
      </header>

      <Section title="App">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Smartphone size={20} strokeWidth={1.9} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[16px] font-semibold">
                  {installed ? 'Installed' : 'Add to Home Screen'}
                </p>
                {installed && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-positive/10 px-2 py-0.5 text-[10px] font-semibold text-positive">
                    <Check size={10} strokeWidth={3} />
                    Active
                  </span>
                )}
              </div>
              <p className="mt-1 text-[13px] leading-snug text-secondary">
                {installed
                  ? 'Running full-screen from your Home Screen.'
                  : ios
                    ? 'Open this page in Safari, tap the Share button, then choose Add to Home Screen.'
                    : 'Open this page in Safari on your iPhone, then tap Share and choose Add to Home Screen.'}
              </p>
            </div>
          </div>

          {!installed && (
            <div className="mt-4 flex items-center gap-2 rounded-[14px] bg-surface-2 px-3 py-2.5 text-[12px] font-medium text-secondary">
              <Share size={15} className="shrink-0" />
              <span>Share → Add to Home Screen → Add</span>
            </div>
          )}
        </div>
      </Section>

      <Section title="Preferences">
        <button
          type="button"
          onClick={() => setCategoriesOpen(true)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-surface-2"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-secondary">
            <Tags size={18} strokeWidth={1.9} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium">Categories</p>
            <p className="mt-0.5 text-[12px] text-secondary">
              {activeCategories} active
              {archivedCategories > 0 ? ` · ${archivedCategories} archived` : ''}
            </p>
          </div>
          <ChevronRight size={18} className="shrink-0 text-tertiary" />
        </button>
        <div className="border-t border-separator" />
        <div className="px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-secondary">
              <Tag size={18} strokeWidth={1.9} />
            </div>
            <label htmlFor="currency" className="flex-1 text-[15px] font-medium">
              Currency
            </label>
            <select
              id="currency"
              value={settings?.currency ?? 'USD'}
              onChange={(event) => void updateSetting({ currency: event.target.value })}
              className="max-w-[110px] border-0 bg-transparent text-right text-[14px] font-medium text-secondary"
            >
              {currencyOptions.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-2 pl-12 text-[11px] leading-snug text-tertiary">
            Relabels past amounts; it does not convert them.
          </p>
        </div>
        <div className="border-t border-separator" />
        <div className="px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-secondary">
              <SunMoon size={18} strokeWidth={1.9} />
            </div>
            <p className="flex-1 text-[15px] font-medium">Appearance</p>
          </div>
          <div
            role="group"
            aria-label="Appearance"
            className="mt-3 grid grid-cols-3 gap-1 rounded-[10px] bg-surface-2 p-1"
          >
            {THEMES.map((option) => {
              const selected = (settings?.theme ?? 'system') === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => void updateSetting({ theme: option.value })}
                  className={`h-8 rounded-[8px] text-[12px] font-medium transition-colors ${
                    selected
                      ? 'bg-surface text-label shadow-sm'
                      : 'text-secondary'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
        <div className="border-t border-separator" />
        <Row icon={Globe} label="Locale" value={locale} />
      </Section>

      <Section title="Your data">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-secondary">
              <Database size={18} strokeWidth={1.9} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium">Stored on this device</p>
              <p className="mt-0.5 text-[12px] leading-snug text-secondary">
                Your expenses live in this browser's local storage. Nothing is uploaded,
                and no account is needed.
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-[12px] bg-surface-2 px-3 py-2">
            <span className="text-[12px] text-secondary">Last backup</span>
            <span className="text-[12px] font-medium">{lastBackupLabel}</span>
          </div>

          {backupStatus && (
            <p
              role="status"
              className={`mt-2 rounded-[12px] px-3 py-2 text-[12px] leading-snug ${
                backupStatus.error
                  ? 'bg-negative/10 text-negative'
                  : 'bg-surface-2 text-secondary'
              }`}
            >
              {backupStatus.message}
            </p>
          )}

          <p className="mt-3 text-[11px] leading-snug text-tertiary">
            Removing the Home Screen app or clearing Safari data erases local storage.
            Keep a recent backup.
          </p>
        </div>

        <div className="border-t border-separator" />
        <ActionRow
          icon={Download}
          title="Back up now"
          detail="Share a JSON file to Files or iCloud Drive."
          value="JSON"
          disabled={backupBusy}
          onClick={() => void handleBackup()}
        />
        <div className="border-t border-separator" />
        <ActionRow
          icon={Upload}
          title="Restore from file"
          detail="Replace this device's data with a previous backup."
          value="JSON"
          disabled={backupBusy}
          onClick={() => restoreInputRef.current?.click()}
        />
        <div className="border-t border-separator" />
        <ActionRow
          icon={FileSpreadsheet}
          title="Export CSV"
          detail="Open your expenses in Numbers or Excel."
          value="CSV"
          disabled={backupBusy}
          onClick={() => void handleCsv()}
        />
        <div className="border-t border-separator" />
        <p className="px-4 py-3 text-[11px] leading-snug text-tertiary">
          Backups contain your expense data in plain JSON and are not encrypted.
          Store them somewhere private.
        </p>
      </Section>

      <Section title="About">
        <Row icon={Tag} label="Version" value={APP_VERSION} />
        <div className="border-t border-separator" />
        <Row icon={Database} label="Build" value="Settings" />
      </Section>

      <p className="px-6 pb-4 pt-6 text-center text-[11px] leading-relaxed text-tertiary">
        Expense Tracker is a private, offline-first PWA.
        <br />
        No accounts, no analytics, no tracking.
      </p>

      <input
        ref={restoreInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleRestoreFile}
        className="hidden"
        aria-label="Choose a backup file"
      />

      {categoriesOpen && <CategoryManager onClose={() => setCategoriesOpen(false)} />}

      {pendingRestore && (
        <RestoreConfirm
          backup={pendingRestore.backup}
          fileName={pendingRestore.fileName}
          locale={locale}
          busy={backupBusy}
          onCancel={() => setPendingRestore(null)}
          onConfirm={() => void confirmRestore()}
        />
      )}
    </div>
  )
}
