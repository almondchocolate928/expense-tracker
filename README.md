# Expense Tracker

A private, offline-first expense tracker built as an installable PWA for iPhone.

**Live app:** <https://almondchocolate928.github.io/expense-tracker/>

> **Status: v0.5.1 (settings).** Add, edit, delete with Undo, manage categories, back up/restore, review six-month trends, and choose currency or appearance. Search/filters and final device QA remain.

## What works today

- Fast add flow: custom amount keypad, category chips, native date picker, optional note
- Tap any expense to edit its amount, category, date, or note
- Delete with an Undo toast (soft delete, reversible for 6 seconds)
- Category management: add, rename, change icon/color, reorder, archive, and restore
- Archived categories stay on past expenses but disappear from the new-expense picker
- Monthly Home screen with total, expense count, and comparison to the same point last month
- Expenses grouped by day with per-day totals
- Month navigation (past months, back to today)
- Insights: six-month bar chart, daily average, largest expense, and category breakdown
- Tapping a month bar in Insights changes the selected month across the app
- Searchable currency picker and System/Light/Dark appearance setting
- JSON backup/restore through Files or iCloud Drive
- CSV export for Numbers or Excel
- A Home reminder until the first backup is made
- Light and dark mode following the system
- Installable PWA with offline app shell, icons, standalone launch, and update prompt
- iOS safe-area handling and an in-app "Add to Home Screen" tip
- Data stored locally in IndexedDB via Dexie

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Dexie + `dexie-react-hooks` (IndexedDB)
- `date-fns`
- `vite-plugin-pwa` (Workbox)
- Lucide icons
- GitHub Pages for hosting

No backend, accounts, analytics, or tracking.

## Local development

Requires Node 22+.

```bash
npm install
npm run dev
```

Open http://localhost:5173. The app is designed for an iPhone viewport, but works on desktop too.

```bash
npm run typecheck   # TypeScript
npm run lint        # oxlint
npm run build       # type-check + production build
npm run preview     # serve the production build
npm run icons       # regenerate PWA icons from public/icon*.svg
```

## Deploy to GitHub Pages

For a full walkthrough — authentication, enabling Pages, base paths, iPhone install steps, and troubleshooting — see **[DEPLOY.md](./DEPLOY.md)**. Short version:

1. Create an **empty** GitHub repository (no README, no license).
2. In the repository, open **Settings → Pages**, and set **Source** to **GitHub Actions**.
3. Add the remote and push this project to `main`.
4. Watch the **Deploy to GitHub Pages** run in the **Actions** tab.

The app will be available at:

```
https://<your-username>.github.io/<repository>/
```

The workflow (`.github/workflows/deploy.yml`) uses `actions/configure-pages` to read the repository's base path and passes it to the build as `VITE_BASE_PATH`. No hardcoded repository name is needed. Both project sites and `<username>.github.io` user sites work.

To reproduce a project-site build locally:

```powershell
$env:VITE_BASE_PATH='/expense-tracker'
npm run build
npm run preview
```

The local preview must use the same `VITE_BASE_PATH` as the build.

## Install on iPhone

1. Open the deployed URL in **Safari**.
2. Tap the **Share** button.
3. Choose **Add to Home Screen**, then **Add**.
4. Launch **Expenses** from the Home Screen.

Installed web apps open full-screen on iOS 26 and later. Without installation, the app still works in a Safari tab, but it will not be standalone.

## Data & privacy

Everything is stored on the device in IndexedDB. There is no network request for app data.

**Important:** iOS can evict local storage when space is low, and deleting the Home Screen app can remove its data. Use **Settings → Your data → Back up now** regularly. The app reminds you on Home until the first backup exists.

Backups are JSON files shared through the iOS share sheet to Files or iCloud Drive. Restoring validates the file, downloads a safety copy of the current data, then replaces everything. CSV export is available for spreadsheets.

Backup files are **not encrypted** — they contain your expense data in plain JSON. Store them somewhere private.

When multi-device sync is added later, the data model is ready for it: UUID ids, `updatedAt`, and soft deletes.

## Project structure

```
src/
  components/        Tab bar, undo toast, update prompt, install card
  db/                Dexie database, defaults, and backup/restore
  features/
    categories/      Category manager and editor
    expenses/        Add/edit-expense sheet
    home/            Monthly list, totals, and edit entry point
    insights/        Category breakdown
    settings/        App, preferences, data, backup, and about
  lib/               Money, dates, platform, colors, ids
  types.ts
scripts/             Icon generation
.github/workflows/   GitHub Pages deployment
PLAN.md              Product and architecture plan
```

## Known limitations

- No search or category filters yet (deferred)
- No automatic sync; PWAs cannot access iCloud/CloudKit
- No home-screen widgets, haptics, or App Store distribution
- Currency changes relabel past amounts rather than converting them

See [PLAN.md](./PLAN.md) for the full roadmap and rationale.
