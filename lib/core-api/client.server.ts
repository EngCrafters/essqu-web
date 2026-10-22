import 'server-only'
import type { CoreModeConfig } from './config.server'
import { CoreApiError, isRetryable, kindForStatus, toCoreError, type CoreErrorKind } from './errors'
import { parseProblem } from './schemas'

/*
 * The one place the landing's server talks HTTP to Core. Every request has a finite timeout,
 * sends only the headers below, turns every failure into a CoreApiError, and is logged without
 * secrets. A GET is retried at most once, on a 503 or a dropped connection (Core's handoff: never
 * on 401/403; never after a timeout). There is no write method here: registration goes from the visitor's
 * browser straight to Core (registration.ts), so Core sees the visitor's own address for its rate
 * limit.
 *
 * Caching: successful reads are kept in the Next.js data cache for `revalidateSeconds` and tagged
 * for on-demand revalidation. Only 200 responses are stored. No per-request X-Request-Id is sent:
 * it would make every cache key unique. Core generates one and echoes it; that id is logged.
 */

export interface CoreGet {
  /** Path under the base URL, e.g. `/events?period=upcoming`. */
  path: string
  /** Route template for logs, e.g. `GET /events/{eventId}`. Never a real id or cursor. */
  route: string
  tags: string[]
}

export const RETRY_DELAY_MS = 300

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Headers for a server-side read. The key goes here and nowhere else. */
export function coreReadHeaders(config: CoreModeConfig): Record<string, string> {
  return { Accept: 'application/json', Authorization: `Bearer ${config.apiKey}` }
}

/** One structured line per failed (or, with CORE_API_DEBUG=true, every) request. Never a key, a body or a visitor's details. */
export function logCoreRequest(entry: { route: string; status: number | 'error'; latencyMs: number; requestId: string | null; kind?: CoreErrorKind; attempt: number }) {
  if (!entry.kind && process.env.CORE_API_DEBUG !== 'true') return
  const line = JSON.stringify({ source: 'core-api', ...entry })
  if (entry.kind) console.warn(line)
  else console.info(line)
}

async function once(config: CoreModeConfig, request: CoreGet, attempt: number): Promise<unknown> {
  const started = Date.now()
  let status: number | 'error' = 'error'
  let requestId: string | null = null
  try {
    const response = await fetch(`${config.baseUrl}${request.path}`, {
      method: 'GET',
      headers: coreReadHeaders(config),
      signal: AbortSignal.timeout(config.timeoutMs),
      ...(config.revalidateSeconds > 0 ? { next: { revalidate: config.revalidateSeconds, tags: request.tags } } : { cache: 'no-store' as const }),
    })
    status = response.status
    requestId = response.headers.get('x-request-id')
    if (!response.ok) {
      const problem = parseProblem(await response.json().catch(() => null))
      throw new CoreApiError(kindForStatus(response.status, problem?.code), response.status, problem?.requestId || requestId)
    }
    let body: unknown
    try {
      body = await response.json()
    } catch {
      throw new CoreApiError('invalid-response', response.status, requestId)
    }
    logCoreRequest({ route: request.route, status, latencyMs: Date.now() - started, requestId, attempt })
    return body
  } catch (thrown) {
    const error = toCoreError(thrown)
    logCoreRequest({ route: request.route, status, latencyMs: Date.now() - started, requestId: error.requestId ?? requestId, kind: error.kind, attempt })
    throw error
  }
}

/** GET JSON from Core, retrying once when that is safe. Throws CoreApiError. */
export async function coreGetJson(config: CoreModeConfig, request: CoreGet): Promise<unknown> {
  try {
    return await once(config, request, 1)
  } catch (error) {
    const coreError = toCoreError(error)
    if (!isRetryable(coreError)) throw coreError
    await sleep(RETRY_DELAY_MS)
    return once(config, request, 2)
  }
}
