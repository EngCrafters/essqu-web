import type { CoreProblemCode } from './types'

/**
 * The landing's own failure vocabulary for Core reads. Pages only ever need to know three
 * things: it worked, there is no such public event, or events can't be shown right now. The
 * finer kinds below exist for logs, so a failure can be traced without exposing anything.
 */
export type CoreErrorKind =
  /** 404 `not-found`: unknown, draft or archived event. Core deliberately can't tell them apart. */
  | 'not-found'
  /** 401: the server key is missing, malformed, revoked or expired. */
  | 'unauthorized'
  /** 403: the key lacks `events:read`, or an origin was refused. */
  | 'forbidden'
  | 'rate-limited'
  /** 503 or any other 5xx. */
  | 'unavailable'
  /** Any other unexpected status. */
  | 'bad-status'
  /** The body wasn't the v1 shape. */
  | 'invalid-response'
  | 'timeout'
  /** DNS, TLS, connection refused… */
  | 'network'

export class CoreApiError extends Error {
  readonly kind: CoreErrorKind
  readonly status: number | null
  readonly requestId: string | null

  constructor(kind: CoreErrorKind, status: number | null = null, requestId: string | null = null) {
    super(`Core API ${kind}${status === null ? '' : ` (${status})`}`)
    this.name = 'CoreApiError'
    this.kind = kind
    this.status = status
    this.requestId = requestId
  }
}

/** The kind for an unsuccessful HTTP status, preferring Core's stable problem code when present. */
export function kindForStatus(status: number, code?: CoreProblemCode): CoreErrorKind {
  if (code === 'not-found' || status === 404) return 'not-found'
  if (code === 'unauthorized' || status === 401) return 'unauthorized'
  if (code === 'forbidden' || status === 403) return 'forbidden'
  if (code === 'rate-limited' || status === 429) return 'rate-limited'
  if (code === 'service-unavailable' || status >= 500) return 'unavailable'
  return 'bad-status'
}

/** Anything thrown while talking to Core, as a CoreApiError. */
export function toCoreError(error: unknown): CoreApiError {
  if (error instanceof CoreApiError) return error
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) return new CoreApiError('timeout')
  return new CoreApiError('network')
}

/**
 * Core's handoff: reads retry once on 503 with a short backoff, never on 401/403. A dropped
 * connection is treated like a 503 (the GET is idempotent). A timeout is not retried: a second
 * full wait would double how long a page can be held up by a slow Core.
 */
export function isRetryable(error: CoreApiError) {
  return error.kind === 'unavailable' || error.kind === 'network'
}
