/**
 * The signed-in visitor's own membership, from Core's `GET /v1/me/membership` (ADR 0019). The
 * visitor's Supabase access token goes in the Authorization header, never in a URL; no cookie is
 * sent. Signing in proves who someone is; only this answer says whether they are a member.
 */

export type ApplicationStage = 'pending_review' | 'verified' | 'approved' | 'rejected'

export type OwnMembership =
  | { kind: 'member'; since: string }
  | { kind: 'application'; stage: ApplicationStage; submittedAt: string }
  | { kind: 'none' }
  | { kind: 'unconfirmed' }
  | { kind: 'signed-out' }
  | { kind: 'unavailable' }

const STAGES: readonly ApplicationStage[] = ['pending_review', 'verified', 'approved', 'rejected']
const isDate = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value))

export async function fetchOwnMembership(baseUrl: string, accessToken: string, fetchImpl: typeof fetch = fetch): Promise<OwnMembership> {
  let response: Response
  try {
    response = await fetchImpl(`${baseUrl}/me/membership`, {
      method: 'GET',
      headers: { authorization: `Bearer ${accessToken}` },
      credentials: 'omit',
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return { kind: 'unavailable' }
  }
  if (response.status === 401) return { kind: 'signed-out' }
  if (!response.ok) return { kind: 'unavailable' }
  const body = (await response.json().catch(() => null)) as { data?: Record<string, unknown> } | null
  const data = body?.data
  if (!data || typeof data !== 'object') return { kind: 'unavailable' }
  if (data.emailConfirmed === false) return { kind: 'unconfirmed' }
  const member = data.member as { status?: unknown; since?: unknown } | null | undefined
  if (member && (member.status === 'member' || member.status === 'graduate') && isDate(member.since)) {
    return { kind: 'member', since: member.since }
  }
  const application = data.application as { status?: unknown; submittedAt?: unknown } | null | undefined
  if (application) {
    const stage = STAGES.find((s) => s === application.status)
    return stage && isDate(application.submittedAt) ? { kind: 'application', stage, submittedAt: application.submittedAt } : { kind: 'unavailable' }
  }
  return member === null && application === null ? { kind: 'none' } : { kind: 'unavailable' }
}
