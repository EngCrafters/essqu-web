import { memberAuthClient, type MemberAuthSettings } from '@/lib/member-auth/client'
import { fetchOwnMembership } from '@/lib/member-auth/membership'

export type MemberProfile = { name: string; email: string; phone: string | null }
export type MemberEvent = {
  profile: MemberProfile
  registration: { status: 'confirmed' | 'waitlisted'; attended: boolean; checkedInAt: string | null } | null
  checkinOpen: boolean
  closesAt: string | null
}
export type MemberResult<T> = { ok: true; data: T } | { ok: false; code: string; status: number; retryAfterSeconds?: number; requestId?: string }

export const normalizePhone = (value: string): string | null => {
  const compact = value.trim().replace(/[ ()-]/g, '')
  return /^\+[1-9][0-9]{6,14}$/.test(compact) ? compact : null
}

/**
 * A refused or failed member call, as the pages use it: Core's code, the status and, when Core
 * gave one, its request id (exposed through CORS), which names the failing request in Core's
 * logs. Pure, so it is tested.
 */
export function memberFailure(status: number, headers: Headers, json: unknown): Extract<MemberResult<never>, { ok: false }> {
  const body = (json && typeof json === 'object' ? json : {}) as { errors?: { code?: unknown }[]; reason?: unknown; code?: unknown; requestId?: unknown }
  const code = [body.errors?.[0]?.code, body.reason, body.code].find((v): v is string => typeof v === 'string') ?? 'UNAVAILABLE'
  const requestId = headers.get('x-request-id') ?? (typeof body.requestId === 'string' ? body.requestId : null)
  return {
    ok: false,
    status,
    code,
    ...(status === 429 ? { retryAfterSeconds: Number(headers.get('retry-after')) || 600 } : {}),
    ...(requestId && /^[A-Za-z0-9-]{8,64}$/.test(requestId) ? { requestId } : {}),
  }
}

/** Uses the existing Supabase session; never forwards account identity from form fields. */
export async function memberCall<T>(
  settings: MemberAuthSettings,
  base: string,
  path: string,
  method = 'GET',
  body?: object,
  fetchImpl: typeof fetch = fetch,
): Promise<MemberResult<T>> {
  try {
    const { data, error } = await memberAuthClient(settings).auth.getSession()
    if (error || !data.session) return { ok: false, code: 'SIGNED_OUT', status: 401 }
    const response = await fetchImpl(`${base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${data.session.access_token}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      credentials: 'omit',
      cache: 'no-store',
      mode: 'cors',
      signal: AbortSignal.timeout(15_000),
    })
    const json = await response.json().catch(() => null)
    if (!response.ok) return memberFailure(response.status, response.headers, json)
    if (!json?.data || typeof json.data !== 'object') return { ok: false, code: 'UNAVAILABLE', status: 503 }
    return { ok: true, data: json.data as T }
  } catch {
    return { ok: false, code: 'UNAVAILABLE', status: 503 }
  }
}

export function isMemberProfile(value: unknown): value is MemberProfile {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.name === 'string' && typeof v.email === 'string' && (v.phone === null || typeof v.phone === 'string')
}

/** Complete only the existing 0027 activation path when an approval happened
 * during a long-lived session. Missing membership infrastructure fails closed. */
export async function fetchMemberEvent(settings: MemberAuthSettings, base: string, eventId: string): Promise<MemberResult<MemberEvent>> {
  const path = `/me/events/${eventId}/attendance`
  const result = await memberCall<MemberEvent>(settings, base, path)
  if (result.ok || result.status !== 403 || result.code !== 'MEMBER_REQUIRED') return result
  try {
    const { data, error } = await memberAuthClient(settings).auth.getSession()
    if (error || !data.session) return { ok: false, code: 'SIGNED_OUT', status: 401 }
    const membership = await fetchOwnMembership(base, data.session.access_token)
    if (membership.kind === 'unavailable') return { ok: false, code: 'UNAVAILABLE', status: 503 }
    if (membership.kind === 'signed-out') return { ok: false, code: 'SIGNED_OUT', status: 401 }
    return membership.kind === 'member' ? memberCall<MemberEvent>(settings, base, path) : result
  } catch {
    return { ok: false, code: 'UNAVAILABLE', status: 503 }
  }
}
