# Expense Tracker — Build Plan

**Status:** M0 + M1 deployed (v0.1.0); M2 next
**Date:** 2026-11-01
**Type:** Installable Progressive Web App (PWA) for iPhone
**Target device:** iPhone, iOS 27.2
**Live app:** <https://almondchocolate928.github.io/expense-tracker/>
**Repository:** <https://github.com/almondchocolate928/expense-tracker>
**Owner:** Personal use

### Current state

- Deployed and verified on GitHub Pages; the Actions deployment succeeded for commit `6af79db`
- Installable PWA shell with custom iOS-style design, light/dark mode, safe-area handling
- Working core loop: add expense (custom keypad, category, date, note) → Home list + monthly total
- Local persistence in IndexedDB, verified across reloads
- Monthly navigation and same-period comparison to last month
- Insights: month total + category breakdown (six-month charts pending)
- PWA: manifest, icons, offline app shell, update prompt, iOS install card
- Verified live: add/save, persistence, offline reload, service worker scope, install card
- Not yet: edit/delete, category management, backup/restore, real-device install

---

## 1. Decisions

| Decision | Choice |
| --- | --- |
| Platform | PWA, installed to the iPhone home screen via Safari |
| Target | iPhone, iOS 27.2 |
| Scope | Focused core: expense entry, categories, monthly totals, insights |
| Data | Local-first, IndexedDB, single device |
| Backup | Manual JSON export/import to Files or iCloud Drive |
| Tracking | Expenses only (no income, no accounts) |
| Build style | Agent builds, owner reviews/tests on device |
| Visual style | iOS-native clean, light and dark mode |
| Hosting | GitHub Pages (GitHub Actions) |
| Budget | Free tools only (no paid services) |

### What we are deliberately not building in v1

- Income, accounts, transfers, or net worth
- Budgets and recurring expenses
- Receipt photos or attachments
- Multi-currency transactions
- Automatic cloud sync or multi-user sharing
- Native widgets, haptics, or App Store distribution (not possible for PWAs)

These are candidates for v1.1+ (see §13).

---

## 2. Product Definition

A fast, private expense log that lives on the iPhone home screen. The core loop must take **under 10 seconds**: open app → tap + → enter amount → pick category → save.

**Success criteria**

- Adding an expense takes 3 taps plus amount entry.
- The current month total and recent expenses are visible immediately on open.
- The app works fully offline and survives reloads.
- Data can be backed up and restored without any account.
- It feels at home next to native iOS apps.

**Non-goals:** competing with full finance suites, bank connections, investment tracking.

---

## 3. Platform Constraints (iOS PWA)

These are known, accepted trade-offs:

| Constraint | Impact | Mitigation |
| --- | --- | --- |
| No iCloud/CloudKit access | No automatic sync | Manual JSON backup to Files/iCloud Drive; data model kept sync-ready |
| No auto install prompt | Users must use Share → Add to Home Screen | In-app install instructions when opened in a Safari tab |
| Storage can be evicted when low on space or app is deleted | Possible data loss | Persist request, frequent writes, backup reminders |
| Home-screen app may reload after leaving | Lost in-memory state | All state written to IndexedDB immediately; fast cold start |
| No Background Sync | No background refresh | Not needed for a manual-entry app |
| No native widgets / haptics | Less "native" feel | Strong visual feedback, iOS-style motion |
| No Safari dev tools on device | Harder debugging | Chrome/Edge DevTools device emulation + deploy previews |

As of iOS 26, any site added to the Home Screen opens as a standalone web app by default. Web Push (iOS 16.4+) is available after install, but we don't need it for v1.

---

## 4. Tech Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Build | Vite + React 19 + TypeScript | Fast dev server, static output, huge ecosystem |
| Styling | Tailwind CSS v4 + CSS variables | Fast iteration, consistent design tokens |
| Data | Dexie (IndexedDB) + `dexie-react-hooks` | Robust local storage, live queries, indexes |
| Dates | `date-fns` | Lightweight, tree-shakeable local-date helpers |
| Charts | Recharts | Simple bar/donut charts, responsive SVG |
| Icons | `lucide-react` | Clean stroke icons close to SF Symbols |
| Validation | Zod | Validate backup files on import |
| PWA | `vite-plugin-pwa` (Workbox) | Manifest, service worker, update prompt |
| Tests | Vitest + Playwright (optional) | Unit tests for money/dates/backup |
| Hosting | GitHub Pages | Free HTTPS, deploys from the repo, supports project and user sites |

No backend, no database service, no account system.

**Local prerequisites (verified):** Node v22.20.0, npm 10.9.3, git 2.51.0.

**Deployment (GitHub Pages).** `.github/workflows/deploy.yml` builds on every push to `main`. It reads the Pages base path from `actions/configure-pages` and passes it as `VITE_BASE_PATH`, so both `https://<user>.github.io/<repo>/` and user-root sites work. Enable **Settings → Pages → Source: GitHub Actions** once, then push to `main`. The Vite config normalizes the base path for the manifest, service worker scope, icons, and asset URLs.

---

## 5. Architecture

```
src/
  app/
    App.tsx                # tab shell, add/edit sheet state
    providers.tsx          # theme + live-query setup if needed
  components/
    ui/                    # Button, Card, Sheet, Toast, SegmentedControl
    layout/                # TabBar, Screen, SafeArea
    charts/                # MonthBars, CategoryDonut
  features/
    expenses/              # list, row, add/edit form, amount keypad
    categories/            # picker, management screens
    insights/              # aggregation + chart screens
    settings/              # preferences, backup, install guide
  db/
    database.ts            # Dexie schema + initialization
    seed.ts                # default categories
    queries.ts             # month totals, grouping, aggregations
    backup.ts              # export/import + Zod schema
  lib/
    money.ts               # parse/format minor units
    dates.ts               # local YYYY-MM-DD helpers
    id.ts                  # UUID generation
  styles/
    theme.css              # design tokens, safe-area utilities
```

**State strategy**

- IndexedDB is the single source of truth.
- Reads use Dexie live queries so the UI updates after any write.
- UI-only state (active tab, sheet open, selected month) lives in React.
- No global state library; no router in v1 (tabs are local state).

**Why this shape:** it keeps the core loop simple and leaves a clean seam for optional sync later (UUIDs, `updatedAt`, soft deletes).

---

## 6. Data Model

```ts
type ID = string; // crypto.randomUUID()

interface Category {
  id: ID;
  name: string;          // "Food & Drink"
  emoji: string;         // "🍔"
  color: CategoryColor;  // token: "orange" | "green" | ...
  sortOrder: number;
  archived: boolean;     // hidden from picker, kept on old expenses
  createdAt: number;
  updatedAt: number;
}

interface Expense {
  id: ID;
  amount: number;        // integer minor units (e.g. 1250 = $12.50)
  categoryId: ID;
  date: string;          // LOCAL calendar date, "YYYY-MM-DD"
  note: string;          // default ""
  createdAt: number;     // epoch ms
  updatedAt: number;
  deletedAt: number | null; // soft delete (undo + future sync)
}

interface Settings {
  key: "app";
  currency: string;      // ISO 4217, detected from locale on first run
  locale: string;        // BCP 47, e.g. "en-US"
  theme: "system" | "light" | "dark";
  lastBackupAt: number | null;
  schemaVersion: number;
}
```

**Dexie schema (v1)**

```
expenses:   id, date, categoryId, updatedAt, deletedAt
categories: id, sortOrder, archived
settings:   key
```

**Rules**

- Money is never stored as a float. Parse input to minor units; format with `Intl.NumberFormat`.
- Dates are local calendar strings, not UTC timestamps, to avoid timezone drift at month boundaries.
- Deleting an expense sets `deletedAt` (soft delete) so Undo works and future sync can propagate deletions.
- Archiving a category hides it from new entries but preserves history.
- Changing the app currency in v1 re-labels past amounts; it does **not** convert them. A warning explains this. (Multi-currency is future work.)
- Expenses store only a global currency context, not a per-expense currency, in v1.

**Default categories**

| Emoji | Name | Color |
| --- | --- | --- |
| 🍔 | Food & Drink | orange |
| 🛒 | Groceries | green |
| 🚕 | Transport | blue |
| 🛍️ | Shopping | pink |
| 🧾 | Bills & Utilities | purple |
| 💊 | Health | red |
| 🎬 | Entertainment | teal |
| 🏠 | Home | yellow |
| 📦 | Other | gray |

Categories are fully editable and reorderable; defaults are only a starting point.

---

## 7. Screens & Flows

### Navigation

Three tabs in a floating, translucent bottom bar: **Home**, **Insights**, **Settings**.
A circular **+** button floats above the tab bar on Home and Insights.
The add/edit form opens as a bottom sheet.

### 7.1 Home — This Month

- Large title: `October 2026` with ‹ › month navigation (next disabled at current month).
- Hero card: total spent, expense count, and comparison to the same number of days last month (↑ 12% vs last month).
- Expense list grouped by day:
  - Day header: `Today · Oct 27` + day total.
  - Row: category emoji in a tinted circle, category name, note (secondary), amount right-aligned.
  - Tap row → edit sheet.
- Empty state: friendly illustration/text plus an "Add your first expense" button.
- After adding an expense dated in another month, auto-navigate to that month so it isn't "lost".

### 7.2 Add / Edit Expense (bottom sheet)

Order optimized for speed:

1. **Amount** — large display, custom keypad (0–9, locale decimal separator, backspace). No keyboard, no currency token typing.
2. **Category** — horizontally scrollable emoji chips; remembers the last used category.
3. **Date** — "Today" by default; tap opens the native iOS date picker; future dates not allowed in v1.
4. **Note** — optional single line ("What was this for?").
5. **Save** — sticky bottom button, disabled until amount > 0 and a category is selected.

Edit mode prefills everything and exposes a destructive "Delete expense" action. Delete shows a toast with **Undo** (soft delete), so accidental taps are recoverable.

Details:
- Dismissal via drag-down, tapping the backdrop, or Cancel; warn only if there are unsaved changes? (v1: silently discard draft; sheet is small).
- Haptic-like feedback via key press animation (no vibration API on iOS).

### 7.3 Insights

For the selected month (shared month state with Home):

- **Last 6 months** bar chart with the selected month highlighted.
- **Spending by category** donut plus a ranked list: emoji, name, amount, percentage.
- **Summary stats**: daily average (to date), largest single expense, transaction count.
- Tapping a category row could filter Home later (v1.1).

Empty state for months with no expenses.

### 7.4 Settings

Grouped iOS-style list:

- **General**: Currency picker (searchable ISO list, default detected), Appearance (System/Light/Dark).
- **Categories**: manage list with add, edit, reorder, archive.
- **Data**:
  - Last backup date + "Back up now" (share JSON to Files/iCloud Drive).
  - "Restore from file" with validation and confirmation.
  - "Export CSV" for spreadsheets.
  - Backup reminder banner if no backup in 30 days (or after 10+ expenses and never backed up).
- **Install**: step-by-step Add to Home Screen guide, shown only in a browser tab.
- **About**: version, storage note, "Delete all data" behind double confirmation.

### 7.5 Install onboarding

When `display-mode` is not standalone and the device is iOS Safari, show a dismissible card: "Install this app — tap Share, then Add to Home Screen." Hidden once installed. Not a blocking modal.

---

## 8. Design System

**Principles:** familiar iOS patterns, generous whitespace, one accent color, data first, no clutter.

- **Typography:** system stack (`-apple-system`, `SF Pro Text`, `Segoe UI`), San Francisco-like sizes: 34px large title, 22px title, 17px body, 13px captions. Tabular numbers for amounts.
- **Surfaces:** grouped background `#F2F2F7` (light) / `#000000` (dark); cards `#FFFFFF` / `#1C1C1E`; separators at low opacity.
- **Accent:** iOS blue `#0A84FF` for actions and focus. Green for positive comparisons, red for destructive.
- **Category palette:** iOS-style orange, green, blue, pink, purple, red, teal, yellow, gray with tinted 15% backgrounds.
- **Shape:** 16–20px rounded cards, 12px controls, full pills for chips.
- **Touch:** 44px minimum targets, `touch-action: manipulation`, no tap highlight, 16px+ inputs to prevent zoom.
- **Motion:** 220–280ms spring-like sheet and tab transitions; respect `prefers-reduced-motion`.
- **Dark mode:** CSS variables driven by `data-theme`; follows system by default.
- **Accessibility:** semantic labels on icon buttons, visible focus states for keyboard/desktop, chart values also shown as text.

**App identity:** placeholder name "Expense Tracker" (short name "Expenses") and a simple wallet/receipt icon. Name and icon can be finalized later without code changes beyond the manifest.

---

## 9. PWA Implementation

**Manifest**

- `name`: Expense Tracker, `short_name`: Expenses
- `display`: standalone, `orientation`: portrait
- `start_url`: `/`, `scope`: `/`
- `theme_color` / `background_color`: light grouped background
- Icons: 180 (apple-touch), 192, 512, 512 maskable
- Optional iOS splash screens generated for common sizes

**HTML/meta**

- `viewport-fit=cover`
- `apple-mobile-web-app-capable=yes`
- `apple-mobile-web-app-title=Expenses`
- `theme-color` with light/dark variants

**Service worker**

- Precache the app shell, JS/CSS, icons; navigation fallback to `index.html`
- `registerType: "prompt"` → in-app "New version available · Reload" snackbar
- No external fonts or CDNs, so the app is fully offline after first load
- Cache versioning handled by Workbox; keep precache small

**iOS behaviors**

- Safe-area padding via `env(safe-area-inset-*)`, `100dvh`, and a tab bar that respects the home indicator.
- Call `navigator.storage.persist()` after the first successful save; ignore failure silently.
- Write to IndexedDB on every mutation; never rely on memory across suspend.
- Handle visibility changes to refresh the current month if the date rolled over.
- Disable overscroll bounce where it fights the layout; keep list scrolling natural.

---

## 10. Backup & Restore

**JSON format (versioned)**

```json
{
  "app": "expense-tracker",
  "schemaVersion": 1,
  "exportedAt": "2026-10-27T10:30:00.000Z",
  "settings": { "currency": "USD", "locale": "en-US", "theme": "system" },
  "categories": [ ... ],
  "expenses": [ ... ]
}
```

- Export uses the **Web Share API** with a JSON file when available (share sheet → Save to Files / iCloud Drive); falls back to a download link.
- Filename: `expenses-backup-2026-10-27.json`.
- Import validates with Zod, shows a summary (count, date range), and requires confirmation.
- Restore is **replace-all** in v1. Before replacing, the app automatically downloads a safety backup of existing data.
- CSV export includes: date, category, note, amount, currency. Useful for Excel/Numbers.
- Backup reminder shown if `lastBackupAt` is older than 30 days, or missing after 10 expenses.
- Schema version is embedded so future formats can migrate.

---

## 11. Milestones

| Milestone | Deliverable | Status |
| --- | --- | --- |
| **M0 — Foundations** | Vite/React/TS scaffold, Tailwind tokens, tab shell, PWA manifest + icons, GitHub Pages workflow, installable on iPhone | ✅ Complete — live on GitHub Pages |
| **M1 — Core loop** | Dexie schema + seed categories, add-expense sheet with keypad, Home list + monthly total, instant persistence | ✅ Complete |
| **M2 — Manage** | Edit/delete + undo, category management (add/edit/reorder/archive), filters | ⏭ Next |
| **M3 — Insights** | 6-month bar chart, category donut/list, summary stats, month sync with Home | ◐ Category breakdown shipped; trends pending |
| **M4 — Data safety & settings** | Settings screen, currency + theme, JSON backup/restore, CSV export, backup reminder | Pending |
| **M5 — Polish & device QA** | Animations, safe areas, dark mode audit, offline/update flows, accessibility, iPhone testing, bug fixes | Pending |

**Remaining:** roughly 3–5 focused days after device review.

**M0 exit criteria:** the app is reachable on a public HTTPS URL, installs to the home screen, launches standalone, and renders the shell offline.
**v1 exit criteria:** all flows work on-device in light/dark, offline, with a successful backup → wipe → restore cycle.

---

## 12. Testing & QA

**Automated**

- Unit: money parsing/formatting (including zero-decimal currencies), date grouping, month-range boundaries, backup validation and round-trip.
- Component: amount keypad, add form validation.
- Optional Playwright smoke test at iPhone viewport: add → edit → delete → reload persists.

**Manual on iPhone**

- Safari tab vs installed app.
- Add across month boundary and around midnight; verify grouping and totals.
- Custom keypad + native date picker + note keyboard.
- Light/dark, large text, safe areas, notch/home indicator.
- Offline launch and a full day of use in airplane mode.
- Backup to Files → delete all data → restore → verify counts/amounts.
- Update prompt after a new deploy.
- Low-storage and storage-persistence behavior (best effort).

---

## 13. Future Roadmap (post-v1)

1. Search and category/date filters
2. Budgets per category with progress bars
3. Recurring expenses
4. Income tracking and monthly net
5. CSV import from bank exports
6. Automatic sync via Supabase (email auth, row-level security) — data model already prepared
7. Multi-currency support
8. Spending trends and year-over-year comparisons
9. Optional passcode lock (Web Crypto + local key) for privacy on shared devices

---

## 14. Risks & Notes

- **Data loss is the main risk.** Manual backup is a conscious trade-off; the app must make backup obvious and easy, and warn if it's stale.
- **No automatic sync.** Using two devices means exporting from one and importing to the other (replace-all). Acceptable for personal single-device use.
- **iOS PWA quirks.** Storage policy and install behavior can change between iOS releases; keep the app self-contained and test after major iOS updates.
- **Currency change is not a conversion.** The UI will state this clearly.
- **Naming/icon are placeholders** until you choose a final identity.
- **No App Store presence.** Distribution is via URL → Add to Home Screen. For personal use this is fine.

---

## 15. Immediate Next Steps

1. Install the live app on the iPhone (Safari → Share → Add to Home Screen) and confirm standalone launch, safe areas, and offline reload.
2. Build M2: tap-to-edit, delete with Undo, category management, and basic filtering.
3. Build M4 backups before using the app for real data; storage on iOS can be evicted.
