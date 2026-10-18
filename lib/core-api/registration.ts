import { apiBase } from './config'
import type { ConflictReason, RegistrationResult } from './types'

const reasons = [
  'already-registered',
  'already-waitlisted',
  'event-full',
  'registration-closed',
  'registration-available',
]
/** Browser-only transport: one attempt, no credential, no IP, no local persistence. */
export async function submitRegistration(
  base: string,
  eventId: string,
  fields: { attendeeName: string; attendeeEmail: string; intent: 'register' | 'join_waitlist' },
): Promise<RegistrationResult> {
  try {
    const response = await fetch(`${apiBase(base)}/events/${encodeURIComponent(eventId)}/registrations`, {
      method: 'POST',
      credentials: 'omit',
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
      headers: { 'Content-Type': 'application/json', 'X-Request-Id': crypto.randomUUID() },
      body: JSON.stringify(fields),
    })
    const body = await response.json()
    if (response.status === 201 && (body?.data?.status === 'confirmed' || body?.data?.status === 'waitlisted'))
      return { ok: true, status: body.data.status }
    const code = typeof body?.code === 'string' ? body.code : 'service-unavailable'
    const retry = Number(response.headers.get('retry-after'))
    return {
      ok: false,
      code,
      ...(reasons.includes(body?.reason) ? { reason: body.reason as ConflictReason } : {}),
      ...(typeof body?.requestId === 'string' ? { requestId: body.requestId } : {}),
      ...(retry > 0 ? { retryAfter: retry } : {}),
    }
  } catch {
    return { ok: false, code: 'service-unavailable' }
  }
}
