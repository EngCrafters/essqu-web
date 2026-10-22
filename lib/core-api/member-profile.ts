import { DISCIPLINES } from '@/content/disciplines'
import { SKILLS, type SkillId } from '@/content/platform/taxonomy'
import type { DisciplineId } from '@/content/disciplines'
import { memberAuthClient, type MemberAuthSettings } from '@/lib/member-auth/client'
import type { SiteFeatures } from '@/lib/site-features'
import { memberCall, normalizePhone, type MemberResult } from './member-events'

/**
 * The signed-in member's own profile in Core (ADR 0023). Every call carries the Supabase session;
 * Core decides whose profile it is from that token alone, never from anything the page sends.
 */
export type CorrectionField = 'full_name' | 'university_id'
export type OwnProfile = {
  name: string
  email: string
  signInEmail: string | null
  universityId: string
  academicYear: number | null
  discipline: DisciplineId | null
  interests: SkillId[]
  phone: string | null
  hasPhoto: boolean
  photoVersion: string | null
  status: string
  memberSince: string | null
  updatedAt: string | null
  application: { status: string; submittedAt: string | null; verifiedAt: string | null; decidedAt: string | null; activatedAt: string | null } | null
  changeRequests: { field: CorrectionField; status: 'pending' | 'approved' | 'rejected'; requestedValue: string; requestedAt: string; decidedAt: string | null }[]
  features: { photoUploads: boolean; profileEditing: boolean }
}
export type OwnRegistration = {
  eventId: string
  title: string
  eventDate: string
  location: string | null
  status: 'confirmed' | 'waitlisted'
  attended: boolean
  checkedInAt: string | null
  registeredAt: string | null
}
export type ProfileEdit = { phone: string | null; academicYear: number; discipline: DisciplineId; interests: SkillId[] }

export const MAX_INTERESTS = 4
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024
export const PHOTO_TYPES = ['image/jpeg', 'image/png'] as const

const DISCIPLINE_IDS: string[] = DISCIPLINES.map((d) => d.id)

export type EditField = 'phone' | 'academicYear' | 'discipline' | 'interests'
export type ProfileDraft = { phone: string; academicYear: string; discipline: string; interests: SkillId[] }

export const draftOf = (p: OwnProfile): ProfileDraft => ({
  phone: p.phone ?? '',
  academicYear: p.academicYear ? String(p.academicYear) : '',
  discipline: p.discipline ?? '',
  interests: p.interests,
})

/** The same rules Core applies; Core checks again and has the last word. */
export function draftProblems(d: ProfileDraft): Partial<Record<EditField, true>> {
  const e: Partial<Record<EditField, true>> = {}
  if (d.phone.trim() && !normalizePhone(d.phone)) e.phone = true
  if (!/^[1-5]$/.test(d.academicYear)) e.academicYear = true
  if (!DISCIPLINE_IDS.includes(d.discipline)) e.discipline = true
  if (d.interests.length > MAX_INTERESTS || new Set(d.interests).size !== d.interests.length) e.interests = true
  return e
}

export function correctionProblem(field: CorrectionField, value: string): CorrectionField | null {
  const v = value.trim()
  if (field === 'university_id') return /^[0-9]{6,10}$/.test(v) ? null : field
  return v.length >= 2 && v.length <= 200 && !/[\u0000-\u001f\u007f]/.test(v) ? null : field
}

/** A control shows only when the website's switch (site-features.json) and Core's both allow it. */
export const profileControls = (site: SiteFeatures['profile'], core: OwnProfile['features']) => ({
  canEdit: site.allowProfileEditing && core.profileEditing,
  canUpload: site.allowPhotoUpload && core.photoUploads,
})

/** The university address a membership keeps; Core follows only a confirmed SQU email. */
export const isSquEmail = (value: string) => value.length <= 254 && /^[^\s@]+@([a-z0-9-]+\.)*squ\.edu\.om$/.test(value)
const str = (v: unknown): v is string => typeof v === 'string'
const strOrNull = (v: unknown): v is string | null => v === null || typeof v === 'string'
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/** Validate Core's answer before rendering it; an unknown discipline or interest is dropped, not shown. */
export function toOwnProfile(v: unknown): OwnProfile | null {
  if (!object(v) || !str(v.name) || !str(v.email) || !str(v.universityId) || !strOrNull(v.phone) || !str(v.status)) return null
  const app = object(v.application) ? v.application : null
  const features = object(v.features) ? v.features : {}
  return {
    name: v.name,
    email: v.email,
    signInEmail: str(v.signInEmail) ? v.signInEmail : null,
    universityId: v.universityId,
    academicYear: Number.isInteger(v.academicYear) ? (v.academicYear as number) : null,
    discipline: str(v.discipline) && DISCIPLINE_IDS.includes(v.discipline) ? (v.discipline as DisciplineId) : null,
    interests: Array.isArray(v.interests) ? (v.interests.filter((s) => str(s) && s in SKILLS) as SkillId[]) : [],
    phone: v.phone,
    hasPhoto: v.hasPhoto === true,
    photoVersion: str(v.photoVersion) && v.photoVersion ? v.photoVersion : null,
    status: v.status,
    memberSince: str(v.memberSince) ? v.memberSince : null,
    updatedAt: str(v.updatedAt) ? v.updatedAt : null,
    application: app
      ? {
          status: str(app.status) ? app.status : '',
          submittedAt: str(app.submittedAt) ? app.submittedAt : null,
          verifiedAt: str(app.verifiedAt) ? app.verifiedAt : null,
          decidedAt: str(app.decidedAt) ? app.decidedAt : null,
          activatedAt: str(app.activatedAt) ? app.activatedAt : null,
        }
      : null,
    changeRequests: Array.isArray(v.changeRequests)
      ? v.changeRequests.filter(
          (r): r is OwnProfile['changeRequests'][number] =>
            object(r) && (r.field === 'full_name' || r.field === 'university_id') && ['pending', 'approved', 'rejected'].includes(r.status as string) && str(r.requestedValue) && str(r.requestedAt),
        )
      : [],
    features: { photoUploads: features.photoUploads === true, profileEditing: features.profileEditing === true },
  }
}

function toRegistrations(v: unknown): OwnRegistration[] | null {
  if (!object(v) || !Array.isArray(v.registrations)) return null
  return v.registrations.filter(
    (r): r is OwnRegistration =>
      object(r) && str(r.eventId) && str(r.title) && str(r.eventDate) && (r.status === 'confirmed' || r.status === 'waitlisted') && typeof r.attended === 'boolean',
  )
}

const mapped = <T>(result: MemberResult<unknown>, to: (v: unknown) => T | null): MemberResult<T> => {
  if (!result.ok) return result
  const value = to(result.data)
  return value ? { ok: true, data: value } : { ok: false, code: 'UNAVAILABLE', status: 503 }
}

export async function fetchOwnProfile(settings: MemberAuthSettings, base: string) {
  return mapped(await memberCall(settings, base, '/me/profile'), toOwnProfile)
}

/** Core keeps its own copy of the feature switches; it answers with the whole saved profile. */
export async function saveOwnProfile(settings: MemberAuthSettings, base: string, edit: ProfileEdit) {
  return mapped(await memberCall(settings, base, '/me/profile', 'PATCH', edit), toOwnProfile)
}

export async function requestCorrection(settings: MemberAuthSettings, base: string, field: CorrectionField, value: string) {
  return mapped(await memberCall(settings, base, '/me/profile/changes', 'POST', { field, value }), toOwnProfile)
}

export async function fetchOwnRegistrations(settings: MemberAuthSettings, base: string) {
  return mapped(await memberCall(settings, base, '/me/events'), toRegistrations)
}

/** A JPEG or PNG within the size limit; Core checks it again and re-encodes it. */
export function photoProblem(file: { type: string; size: number }): 'invalid' | null {
  return (PHOTO_TYPES as readonly string[]).includes(file.type) && file.size > 0 && file.size <= MAX_PHOTO_BYTES ? null : 'invalid'
}

/** The photo's bytes as-is: Core reads the type, strips metadata and crops it. */
export async function sendPhoto(settings: MemberAuthSettings, base: string, file: Blob | null): Promise<MemberResult<{ code: string }>> {
  try {
    const { data, error } = await memberAuthClient(settings).auth.getSession()
    if (error || !data.session) return { ok: false, code: 'SIGNED_OUT', status: 401 }
    const response = await fetch(`${base}/me/profile/photo`, {
      method: file ? 'PUT' : 'DELETE',
      headers: { Authorization: `Bearer ${data.session.access_token}`, Accept: 'application/json', ...(file ? { 'Content-Type': file.type } : {}) },
      ...(file ? { body: file } : {}),
      credentials: 'omit',
      cache: 'no-store',
      mode: 'cors',
      signal: AbortSignal.timeout(30_000),
    })
    const json = await response.json().catch(() => null)
    if (!response.ok) return { ok: false, status: response.status, code: json?.errors?.[0]?.code ?? json?.reason ?? 'UNAVAILABLE' }
    return { ok: true, data: { code: 'SUCCESS' } }
  } catch {
    return { ok: false, code: 'UNAVAILABLE', status: 503 }
  }
}
