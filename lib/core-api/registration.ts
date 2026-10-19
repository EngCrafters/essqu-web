import { parseProblem, parseRegistrationStatus } from './schemas'
import type { CoreConflictReason, CoreRegistrationRequest } from './types'

/*
 * Registration, browser side. The visitor's browser posts straight to Core:
 *
 *   POST {CORE_API_BASE_URL}/events/{eventId}/registrations
 *
 * No API key, no cookie (`credentials: 'omit'`), no proxy through the landing's server, so Core
 * sees the visitor's own address for its per-IP rate limit. Core decides everything: capacity,
 * waitlist order, duplicates, whether registration is open. The landing checks the form only to
 * help the visitor; Core checks again.
 *
 * Never retried automatically (a second POST is a duplicate, answered 409) and never reported as
 * a success unless Core says `confirmed` or `waitlisted`.
 */

export type RegistrationField = 'attendeeName' | 'attendeeEmail'
export type FieldProblem = 'required' | 'too-long' | 'invalid'

export type RegistrationOutcome =
  | { kind: 'confirmed' }
  | { kind: 'waitlisted' }
  /**
   * 409: already registered or waitlisted, full, closed, or a place is free after all. Current Core
   * names which in `reason`; without one (an older Core, or a reason this site doesn't know) the
   * visitor gets the general message.
   */
  | { kind: 'conflict'; reason?: CoreConflictReason }
  /** 422: the fields Core named, if it named any. */
  | { kind: 'invalid'; fields: RegistrationField[] }
  /** 404: the event is no longer public. */
  | { kind: 'not-found' }
  /** 429. Retry-After is only readable if Core exposes it to the browser. */
  | { kind: 'rate-limited'; retryAfterSeconds: number | null }
  /** 503, a timeout, a network or CORS failure, or anything unexpected. */
  | { kind: 'unavailable' }

/** Core's limits (lib/registrations in engsoc-platform): a 1–200 character name, a ≤ 254 character email. */
export const NAME_MAX = 200
export const EMAIL_MAX = 254
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CONTROL = /[\u0000-\u001f\u007f]/

export const REGISTRATION_TIMEOUT_MS = 15000

/** The same checks Core makes, so most mistakes are caught before anything is sent. */
export function validateRegistration(input: { name: string; email: string }): Partial<Record<RegistrationField, FieldProblem>> {
  const problems: Partial<Record<RegistrationField, FieldProblem>> = {}
  const name = input.name.trim()
  const email = input.email.trim()
  if (!name) problems.attendeeName = 'required'
  else if (name.length > NAME_MAX) problems.attendeeName = 'too-long'
  else if (CONTROL.test(name)) problems.attendeeName = 'invalid'
  if (!email) problems.attendeeEmail = 'required'
  else if (email.length > EMAIL_MAX) problems.attendeeEmail = 'too-long'
  else if (!EMAIL_PATTERN.test(email) || CONTROL.test(email)) problems.attendeeEmail = 'invalid'
  return problems
}

/** The request body Core accepts, and nothing else (Core rejects any other field). */
export function registrationBody(input: { name: string; email: string; waitlist: boolean }): CoreRegistrationRequest {
  return { attendeeName: input.name.trim(), attendeeEmail: input.email.trim(), intent: input.waitlist ? 'join_waitlist' : 'register' }
}

const FIELDS: readonly RegistrationField[] = ['attendeeName', 'attendeeEmail']

/** Core's answer → an outcome. Pure, so every branch is tested without a network. */
export function outcomeFor(status: number, body: unknown, retryAfter: string | null): RegistrationOutcome {
  if (status === 201) {
    const result = parseRegistrationStatus(body)
    return result ? { kind: result } : { kind: 'unavailable' }
  }
  const problem = parseProblem(body)
  const code = problem?.code
  if (status === 409 || code === 'conflict') return problem?.reason ? { kind: 'conflict', reason: problem.reason } : { kind: 'conflict' }
  if (status === 404 || code === 'not-found') return { kind: 'not-found' }
  if (status === 429 || code === 'rate-limited') {
    const seconds = retryAfter === null ? NaN : Number(retryAfter)
    return { kind: 'rate-limited', retryAfterSeconds: Number.isInteger(seconds) && seconds > 0 ? seconds : null }
  }
  if (status === 422 || code === 'invalid-fields') {
    const named = problem?.errors?.map((e) => e.field) ?? []
    return { kind: 'invalid', fields: FIELDS.filter((f) => named.includes(f)) }
  }
  // 400/413/415 would be a bug on this side, 403 an origin Core doesn't allow; to a visitor all
  // of these, like a 503, mean "this can't be done right now".
  return { kind: 'unavailable' }
}

/**
 * A fresh correlation id for one submission, which Core echoes and logs so a failure can be traced
 * across both systems (Core accepts 8–128 of `A-Za-z0-9._-`; a UUID fits). `randomUUID` exists only
 * in secure contexts, so a plain-HTTP address (a phone on the LAN in development) sends none.
 */
function requestIdHeader(): Record<string, string> {
  const id = globalThis.crypto?.randomUUID?.()
  return id ? { 'X-Request-Id': id } : {}
}

/**
 * Sends one registration. Resolves with an outcome; never throws and never retries. `baseUrl` is
 * Core's public API address including `/v1`, handed down by the server.
 */
export async function submitRegistration(
  baseUrl: string,
  eventId: string,
  body: CoreRegistrationRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<RegistrationOutcome> {
  try {
    const response = await fetchImpl(`${baseUrl}/events/${encodeURIComponent(eventId)}/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...requestIdHeader() },
      body: JSON.stringify(body),
      credentials: 'omit',
      mode: 'cors',
      cache: 'no-store',
      signal: AbortSignal.timeout(REGISTRATION_TIMEOUT_MS),
    })
    const json: unknown = await response.json().catch(() => null)
    return outcomeFor(response.status, json, response.headers.get('retry-after'))
  } catch {
    // Network failure, timeout, or a CORS refusal (which the browser reports as a network error).
    return { kind: 'unavailable' }
  }
}
