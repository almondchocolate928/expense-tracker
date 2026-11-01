# Expense Tracker Inbox

A tiny Cloudflare Worker + D1 inbox for iOS 27 notification automations. The
Shortcut posts raw notification text; the PWA fetches pending imports and asks
you to confirm them before saving.

This backend is intentionally **one-way**. It does not store the expense ledger
and it does not sync edits or deletions. IndexedDB remains the source of truth
on the device.

## API

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | none | Health check |
| `POST` | `/v1/imports` | write token | Add a notification |
| `GET` | `/v1/imports?limit=50` | read token | List pending imports |
| `POST` | `/v1/imports/:id/ack` | read token | Mark an import consumed |

Both tokens use `Authorization: Bearer <token>`.

### POST body

```json
{
  "externalId": "uuid-or-other-stable-id",
  "title": "Chase",
  "subtitle": "Card ending 1234",
  "body": "You spent $12.50 at Starbucks",
  "notificationDate": "2026-11-01T12:34:00Z",
  "source": "com.chase"
}
```

`externalId` is required and unique. It is the idempotency key. `title`,
`subtitle`, and `body` are raw notification fields; at least one must be
non-empty. `notificationDate` and `source` are optional.

## Local development

From this `server` directory:

```powershell
npm install
Copy-Item .dev.vars.example .dev.vars
npm run db:init:local
npm run dev
```

The Worker runs at `http://127.0.0.1:8787`.

`.dev.vars` is ignored by git. Use test tokens locally.

Test with PowerShell:

```powershell
$headers = @{ Authorization = 'Bearer dev-write-token' }
$body = @{
  externalId = 'test-1'
  title = 'Test Bank'
  body = 'You spent $12.50 at Starbucks'
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8787/v1/imports' `
  -Headers $headers -ContentType 'application/json' -Body $body

$readHeaders = @{ Authorization = 'Bearer dev-read-token' }
Invoke-RestMethod -Uri 'http://127.0.0.1:8787/v1/imports' -Headers $readHeaders
```

## Deploy

1. Create/log in to a free Cloudflare account.
2. Install Wrangler and log in:

   ```powershell
   npx wrangler login
   ```

3. Create the D1 database:

   ```powershell
   npx wrangler d1 create expense-tracker-inbox
   ```

4. Copy the printed `database_id` into `wrangler.toml`.
5. Create the remote table:

   ```powershell
   npm run db:init
   ```

6. Set two long random secrets:

   ```powershell
   npx wrangler secret put WRITE_TOKEN
   npx wrangler secret put READ_TOKEN
   ```

   Generate values with `openssl rand -hex 32`, PowerShell
   `[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))`,
   or a password manager. Do not reuse them.

7. Deploy:

   ```powershell
   npm run deploy
   ```

The Worker URL will look like:

```text
https://expense-tracker-inbox.<your-subdomain>.workers.dev
```

Keep the `WRITE_TOKEN` only in the Shortcut. Put the URL and `READ_TOKEN` into
the PWA's Automation Inbox settings.

## iOS 27 Shortcut

1. In Shortcuts, create a shortcut and add an **Automation → Notification**
   trigger.
2. Choose the bank/payment app. Add a Title or Body filter if the app sends
   other notifications.
3. Add a **UUID** action for `externalId` (or a date plus random number if your
   Shortcuts version has no UUID action).
4. Add **Get Contents of URL**:
   - URL: your Worker `/v1/imports`
   - Method: `POST`
   - Headers: `Authorization: Bearer <WRITE_TOKEN>`
   - Request Body: JSON
   - Fields: `externalId`, `title`, `subtitle`, `body`, `notificationDate`,
     `source`. Map them from the Notification variable.
5. Turn the automation on and send a test notification.

Notification previews must be enabled, and the notification must be shown
(banner, Lock Screen, or Notification Center). Muted notifications without
previews may not contain readable content.

## Retention and privacy

- Pending imports are deleted after 90 days.
- Consumed imports are deleted after 30 days.
- The Worker stores raw notification text in D1. Use HTTPS, keep both tokens
  private, and rotate them if leaked.
- CORS is open (`*`) because authentication uses bearer tokens, not cookies.
- The PWA should never put the read token in a backup file.

## Files

- `src/index.ts` — Worker routes and validation
- `schema.sql` — D1 table and index
- `wrangler.toml` — Worker, D1 binding, cron cleanup
