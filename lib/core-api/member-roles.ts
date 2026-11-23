import { memberAuthClient, type MemberAuthSettings } from '@/lib/member-auth/client'
import { memberCall, type MemberResult } from './member-events'
import { mapped } from './member-profile'

/**
 * The member's own SQU student verification and committee leadership (Core ADR 0025), as two
 * independent Core endpoints so the profile's two cards load, and fail, separately:
 *
 *   GET {CORE_API_BASE_URL}/me/verification   SQU verification state
 *   GET {CORE_API_BASE_URL}/me/leadership     appointments, requests and limits
 *
 * Every call carries the Supabase session; Core answers only for that member and never returns
 * a reviewer note, a reviewer's identity or the full student number. None of these grants
 * another: membership, SQU verification, appointments and dashboard access stay separate.
 */

export type Localized = { en: string; ar: string }
export type TeamName = { en: string; ar: string | null }
export type SquStatus = 'not_verified' | 'pending' | 'verified' | 'rejected' | 'revoked'
export type SquState = {
  status: SquStatus
  /** Masked by Core to its last three digits. */
  studentNumber: string | null
  submittedAt: string | null
  decidedAt: string | null
  verifiedAt: string | null
  rejectionReason: string | null
  revokedAt: string | null
  revocationReason: string | null
  canSubmit: boolean
  nextSubmissionAt: string | null
}
/** Committee-level leadership has no team (Core ADR 0026); team leadership names its team. */
export type LeadershipLevel = 'committee' | 'team'
export type RolePath = {
  committee: { id: string; name: string }
  team: { id: string; name: TeamName } | null
  level: LeadershipLevel
  position: { id: string; label: Localized }
}
export type Appointment = RolePath & {
  id: string
  active: boolean
  appointedAt: string
  endedAt: string | null
  endReason: string | null
  /** Whether this active appointment's committee or team has dashboard permissions (Core ADR 0027). */
  grantsAccess: boolean
}
export type CancellationReason = 'team_moved' | 'team_inactive' | 'team_archived' | 'committee_archived'
export type LeadershipRequest = RolePath & {
  id: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  submittedAt: string
  decidedAt: string | null
  rejectionReason: string | null
  cancellationReason: CancellationReason | null
}
export type OwnLeadership = {
  /** Whether the administrators accept new requests; appointments show either way. */
  requestsOpen: boolean
  appointments: Appointment[]
  requests: LeadershipRequest[]
  /** recentRequests leaves out requests Core closed because the team or committee changed. */
  limits: { requestsPer30Days: number; recentRequests: number; maxActiveAppointments: number | null; activeAppointments: number }
  /** Read-only: whether the member has any dashboard permission (an access level or a position's). */
  dashboardAccess: boolean
}
/** Every active committee, each with its active teams (often none), and the positions. */
export type LeadershipOptions = {
  requestsOpen: boolean
  committees: { id: string; name: string; teams: { id: string; name: TeamName }[] }[]
  positions: { id: string; label: Localized }[]
}

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const str = (v: unknown): v is string => typeof v === 'string'
const strOrNull = (v: unknown) => (str(v) ? v : null)
const int = (v: unknown, fallback = 0) => (Number.isInteger(v) ? (v as number) : fallback)
const localized = (v: unknown): Localized | null => (object(v) && str(v.en) && str(v.ar) ? { en: v.en, ar: v.ar } : null)
const teamName = (v: unknown): TeamName | null => (object(v) && str(v.en) ? { en: v.en, ar: strOrNull(v.ar) } : null)
const SQU_STATUSES: readonly SquStatus[] = ['not_verified', 'pending', 'verified', 'rejected', 'revoked']
const CANCELLATIONS: readonly CancellationReason[] = ['team_moved', 'team_inactive', 'team_archived', 'committee_archived']

function toPath(v: Record<string, unknown>): RolePath | null {
  const committee = object(v.committee) && str(v.committee.id) && str(v.committee.name) ? { id: v.committee.id, name: v.committee.name } : null
  const position = object(v.position) && str(v.position.id) ? localized(v.position.label) : null
  if (!committee || !position || !object(v.position)) return null
  // No team is committee-level leadership; a team that is present must be valid.
  if (v.team === null || v.team === undefined) return { committee, team: null, level: 'committee', position: { id: v.position.id as string, label: position } }
  const team = object(v.team) && str(v.team.id) ? teamName(v.team.name) : null
  if (!team || !object(v.team)) return null
  return { committee, team: { id: v.team.id as string, name: team }, level: 'team', position: { id: v.position.id as string, label: position } }
}

/** Validate Core's SQU answer before rendering it; anything else is "unavailable", never a guess. */
export function toSquState(s: unknown): SquState | null {
  if (!object(s) || !SQU_STATUSES.includes(s.status as SquStatus)) return null
  return {
    status: s.status as SquStatus,
    studentNumber: strOrNull(s.studentNumber),
    submittedAt: strOrNull(s.submittedAt),
    decidedAt: strOrNull(s.decidedAt),
    verifiedAt: strOrNull(s.verifiedAt),
    rejectionReason: strOrNull(s.rejectionReason),
    revokedAt: strOrNull(s.revokedAt),
    revocationReason: strOrNull(s.revocationReason),
    canSubmit: s.canSubmit === true,
    nextSubmissionAt: strOrNull(s.nextSubmissionAt),
  }
}

/** Validate Core's leadership answer; an entry that is not what Core sends is dropped. */
export function toOwnLeadership(v: unknown): OwnLeadership | null {
  if (!object(v) || !Array.isArray(v.appointments) || !Array.isArray(v.requests) || !object(v.limits)) return null
  const appointments = v.appointments.flatMap((a): Appointment[] => {
    if (!object(a) || !str(a.id) || typeof a.active !== 'boolean' || !str(a.appointedAt)) return []
    const path = toPath(a)
    return path
      ? [
          {
            ...path,
            id: a.id,
            active: a.active,
            appointedAt: a.appointedAt,
            endedAt: strOrNull(a.endedAt),
            endReason: strOrNull(a.endReason),
            // A Core before migration 0035 does not say: no appointment gave access then.
            grantsAccess: a.active && a.grantsAccess === true,
          },
        ]
      : []
  })
  const requests = v.requests.flatMap((r): LeadershipRequest[] => {
    if (!object(r) || !str(r.id) || !str(r.submittedAt) || !['pending', 'approved', 'rejected', 'cancelled'].includes(r.status as string)) return []
    const path = toPath(r)
    const cancellation = CANCELLATIONS.includes(r.cancellationReason as CancellationReason) ? (r.cancellationReason as CancellationReason) : null
    return path
      ? [
          {
            ...path,
            id: r.id,
            status: r.status as LeadershipRequest['status'],
            submittedAt: r.submittedAt,
            decidedAt: strOrNull(r.decidedAt),
            rejectionReason: strOrNull(r.rejectionReason),
            cancellationReason: cancellation,
          },
        ]
      : []
  })
  const l = v.limits
  return {
    // Open unless Core says otherwise (a Core before migration 0034 has no switch).
    requestsOpen: v.requestsOpen !== false,
    appointments,
    requests,
    limits: {
      requestsPer30Days: int(l.requestsPer30Days, 5),
      recentRequests: int(l.recentRequests),
      maxActiveAppointments: Number.isInteger(l.maxActiveAppointments) ? (l.maxActiveAppointments as number) : null,
      activeAppointments: int(l.activeAppointments),
    },
    dashboardAccess: v.dashboardAccess === true,
  }
}

export function toLeadershipOptions(v: unknown): LeadershipOptions | null {
  if (!object(v) || !Array.isArray(v.committees) || !Array.isArray(v.positions)) return null
  return {
    requestsOpen: v.requestsOpen !== false,
    // Every committee is offered (committee leadership needs no team); its teams may be none.
    committees: v.committees.flatMap((c) => {
      if (!object(c) || !str(c.id) || !str(c.name)) return []
      const teams = (Array.isArray(c.teams) ? c.teams : []).flatMap((t) => {
        const name = object(t) ? teamName(t.name) : null
        return object(t) && str(t.id) && name ? [{ id: t.id, name }] : []
      })
      return [{ id: c.id, name: c.name, teams }]
    }),
    positions: v.positions.flatMap((p) => {
      const label = object(p) ? localized(p.label) : null
      return object(p) && str(p.id) && label ? [{ id: p.id, label }] : []
    }),
  }
}

export async function fetchOwnSqu(settings: MemberAuthSettings, base: string) {
  return mapped(await memberCall(settings, base, '/me/verification'), toSquState)
}

export async function fetchOwnLeadership(settings: MemberAuthSettings, base: string) {
  return mapped(await memberCall(settings, base, '/me/leadership'), toOwnLeadership)
}

export async function fetchLeadershipOptions(settings: MemberAuthSettings, base: string) {
  return mapped(await memberCall(settings, base, '/me/leadership/options'), toLeadershipOptions)
}

/**
 * Committee leadership when `teamId` is null, team leadership otherwise. Core checks again that
 * requests are open, the committee is active and the team (if any) belongs to it and is active.
 */
export async function requestLeadership(settings: MemberAuthSettings, base: string, choice: { committeeId: string; teamId: string | null; position: string }) {
  return mapped(await memberCall(settings, base, '/me/leadership/requests', 'POST', choice), toOwnLeadership)
}

/** A team that is no longer offered for the chosen committee: the selection starts again. */
export function teamStillOffered(options: LeadershipOptions | null, committeeId: string, teamId: string) {
  return Boolean(options?.committees.find((c) => c.id === committeeId)?.teams.some((t) => t.id === teamId))
}

export const STUDENT_NUMBER = /^[0-9]{6,10}$/

/**
 * The SQU ID card and student number, as multipart: the card prepared by `prepareDocument`
 * (a photo re-encoded without metadata, or a PDF as it is). Core reads the file's real type,
 * checks its size and content, and stores it privately.
 */
export async function submitSquEvidence(
  settings: MemberAuthSettings,
  base: string,
  studentNumber: string,
  document: { blob: Blob; fileName: string },
  fetchImpl: typeof fetch = fetch,
): Promise<MemberResult<SquState>> {
  try {
    const { data, error } = await memberAuthClient(settings).auth.getSession()
    if (error || !data.session) return { ok: false, code: 'SIGNED_OUT', status: 401 }
    const form = new FormData()
    form.set('studentNumber', studentNumber.trim())
    form.set('document', document.blob, document.fileName)
    const response = await fetchImpl(`${base}/me/verification/squ`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${data.session.access_token}`, Accept: 'application/json' },
      body: form,
      credentials: 'omit',
      cache: 'no-store',
      mode: 'cors',
      signal: AbortSignal.timeout(60_000),
    })
    const json = await response.json().catch(() => null)
    if (!response.ok) return { ok: false, status: response.status, code: json?.errors?.[0]?.code ?? json?.reason ?? 'UNAVAILABLE' }
    const squ = toSquState(json?.data)
    return squ ? { ok: true, data: squ } : { ok: false, code: 'UNAVAILABLE', status: 503 }
  } catch {
    return { ok: false, code: 'UNAVAILABLE', status: 503 }
  }
}
