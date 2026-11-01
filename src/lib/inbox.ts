import { db } from '../db/database'

export const INBOX_CONFIG_KEY = 'expense-tracker-inbox-config'
export const INBOX_CHANGED_EVENT = 'expense-tracker-inbox-changed'

export interface InboxConfig {
  url: string
  token: string
}

export interface PendingImport {
  id: string
  externalId: string
  title: string
  subtitle: string
  body: string
  notificationDate: string | null
  source: string | null
  createdAt: number
}

export function readInboxConfig(): InboxConfig | null {
  try {
    const raw = localStorage.getItem(INBOX_CONFIG_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<InboxConfig>
    if (typeof value.url !== 'string' || typeof value.token !== 'string') return null
    return { url: value.url, token: value.token }
  } catch {
    return null
  }
}

export function writeInboxConfig(config: InboxConfig | null): void {
  try {
    if (config) {
      localStorage.setItem(INBOX_CONFIG_KEY, JSON.stringify(config))
    } else {
      localStorage.removeItem(INBOX_CONFIG_KEY)
    }
  } catch {
    // The settings screen reports failures from the connection test.
  }
  window.dispatchEvent(new Event(INBOX_CHANGED_EVENT))
}

export function normalizeInboxUrl(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

export function validateInboxConfig(config: InboxConfig): string | null {
  if (!config.url) return 'Enter the Worker URL.'
  try {
    const url = new URL(config.url)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return 'The inbox URL must use HTTPS.'
    }
    if (
      url.protocol === 'http:' &&
      url.hostname !== 'localhost' &&
      url.hostname !== '127.0.0.1'
    ) {
      return 'Use HTTPS for a remote inbox.'
    }
  } catch {
    return 'Enter a valid inbox URL.'
  }
  if (config.token.trim().length < 8) return 'Enter the read token.'
  return null
}

function isPendingImport(value: unknown): value is PendingImport {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.externalId === 'string' &&
    typeof item.title === 'string' &&
    typeof item.subtitle === 'string' &&
    typeof item.body === 'string' &&
    (item.notificationDate === null || typeof item.notificationDate === 'string') &&
    (item.source === null || typeof item.source === 'string') &&
    typeof item.createdAt === 'number'
  )
}

export async function fetchPendingImports(
  config: InboxConfig,
  limit = 50,
): Promise<PendingImport[]> {
  let response: Response
  try {
    response = await fetch(`${config.url}/v1/imports?limit=${limit}`, {
      headers: { Authorization: `Bearer ${config.token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    throw new Error('Could not reach the inbox.')
  }

  if (response.status === 401) throw new Error('The read token was rejected.')
  if (!response.ok) throw new Error('The inbox returned an error.')

  const payload = (await response.json()) as { imports?: unknown }
  if (!Array.isArray(payload.imports)) throw new Error('Unexpected inbox response.')
  return payload.imports.filter(isPendingImport)
}

export async function acknowledgeImport(
  config: InboxConfig,
  id: string,
): Promise<void> {
  const response = await fetch(
    `${config.url}/v1/imports/${encodeURIComponent(id)}/ack`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    },
  )
  if (!response.ok) throw new Error('Could not acknowledge the import.')
}

/**
 * Filter out imports already saved locally and acknowledge those leftovers.
 * The marker table is what makes a failed ack safe to retry.
 */
export async function pullPendingImports(
  config: InboxConfig,
): Promise<PendingImport[]> {
  const items = await fetchPendingImports(config)
  if (items.length === 0) return []

  const markers = await db.imports.bulkGet(items.map((item) => item.externalId))
  const pending: PendingImport[] = []

  items.forEach((item, index) => {
    if (markers[index]) {
      void acknowledgeImport(config, item.id).catch(() => {
        // A later refresh retries this ack.
      })
    } else {
      pending.push(item)
    }
  })

  return pending
}

export async function testInboxConnection(config: InboxConfig): Promise<void> {
  await fetchPendingImports(config, 1)
}
