# Expense Tracker

A private, offline-first expense tracker built as an installable PWA for iPhone.

**Live app:** <https://almondchocolate928.github.io/expense-tracker/>

> **Status: v0.1.0 (core loop).** You can add and review expenses with full local persistence. Editing, deleting, category management, and backup/restore are the next milestones. Until backups ship, do not treat this as your only record.

## What works today

- Fast add flow: custom amount keypad, category chips, native date picker, optional note
- Monthly Home screen with total, expense count, and comparison to the same point last month
- Expenses grouped by day with per-day totals
- Month navigation (past months, back to today)
- Insights tab with month total and category breakdown
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

**Important:** iOS can evict local storage when space is low, and deleting the Home Screen app can remove its data. JSON backup/restore is the next milestone (M4). Until then, treat this build as a preview.

When multi-device sync is added later, the data model is ready for it: UUID ids, `updatedAt`, and soft deletes.

## Project structure

```
src/
  components/        Tab bar, update prompt, install card
  db/                Dexie database and default categories
  features/
    expenses/        Add-expense sheet
    home/            Monthly list and totals
    insights/        Category breakdown
    settings/        App, preferences, data, and about sections
  lib/               Money, dates, platform, colors, ids
  types.ts
scripts/             Icon generation
.github/workflows/   GitHub Pages deployment
PLAN.md              Product and architecture plan
```

## Known limitations

- No edit or delete yet (M2)
- No category management yet (M2)
- No backup/restore yet (M4) — data loss is possible
- No automatic sync; PWAs cannot access iCloud/CloudKit
- No home-screen widgets, haptics, or App Store distribution
- Charts beyond the category breakdown are pending (M3)

See [PLAN.md](./PLAN.md) for the full roadmap and rationale.
