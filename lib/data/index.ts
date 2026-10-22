import { ACTIVITIES, type ActivityId } from '@/content/activities'
import type { DisciplineId } from '@/content/disciplines'
import type { HomeEvent } from '@/content/events'
import type { MediaImage } from '@/content/media'
import { CERTIFICATES, type Certificate } from '@/content/platform/certificates'
import { EVENT_CATALOGUE, type EventView, type PlatformEvent } from '@/content/platform/events'
import { GRADUATES, type Graduate } from '@/content/platform/graduates'
import { DEMO_MEMBER_ID, MEMBERS, type AttendanceStatus, type Member } from '@/content/platform/members'
import { PROJECT_CATALOGUE, type Project } from '@/content/platform/projects'
import { YEARLY_RECORD, type YearRecord } from '@/content/platform/record'
import { toEventView, toHomeEvent } from '@/lib/core-api/adapter'
import { getCoreConfig } from '@/lib/core-api/config.server'
import { getCoreEvent, getRegistrationBaseUrl, listCoreEvents } from '@/lib/core-api/events.server'
import type { Localized } from '@/lib/i18n'
import { routes } from '@/lib/routes'
import { DEMO_NOW } from './clock'
import { getPublishedProject, getPublishedProjects } from '@/lib/core-api/projects.server'

/**
 * The platform's data access. Every page reads through these functions, never from content/
 * directly, so the pages and their components don't know where a record came from.
 *
 * Events are connected to the Core platform (lib/core-api): the homepage's events, /events and
 * /events/[slug] read through `getHomeEvents`, `getEventsTimeline` and `getEventPage`, which
 * return Core's published events and nothing else: if Core isn't configured or can't be reached
 * they say `unavailable`, never sample events in its place. `getEvents`/`getEvent` still return
 * the sample catalogue in content/platform, for the prototype profile pages only.
 */

export type { Certificate, EventView, Graduate, Member, PlatformEvent, Project }
export type { AttendanceStatus }

export { DEMO_NOW }
const NOW = new Date(DEMO_NOW).getTime()

// ---------------------------------------------------------------- events (sample catalogue)

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

/**
 * Events related to this one, nearest in time first. Sample records relate by shared discipline,
 * activity and type; Core events carry none of those, so they relate by organising committee.
 */
function relatedTo<T extends EventView>(event: EventView, candidates: readonly T[], limit: number): T[] {
  const t = new Date(event.start).getTime()
  const sameCommittee = (e: T) =>
    Boolean((e.organizer && e.organizer === event.organizer) || (e.organizerName && e.organizerName.en === event.organizerName?.en))
  return candidates
    .filter((e) => e.slug !== event.slug)
    .map((e) => ({
      e,
      score: event.sample
        ? e.disciplines.filter((d) => event.disciplines.includes(d)).length * 2 +
          (e.activity && e.activity === event.activity ? 3 : 0) +
          (e.type === event.type ? 1 : 0)
        : sameCommittee(e)
          ? 1
          : 0,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || Math.abs(new Date(a.e.start).getTime() - t) - Math.abs(new Date(b.e.start).getTime() - t))
    .slice(0, limit)
    .map((x) => x.e)
}

/** Sample events that share a discipline or an activity, nearest in time first. */
export async function getRelatedEvents(event: PlatformEvent, limit = 3): Promise<PlatformEvent[]> {
  return relatedTo(event, EVENT_CATALOGUE, limit)
}

// ---------------------------------------------------------------- events (Core)

/**
 * Where a listing came from. The public event surfaces only ever return `core`; `sample` remains
 * in the type for the sample-event designs the pages keep for later (the "Sample" labels, the
 * prototype registration), which no public listing feeds any more.
 */
export type EventSource = 'core' | 'sample'

/**
 * How an event page's registration panel registers: Core's public API (`baseUrl` includes /v1; no
 * secret involved), or not at all. `sample` (the in-tab prototype) is never returned for a public
 * event; RegistrationPanel keeps that design for later.
 */
export type RegistrationTransport = { kind: 'sample' } | { kind: 'core'; baseUrl: string } | { kind: 'unavailable' }

/**
 * "Today" for the events pages, computed once on the server and handed to client components, so
 * server and browser agree on what is past.
 */
const eventsNow = () => new Date().toISOString()

const coreConfigured = () => getCoreConfig().mode === 'core'

function registrationTransport(): RegistrationTransport {
  const baseUrl = getRegistrationBaseUrl()
  return baseUrl ? { kind: 'core', baseUrl } : { kind: 'unavailable' }
}

export type EventsResult<T> = { status: 'ok'; source: EventSource; events: T[]; now: string } | { status: 'unavailable' }

/** The homepage's events: the next few upcoming, soonest first (the first one is featured). */
export async function getHomeEvents(limit = 4): Promise<EventsResult<HomeEvent>> {
  if (!coreConfigured()) return { status: 'unavailable' }
  const result = await listCoreEvents('upcoming')
  if (result.status !== 'ok') return { status: 'unavailable' }
  return { status: 'ok', source: 'core', events: result.events.slice(0, limit).map(toHomeEvent), now: eventsNow() }
}

/** /events: every event on the timeline, past and upcoming, soonest first. */
export async function getEventsTimeline(): Promise<EventsResult<EventView>> {
  if (!coreConfigured()) return { status: 'unavailable' }
  const result = await listCoreEvents('all')
  if (result.status !== 'ok') return { status: 'unavailable' }
  const events = result.events.map(toEventView).sort((a, b) => a.start.localeCompare(b.start))
  return { status: 'ok', source: 'core', events, now: eventsNow() }
}

export type EventPageResult =
  | { status: 'ok'; source: EventSource; event: EventView; related: EventView[]; registration: RegistrationTransport; now: string }
  | { status: 'not-found' }
  | { status: 'unavailable' }

/** /events/[slug]: one Core event, related events and how to register. */
export async function getEventPage(slug: string): Promise<EventPageResult> {
  const result = await getCoreEvent(slug)
  if (result.status !== 'ok') return { status: result.status }
  const event = toEventView(result.event)
  // Related events come from the timeline's (cached) list; if that fails the page still stands.
  const list = await listCoreEvents('all')
  const related = list.status === 'ok' ? relatedTo(event, list.events.map(toEventView), 3) : []
  return { status: 'ok', source: 'core', event, related, registration: registrationTransport(), now: eventsNow() }
}

// ---------------------------------------------------------------- projects

export async function getProjects(): Promise<Project[]> {
  return (await getPublishedProjects()) ?? []
}

export async function getProject(slug: string): Promise<Project | null> {
  const result = await getPublishedProject(slug)
  return result.status === 'ok' ? result.project : null
}

export async function getRelatedProjects(project: Project, limit = 3): Promise<Project[]> {
  const ds = [project.discipline, ...(project.alsoDisciplines ?? [])]
  return (await getProjects())
    .filter((p) => p.slug !== project.slug)
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
  /** 'YYYY', 'YYYY-MM' or 'YYYY-MM-DD'; absent when the record is undated. */
  date?: string
  year?: number
  attendance?: { count: number; kind: 'attendees' | 'visitors' }
  image: MediaImage
  gallery: MediaImage[]
  disciplines: DisciplineId[]
  summary?: Localized
}

/** One record per documented edition of an activity, newest first; undated records last. */
export async function getArchive(): Promise<ArchiveEntry[]> {
  return ACTIVITIES.flatMap((activity) =>
    activity.editions.map((e) => ({
      id: e.id,
      activity: activity.id,
      title: e.title,
      date: e.date,
      year: e.date ? Number(e.date.slice(0, 4)) : undefined,
      attendance: e.attendance,
      image: e.photos[0]!,
      gallery: e.photos,
      disciplines: [],
    })),
  ).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
}

// ---------------------------------------------------------------- the yearly record

export type { YearRecord }

/** Activities and projects per year, oldest first. `sample` stays true until real records exist. */
export async function getYearlyRecord(): Promise<{ sample: boolean; years: YearRecord[] }> {
  return { sample: YEARLY_RECORD.sample, years: [...YEARLY_RECORD.years].sort((a, b) => a.year - b.year) }
}
