interface Env {
  DB: D1Database
  WRITE_TOKEN: string
  READ_TOKEN: string
}

interface ImportRow {
  id: string
  external_id: string
  title: string
  subtitle: string
  body: string
  notification_date: string | null
  source: string | null
  created_at: number
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const MAX_TITLE = 300
const MAX_BODY = 4000
const MAX_SOURCE = 200
const KEEP_CONSUMED_MS = 30 * 24 * 60 * 60 * 1000
const KEEP_PENDING_MS = 90 * 24 * 60 * 60 * 1000

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function failure(status: number, message: string): Response {
  return json({ error: message }, status)
}

function bearerToken(request: Request): string {
  const header = request.headers.get('Authorization') ?? ''
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : ''
}

function authorized(request: Request, expected: string): boolean {
  return expected.length > 0 && bearerToken(request) === expected
}

function text(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.slice(0, maxLength) : ''
}

function optionalText(value: unknown, maxLength: number): string | null {
  const result = text(value, maxLength).trim()
  return result.length > 0 ? result : null
}

async function createImport(request: Request, env: Env): Promise<Response> {
  if (!authorized(request, env.WRITE_TOKEN)) {
    return failure(401, 'Unauthorized')
  }

  let payload: Record<string, unknown>
  try {
    payload = (await request.json()) as Record<string, unknown>
  } catch {
    return failure(400, 'Invalid JSON body')
  }

  const externalId = text(payload.externalId, 128).trim()
  if (!externalId) return failure(400, 'externalId is required')

  const title = text(payload.title, MAX_TITLE)
  const subtitle = text(payload.subtitle, MAX_TITLE)
  const body = text(payload.body, MAX_BODY)
  const source = optionalText(payload.source, MAX_SOURCE)
  const notificationDate = optionalText(payload.notificationDate, 64)

  if (!title && !subtitle && !body) {
    return failure(400, 'title, subtitle, or body is required')
  }

  const result = await env.DB.prepare(
    `INSERT OR IGNORE INTO imports
      (id, external_id, title, subtitle, body, notification_date, source, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      externalId,
      title,
      subtitle,
      body,
      notificationDate,
      source,
      Date.now(),
    )
    .run()

  const duplicate = Number(result.meta.changes ?? 0) === 0
  return json({ ok: true, duplicate }, duplicate ? 200 : 201)
}

async function listImports(request: Request, env: Env): Promise<Response> {
  if (!authorized(request, env.READ_TOKEN)) {
    return failure(401, 'Unauthorized')
  }

  const url = new URL(request.url)
  const requested = Number(url.searchParams.get('limit') ?? 50)
  const limit = Number.isFinite(requested) ? Math.min(Math.max(Math.floor(requested), 1), 100) : 50

  const { results } = await env.DB.prepare(
    `SELECT id, external_id, title, subtitle, body, notification_date, source, created_at
     FROM imports
     WHERE consumed_at IS NULL
     ORDER BY created_at ASC
     LIMIT ?`,
  )
    .bind(limit)
    .all<ImportRow>()

  return json({
    imports: results.map((row) => ({
      id: row.id,
      externalId: row.external_id,
      title: row.title,
      subtitle: row.subtitle,
      body: row.body,
      notificationDate: row.notification_date,
      source: row.source,
      createdAt: row.created_at,
    })),
  })
}

async function acknowledgeImport(
  request: Request,
  env: Env,
  id: string,
): Promise<Response> {
  if (!authorized(request, env.READ_TOKEN)) {
    return failure(401, 'Unauthorized')
  }

  const result = await env.DB.prepare(
    'UPDATE imports SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL',
  )
    .bind(Date.now(), id)
    .run()

  return json({ ok: true, acknowledged: Number(result.meta.changes ?? 0) > 0 })
}

async function cleanup(env: Env): Promise<void> {
  const now = Date.now()
  await env.DB.batch([
    env.DB.prepare(
      'DELETE FROM imports WHERE consumed_at IS NOT NULL AND consumed_at < ?',
    ).bind(now - KEEP_CONSUMED_MS),
    env.DB.prepare(
      'DELETE FROM imports WHERE consumed_at IS NULL AND created_at < ?',
    ).bind(now - KEEP_PENDING_MS),
  ])
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    try {
      const url = new URL(request.url)

      if (url.pathname === '/health') {
        return json({ ok: true })
      }

      if (url.pathname === '/v1/imports') {
        if (request.method === 'POST') return createImport(request, env)
        if (request.method === 'GET') return listImports(request, env)
        return failure(405, 'Method not allowed')
      }

      const ack = url.pathname.match(/^\/v1\/imports\/([^/]+)\/ack$/)
      if (ack && request.method === 'POST') {
        return acknowledgeImport(request, env, decodeURIComponent(ack[1]))
      }

      return failure(404, 'Not found')
    } catch (error) {
      console.error('Inbox request failed', error)
      return failure(500, 'Internal error')
    }
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    context: ExecutionContext,
  ): Promise<void> {
    context.waitUntil(cleanup(env))
  },
} satisfies ExportedHandler<Env>
