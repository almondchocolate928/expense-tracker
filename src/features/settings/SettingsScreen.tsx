import { useLiveQuery } from 'dexie-react-hooks'
import type { LucideIcon } from 'lucide-react'
import {
  Check,
  ChevronRight,
  Database,
  Palette,
  Share,
  Smartphone,
  Tag,
  Tags,
} from 'lucide-react'
import { useState } from 'react'
import { db } from '../../db/database'
import { CategoryManager } from '../categories/CategoryManager'
import { getLocale } from '../../lib/money'
import { isIOS, isStandalone } from '../../lib/platform'
import type { ReactNode } from 'react'

const APP_VERSION = '0.2.0'

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

export function SettingsScreen() {
  const settings = useLiveQuery(() => db.settings.get('app'), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])
  const [installed] = useState(() => isStandalone())
  const [ios] = useState(() => isIOS())
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const locale = settings?.locale ?? getLocale()
  const activeCategories = (categories ?? []).filter((category) => !category.archived).length
  const archivedCategories = (categories ?? []).filter((category) => category.archived).length

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
        <Row icon={Tag} label="Currency" value={settings?.currency ?? '—'} />
        <div className="border-t border-separator" />
        <Row icon={Palette} label="Locale" value={locale} />
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

          <div className="mt-3 rounded-[14px] bg-surface-2 px-3 py-2.5">
            <p className="text-[12px] font-medium">Backup & restore is next</p>
            <p className="mt-0.5 text-[12px] leading-snug text-secondary">
              Removing the Home Screen app can erase its data, so backups are the next
              milestone.
            </p>
          </div>
        </div>
      </Section>

      <Section title="About">
        <Row icon={Tag} label="Version" value={APP_VERSION} />
        <div className="border-t border-separator" />
        <Row icon={Database} label="Build" value="M2" />
      </Section>

      <p className="px-6 pb-4 pt-6 text-center text-[11px] leading-relaxed text-tertiary">
        Expense Tracker is a private, offline-first PWA.
        <br />
        No accounts, no analytics, no tracking.
      </p>

      {categoriesOpen && <CategoryManager onClose={() => setCategoriesOpen(false)} />}
    </div>
  )
}
