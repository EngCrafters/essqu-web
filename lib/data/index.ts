import { ACTIVITIES, type ActivityId } from '@/content/activities'
import type { DisciplineId } from '@/content/disciplines'
import type { MediaImage } from '@/content/media'
import { ARCHIVE_DETAILS, ARCHIVE_PHOTOS } from '@/content/platform/archive'
import { CERTIFICATES, type Certificate } from '@/content/platform/certificates'
import { EVENT_CATALOGUE, type PlatformEvent } from '@/content/platform/events'
import { GRADUATES, type Graduate } from '@/content/platform/graduates'
import { DEMO_MEMBER_ID, MEMBERS, type AttendanceStatus, type Member } from '@/content/platform/members'
import { PROJECT_CATALOGUE, type Project } from '@/content/platform/projects'
import { YEARLY_RECORD, type YearRecord } from '@/content/platform/record'
import type { Localized } from '@/lib/i18n'
import { routes } from '@/lib/routes'
import { DEMO_NOW } from './clock'

/**
 * The platform's data access. Every page reads through these functions, never from content/
 * directly, so connecting the real API means replacing the bodies here (fetch, auth headers,
 * error handling) while the pages and their components stay as they are.
 *
 * Today they return the local sample records from content/platform. They are async on purpose:
 * pages already await them exactly as they will await the API.
 */

export type { Certificate, Graduate, Member, PlatformEvent, Project }
export type { AttendanceStatus }

export { DEMO_NOW }
const NOW = new Date(DEMO_NOW).getTime()

// ---------------------------------------------------------------- events

export type EventPhase = 'upcoming' | 'past'

export function eventPhase(e: Pick<PlatformEvent, 'end'>): EventPhase {
  return new Date(e.end).getTime() < NOW ? 'past' : 'upcoming'
}

export function seatsLeft(e: Pick<PlatformEvent, 'capacity' | 'registered'>) {
  return Math.max(0, e.capacity - e.registered)
}

export async function getEvents(): Promise<PlatformEvent[]> {
  return [...EVENT_CATALOGUE].sort((a, b) => a.start.localeCompare(b.start))
}

export async function getEvent(slug: string): Promise<PlatformEvent | null> {
  return EVENT_CATALOGUE.find((e) => e.slug === slug) ?? null
}

/** Events that share a discipline or an activity, nearest in time first. */
export async function getRelatedEvents(event: PlatformEvent, limit = 3): Promise<PlatformEvent[]> {
  const t = new Date(event.start).getTime()
  return EVENT_CATALOGUE.filter((e) => e.slug !== event.slug)
    .map((e) => ({
      e,
      score:
        e.disciplines.filter((d) => event.disciplines.includes(d)).length * 2 +
        (e.activity && e.activity === event.activity ? 3 : 0) +
        (e.type === event.type ? 1 : 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || Math.abs(new Date(a.e.start).getTime() - t) - Math.abs(new Date(b.e.start).getTime() - t))
    .slice(0, limit)
    .map((x) => x.e)
}

// ---------------------------------------------------------------- projects

export async function getProjects(): Promise<Project[]> {
  return [...PROJECT_CATALOGUE].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || b.year - a.year)
}

export async function getProject(slug: string): Promise<Project | null> {
  return PROJECT_CATALOGUE.find((p) => p.slug === slug) ?? null
}

export async function getRelatedProjects(project: Project, limit = 3): Promise<Project[]> {
  const ds = [project.discipline, ...(project.alsoDisciplines ?? [])]
  return PROJECT_CATALOGUE.filter((p) => p.slug !== project.slug)
    .map((p) => ({
      p,
      score:
        [p.discipline, ...(p.alsoDisciplines ?? [])].filter((d) => ds.includes(d)).length * 2 +
        p.technologies.filter((t) => project.technologies.includes(t)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p)
}

// ---------------------------------------------------------------- people

/** What the public directory may show: no attendance, no contact details. */
export interface MemberSummary {
  id: string
  name: Localized
  discipline: DisciplineId
  year: number
  joined: string
  interests: Member['interests']
  headline: Localized
  projects: number
  sample: true
}

export async function getMembers(): Promise<MemberSummary[]> {
  return MEMBERS.map((m) => ({
    id: m.id,
    name: m.name,
    discipline: m.discipline,
    year: m.year,
    joined: m.joined,
    interests: m.interests,
    headline: m.headline,
    projects: PROJECT_CATALOGUE.filter((p) => p.contributors.includes(m.id)).length,
    sample: true,
  }))
}

export type JourneyStage = 'joined' | 'participated' | 'attended' | 'built' | 'earned' | 'graduated'

export interface JourneyMilestone {
  stage: JourneyStage
  /** ISO date or year; null when the stage has not been reached. */
  date: string | null
  /** What marked it, e.g. the first event attended. */
  label?: Localized
  /** Where that record lives on the site. */
  href?: string
  reached: boolean
}

export interface AttendanceEntry {
  event: PlatformEvent
  status: AttendanceStatus
  /** A participation/completion certificate can follow once attendance is confirmed. */
  certificate: 'issued' | 'eligible' | 'awaiting-attendance' | 'not-eligible' | 'after-event'
}

export interface MemberProfile {
  member: Member
  attendance: AttendanceEntry[]
  projects: Project[]
  certificates: Certificate[]
  journey: JourneyMilestone[]
}

function buildProfile(member: Member): MemberProfile {
  const certificates = CERTIFICATES.filter((c) => c.member === member.id).sort((a, b) => b.issued.localeCompare(a.issued))
  const attendance: AttendanceEntry[] = member.attendance
    .map((r) => {
      const event = EVENT_CATALOGUE.find((e) => e.slug === r.event)
      if (!event) return null
      const issued = certificates.some((c) => c.eventSlug === event.slug && c.status === 'valid')
      const certificate: AttendanceEntry['certificate'] =
        eventPhase(event) === 'upcoming'
          ? 'after-event'
          : issued
            ? 'issued'
            : r.status === 'attended'
              ? 'eligible'
              : r.status === 'pending'
                ? 'awaiting-attendance'
                : 'not-eligible'
      return { event, status: r.status, certificate }
    })
    .filter((x): x is AttendanceEntry => x !== null)
    .sort((a, b) => b.event.start.localeCompare(a.event.start))
  const projects = PROJECT_CATALOGUE.filter((p) => p.contributors.includes(member.id)).sort((a, b) => b.year - a.year)

  const chronological = [...attendance].sort((a, b) => a.event.start.localeCompare(b.event.start))
  const firstAny = chronological[0]
  const firstAttended = chronological.find((x) => x.status === 'attended')
  const firstProject = [...projects].sort((a, b) => a.year - b.year)[0]
  const firstCertificate = [...certificates].filter((c) => c.status === 'valid').sort((a, b) => a.issued.localeCompare(b.issued))[0]
  const journey: JourneyMilestone[] = [
    { stage: 'joined', date: `${member.joined}-01`, reached: true },
    {
      stage: 'participated',
      date: firstAny?.event.start ?? null,
      label: firstAny?.event.title,
      href: firstAny && routes.event(firstAny.event.slug),
      reached: Boolean(firstAny),
    },
    {
      stage: 'attended',
      date: firstAttended?.event.start ?? null,
      label: firstAttended?.event.title,
      href: firstAttended && routes.event(firstAttended.event.slug),
      reached: Boolean(firstAttended),
    },
    {
      stage: 'built',
      date: firstProject ? String(firstProject.year) : null,
      label: firstProject?.title,
      href: firstProject && routes.project(firstProject.slug),
      reached: Boolean(firstProject),
    },
    {
      stage: 'earned',
      date: firstCertificate?.issued ?? null,
      label: firstCertificate?.event,
      href: firstCertificate && routes.certificate(firstCertificate.id),
      reached: Boolean(firstCertificate),
    },
    { stage: 'graduated', date: String(member.expectedGraduation), reached: false },
  ]
  return { member, attendance, projects, certificates, journey }
}

export async function getMemberProfile(id: string): Promise<MemberProfile | null> {
  const member = MEMBERS.find((m) => m.id === id)
  return member ? buildProfile(member) : null
}

/** The prototype's signed-in member. Replace with the session's member once auth exists. */
export async function getCurrentMember(): Promise<MemberProfile> {
  return buildProfile(MEMBERS.find((m) => m.id === DEMO_MEMBER_ID)!)
}

export async function getMemberNames(ids: string[]): Promise<{ id: string; name: Localized; discipline: DisciplineId }[]> {
  return ids.flatMap((id) => {
    const m = MEMBERS.find((x) => x.id === id)
    return m ? [{ id: m.id, name: m.name, discipline: m.discipline }] : []
  })
}

export async function getGraduates(): Promise<Graduate[]> {
  return [...GRADUATES].sort((a, b) => b.graduated - a.graduated)
}

export async function getGraduate(id: string): Promise<Graduate | null> {
  return GRADUATES.find((g) => g.id === id) ?? null
}

/** Graduates who share a discipline or an industry with this one, nearest graduation year first. */
export async function getRelatedGraduates(graduate: Graduate, limit = 3): Promise<Graduate[]> {
  return GRADUATES.filter((g) => g.id !== graduate.id && (g.discipline === graduate.discipline || g.industry === graduate.industry))
    .sort((a, b) => Math.abs(a.graduated - graduate.graduated) - Math.abs(b.graduated - graduate.graduated))
    .slice(0, limit)
}

// ---------------------------------------------------------------- certificates

export async function getCertificates(memberId: string = DEMO_MEMBER_ID): Promise<Certificate[]> {
  return CERTIFICATES.filter((c) => c.member === memberId).sort((a, b) => b.issued.localeCompare(a.issued))
}

export async function getCertificate(id: string): Promise<(Certificate & { memberName: Localized }) | null> {
  const c = CERTIFICATES.find((x) => x.id === id)
  if (!c) return null
  const member = MEMBERS.find((m) => m.id === c.member)
  return { ...c, memberName: member?.name ?? { en: '—', ar: '—' } }
}

/** Look a certificate up by its verification code (case-insensitive). Prototype records only. */
export async function verifyCertificate(code: string): Promise<(Certificate & { memberName: Localized }) | null> {
  const c = CERTIFICATES.find((x) => x.code.toLowerCase() === code.trim().toLowerCase())
  return c ? getCertificate(c.id) : null
}

// ---------------------------------------------------------------- activities archive

export interface ArchiveEntry {
  id: string
  activity: ActivityId
  title: Localized
  date: string
  year: number
  attendance: { count: number; kind: 'attendees' | 'visitors' }
  image: MediaImage
  gallery: MediaImage[]
  disciplines: DisciplineId[]
  summary: Localized
  demo: boolean
}

export async function getArchive(): Promise<ArchiveEntry[]> {
  return ACTIVITIES.flatMap((activity) =>
    activity.events.map((e) => {
      const detail = ARCHIVE_DETAILS[e.id]
      return {
        id: e.id,
        activity: activity.id,
        title: e.title,
        date: e.date,
        year: Number(e.date.slice(0, 4)),
        attendance: e.attendance,
        image: e.image,
        gallery: [e.image, ...(detail?.gallery ?? []).map((k) => ({ ...ARCHIVE_PHOTOS[k], alt: e.image.alt }))].filter(
          (img, i, all) => all.findIndex((x) => x.src === img.src) === i,
        ),
        disciplines: detail?.disciplines ?? [],
        summary: detail?.summary ?? e.title,
        demo: Boolean(e.demo),
      }
    }),
  ).sort((a, b) => b.date.localeCompare(a.date))
}

// ---------------------------------------------------------------- the yearly record

export type { YearRecord }

/** Activities and projects per year, oldest first. `sample` stays true until real records exist. */
export async function getYearlyRecord(): Promise<{ sample: boolean; years: YearRecord[] }> {
  return { sample: YEARLY_RECORD.sample, years: [...YEARLY_RECORD.years].sort((a, b) => a.year - b.year) }
}
