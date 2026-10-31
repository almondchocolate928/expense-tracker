# Deploying Expense Tracker to GitHub Pages

This project includes a GitHub Actions workflow that builds the PWA and publishes it to GitHub Pages. There is **no `gh-pages` branch** to manage — the compiled `dist/` folder is uploaded as a deployment artifact.

The result is a URL like:

```
https://<your-username>.github.io/<repository>/
```

served over HTTPS, installable from Safari on the iPhone.

---

## 1. How the included pipeline works

The workflow lives at `.github/workflows/deploy.yml`.

```
push to main ──► build job ──► upload dist/ ──► deploy job ──► GitHub Pages
```

**Build job**

1. Check out the repository.
2. Install Node 22 and restore the npm cache.
3. Run `npm ci` (reproducible install from `package-lock.json`).
4. Run `npm run lint`.
5. Run `actions/configure-pages@v5`, which reports the base path for this repository (for example `/expense-tracker`).
6. Run `npm run build` with `VITE_BASE_PATH` set to that path.
7. Upload `dist/` with `actions/upload-pages-artifact@v3`.

**Deploy job**

1. Uses the `github-pages` environment.
2. Publishes the uploaded artifact with `actions/deploy-pages@v4`, authenticated through GitHub's OIDC token.

The workflow declares the permissions it needs:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

It also uses a `pages` concurrency group so two deployments cannot overlap.

### Why the base path matters

Project sites are served from a subpath:

```
https://<user>.github.io/<repo>/
```

Vite has to know that prefix when it builds. Without it, `index.html` would request `/assets/...` instead of `/<repo>/assets/...`, causing a blank page and 404s.

`vite.config.ts` reads the path from `VITE_BASE_PATH`, normalizes the trailing slash, and applies it to:

- JavaScript and CSS asset URLs
- The web app manifest (`start_url`, `scope`, `id`)
- PWA icon and service worker scope
- The offline navigation fallback

For a user site (`<user>.github.io`), the output is `/`, and the same workflow works unchanged. No repository name is hardcoded anywhere.

---

## 2. Prerequisites

- A GitHub account.
- A repository for the project.
- Node 22 installed locally (already verified: Node v22.20.0).
- Git installed and this folder committed on the `main` branch.
- A clean working tree (`git status`).
- On a **free GitHub plan, GitHub Pages requires a public repository**. Private-repository Pages needs a paid plan. The app contains no secrets or expense data in the repo, so public is reasonable.
- No server, database, domain, or credit card is required.

Check the local repo:

```powershell
git status
git branch --show-current
git log --oneline -1
```

You should see a clean tree, branch `main`, and commit `Build installable expense tracker PWA core (M1)`.

---

## 3. Option A — GitHub website + Git (recommended)

### Step 1: Create an empty repository

1. Open <https://github.com/new>.
2. Enter a name, for example `expense-tracker`.
3. Choose **Public** (see the plan note above).
4. **Do not** add a README, `.gitignore`, or license.

The repository must be empty. If GitHub creates an initial commit, your first push will be rejected because the local and remote histories are unrelated. If that happens, the cleanest fix is to delete the repository and create it again empty.

### Step 2: Enable GitHub Pages

In the new repository:

1. Open **Settings**.
2. In the left sidebar, choose **Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Ignore the suggested workflow/theme chooser — this repo already contains its own workflow.

Labels move around occasionally in GitHub's UI; the page is still under **Settings → Pages**, and the source choice is **GitHub Actions** rather than “Deploy from a branch”.

Doing this before the first push avoids a common first-run failure in `configure-pages` (“Get Pages site failed”).

### Step 3: Connect the local repository

From the project folder:

```powershell
cd "C:\Users\KPY09\Documents\Expense Tracker"
git remote add origin https://github.com/<your-username>/expense-tracker.git
git remote -v
```

Replace `<your-username>` and `expense-tracker` with your actual values. Your local Git identity is currently `sungmidchic <sungmidchic@gmail.com>`; if that is also your GitHub username, the URL may be:

```text
https://github.com/sungmidchic/expense-tracker.git
```

If you already added a remote and need to change it:

```powershell
git remote set-url origin https://github.com/<your-username>/expense-tracker.git
```

### Step 4: Push to `main`

```powershell
git push -u origin main
```

The first push triggers authentication. Git for Windows normally includes **Git Credential Manager**, which opens a browser window:

1. Choose **Sign in with your browser**.
2. Authorize GitHub.
3. Return to the terminal; the push completes.

GitHub does not accept your account password for Git operations. If you are asked for a password:

- Create a **personal access token (PAT)** and use it as the password.
- For a classic PAT, enable at least `repo` and `workflow`.
- For a fine-grained PAT, grant:
  - **Contents: Read and write**
  - **Workflows: Read and write** (required because this push adds `.github/workflows/deploy.yml`)

Alternatively, use SSH:

```powershell
git remote add origin git@github.com:<your-username>/expense-tracker.git
git push -u origin main
```

(Requires an SSH key added to GitHub.)

### Step 5: Watch the deployment

1. Open the repository's **Actions** tab.
2. Open the **Deploy to GitHub Pages** run.
3. Wait for both jobs: **build** and **deploy**.

The first run usually takes one to three minutes. A green check means the site is published.

If the build job fails at **Configure Pages**, return to **Settings → Pages**, confirm the source is **GitHub Actions**, then re-run the failed jobs from the Actions tab.

### Step 6: Find the URL

Use either place:

- **Settings → Pages** shows “Your site is live at …”.
- The **deploy** job output shows the same `page_url`.

The URL is normally:

```
https://<your-username>.github.io/expense-tracker/
```

The trailing slash matters when testing manually.

> If the repository is named `<your-username>.github.io`, the URL is `https://<your-username>.github.io/` and the workflow builds with a `/` base path automatically.

### Step 7: Verify on desktop

Open the URL in a normal browser:

- The app should load with the Home screen.
- The manifest should be present (DevTools → Application → Manifest).
- The service worker should activate (DevTools → Application → Service Workers).
- Add a test expense and reload; it should persist.

The first load registers the service worker. Reload once before testing offline.

### Step 8: Install on the iPhone

1. Open the URL in **Safari** on the iPhone.
2. Tap the **Share** button.
3. Choose **Add to Home Screen**.
4. If an **Open as Web App** toggle appears, leave it on.
5. Tap **Add**.
6. Launch **Expenses** from the Home Screen.

Check:

- It opens full-screen without Safari's toolbar.
- Safe areas (notch, home indicator) look correct.
- Light and dark mode both render.
- Add an expense, force-quit the app, and reopen it; the expense persists.
- Turn on airplane mode, reopen the app, and confirm it still loads.

---

## 4. Option B — GitHub CLI

If you prefer the terminal:

```powershell
winget install --id GitHub.cli
gh auth login
```

Choose **GitHub.com → HTTPS → Login with a web browser**.

From the project folder:

```powershell
gh repo create expense-tracker --public --source=. --remote=origin --push
```

Then enable Pages in the browser (**Settings → Pages → Source: GitHub Actions**) and watch the workflow in the **Actions** tab.

If you install and authenticate `gh`, I can create the repository, push this commit, and enable Pages from here. I cannot do that yet because `gh` is not installed and no remote is configured.

---

## 5. Deploying updates

After the first deploy, the workflow runs on every push to `main`:

```powershell
git add -A
git commit -m "Describe the change"
git push
```

Wait for the new **Deploy to GitHub Pages** run to finish.

On the installed iPhone app:

- The service worker downloads the new version in the background.
- When a new version is waiting, the app shows a **“New version available — Reload”** banner.
- Tap **Reload**. If it does not appear immediately, close the app from the app switcher and reopen it.

The app uses `registerType: 'prompt'` deliberately. It does not silently replace the running app.

---

## 6. Production build locally (optional)

To reproduce the GitHub Pages build on this machine (PowerShell):

```powershell
$env:VITE_BASE_PATH='/expense-tracker'
npm run build
npm run preview
```

Open <http://localhost:4173/expense-tracker/>.

`npm run preview` must be started in the same shell session as the environment variable, because Vite reads the base path when the preview server starts. This is only a local check; GitHub Actions performs the real deployment.

---

## 7. Important: the origin owns the data

Expense data lives in IndexedDB, and **IndexedDB is scoped to the origin** (scheme + host + port).

That means:

- Data added at `http://localhost:5173` does **not** appear at `https://<user>.github.io/...`.
- Data added at one GitHub Pages URL does **not** move if you rename the repository or add a custom domain.
- The saved Home Screen app is tied to the old origin.

Until backup/restore ships (M4), avoid changing the repository name or custom domain after you start entering real expenses. If you must change it, treat the old origin's data as separate and do not delete it until you can export it.

Deleting the Home Screen app or clearing Safari website data also removes IndexedDB. Backups are the next milestone for a reason.

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Workflow does not appear in Actions | Actions disabled, or push was not to `main` | Check **Settings → Actions → General**; confirm `git branch --show-current` is `main` |
| `Get Pages site failed` | Pages not enabled, or not set to GitHub Actions | Settings → Pages → Source: GitHub Actions, then re-run |
| `remote origin already exists` | Remote was already added | `git remote set-url origin <url>` |
| Push rejected / `fetch first` | Remote repo was created with a README or other commit | Recreate the remote empty, or deliberately reconcile/force-push |
| `src refspec main does not match any` | Local branch is not named `main` | `git branch -M main` |
| Site 404s | Wrong URL, Pages not enabled, or deploy still running | Use `https://<user>.github.io/<repo>/`; check Actions; wait |
| Site loads but assets 404 / blank page | Build was made without the repo base path | Let the workflow set `VITE_BASE_PATH`; if building manually, set it to `/<repo>` |
| Add to Home Screen missing | Opened in Chrome/in-app browser, or not HTTPS | Use Safari and the GitHub Pages HTTPS URL |
| Installed app shows an old build | Service worker is waiting | Tap the in-app Reload banner; close/reopen; if necessary clear website data (this deletes expenses) |
| Pages unavailable on a private repo | Free plan limitation | Make the repo public or upgrade the plan |
| Workflow cannot deploy | Repository/org policy blocking `pages: write` | Check **Settings → Actions → General** and organization policies |
| Custom domain shows wrong assets | Base path/custom domain mismatch | Let `configure-pages` set the base; verify after changing the domain |
| `npm ci` fails in Actions | Lockfile drift | Run `npm ci` locally and commit any lockfile change |
| Old data missing after URL change | IndexedDB is origin-scoped | No automatic migration; use the old origin or wait for backup/restore |

---

## 9. Custom domain (optional)

You do not need one. If you add one later:

1. **Settings → Pages → Custom domain**.
2. Add the DNS records GitHub shows (typically a `CNAME` for `www`, or `A`/`AAAA` records for an apex domain).
3. Wait for DNS and the HTTPS certificate.
4. Re-run the deployment.

A custom domain changes the app's origin, so existing Home Screen data will not follow it. Do this before entering real expenses, or wait until backup/restore exists.

---

## 10. Rolling back

The simplest rollback is a revert commit:

```powershell
git revert <commit-sha>
git push
```

The workflow deploys the reverted state. Alternatively, re-run a previous successful workflow from the Actions tab if you want to republish an older commit.

Because the app is a static PWA, there is no server migration or database rollback to worry about.

---

## 11. Security and privacy notes

- The repository contains source code and no expense data. Data is created on the device and stored in IndexedDB.
- GitHub Pages serves the app over HTTPS.
- There is no backend, no analytics, and no third-party runtime script.
- A public repo exposes the source code, not your expenses.
- The service worker caches the app shell for offline use; it does not upload data anywhere.

---

## 12. What I need from you to finish the deployment

Choose one:

1. **Create the empty repo yourself**, then paste its URL. I can add the remote and attempt the push if Git credentials are already cached.
2. **Install the GitHub CLI** (`winget install --id GitHub.cli`) and run `gh auth login`. Then I can create the repo, push, and enable Pages from this session.
3. **Push it yourself** using the commands in Option A, then tell me the URL so I can verify the deployment and start M2.

Once the URL is live, the remaining product work is M2: edit/delete with Undo, category management, and filtering.
