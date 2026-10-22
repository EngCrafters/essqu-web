import type { DrawingId } from '@/components/ui/drawings'
import type { HomeEvent } from '@/content/events'
import type { EventView } from '@/content/platform/events'
import { COMMITTEES } from '@/content/structure'
import type { Localized } from '@/lib/i18n'
import type { CoreEvent } from './types'
import { descriptionTokens, plainDescription } from '@/lib/event-description'

/*
 * Core API DTO → the site's own view models. Presentation only: it splits text into paragraphs,
 * picks a decorative drawing and recognises a committee the site already names. It invents no
 * facts: no type, end time, capacity, programme, discipline or photograph that Core didn't send.
 */

/** Core text is single-language (as the committee wrote it); it reads the same in both languages. */
const both = (value: string): Localized => ({ en: value, ar: value })

/** Longest summary shown whole under a title or on a card; longer openings are shortened. */
const SUMMARY_MAX = 280

/**
 * Core keeps line breaks (its own pages render the text pre-wrapped), so every non-empty line is
 * a paragraph here.
 */
export function paragraphs(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function shorten(text: string, max: number) {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const space = cut.lastIndexOf(' ')
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–—-]+$/, '')}…`
}

/**
 * The summary is the description's first paragraph; "About this event" holds the rest, so nothing
 * is said twice. A long first paragraph is shortened for the summary and kept whole below.
 */
export function splitDescription(description: string): { summary: string; about: string[] } {
  const all = paragraphs(description)
  const original = all[0] ?? ''
  const first = plainDescription(original)
  if (descriptionTokens(original).some((token) => token.href)) return { summary: shorten(first, SUMMARY_MAX), about: all }
  if (first.length <= SUMMARY_MAX) return { summary: first, about: all.slice(1) }
  return { summary: shorten(first, SUMMARY_MAX), about: all }
}

/** The event-sheet drawings, in a fixed order. An event keeps the same one on every page. */
export const EVENT_DRAWINGS: readonly DrawingId[] = [
  'robotics-workshop',
  'careers-panel',
  'site-visit',
  'truss',
  'sensor-node',
  'shelter',
  'water-bench',
  'rover',
]

/** A stable decorative fallback for events without a cover image. */
export function drawingFor(id: string): DrawingId {
  // FNV-1a with a final avalanche, so ids that differ in a few characters still spread out.
  let hash = 2166136261
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x85ebca6b)
  hash ^= hash >>> 13
  return EVENT_DRAWINGS[(hash >>> 0) % EVENT_DRAWINGS.length]!
}

const normalise = (s: string) => s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()

/**
 * The organising committee: when Core's name is exactly one the site already lists (in English or
 * Arabic), that committee's id, so the page shows its bilingual name and links to the structure.
 * Otherwise Core's name as written. No fuzzy matching: a near miss would name the wrong committee.
 */
export function organiserFor(committeeName: string): { organizer?: string; organizerName?: Localized } {
  if (!committeeName) return {}
  const key = normalise(committeeName)
  const known = COMMITTEES.find((c) => normalise(c.name.en) === key || normalise(c.name.ar) === key)
  return known ? { organizer: known.id } : { organizerName: both(committeeName) }
}

/** /events and /events/[slug]. */
export function toEventView(event: CoreEvent): EventView {
  const { summary, about } = splitDescription(event.description)
  return {
    slug: event.id,
    sample: false,
    title: both(event.title),
    start: event.eventDate,
    location: event.location ? both(event.location) : null,
    summary: both(summary),
    about: about.map(both),
    disciplines: [],
    ...organiserFor(event.committeeName),
    registration: event.availability,
    schedule: [],
    drawing: drawingFor(event.id),
    phoneRequired: event.phoneRequired ?? false,
    ...(event.coverImageUrl
      ? {
          image: {
            src: `/media/events/${event.id}${event.coverImageUrl.includes('?') ? event.coverImageUrl.slice(event.coverImageUrl.indexOf('?')) : ''}`,
            alt: both(event.title),
          },
        }
      : {}),
  }
}

/** The committee's name as shown: the site's bilingual name for one it lists, otherwise Core's. */
export function organiserName(committeeName: string): Localized | undefined {
  const { organizer, organizerName } = organiserFor(committeeName)
  return organizer ? COMMITTEES.find((c) => c.id === organizer)?.name : organizerName
}

/** The homepage's events section. */
export function toHomeEvent(event: CoreEvent): HomeEvent {
  const organiser = organiserName(event.committeeName)
  return {
    id: event.id,
    sample: false,
    title: both(event.title),
    start: event.eventDate,
    location: event.location ? both(event.location) : null,
    description: both(splitDescription(event.description).summary),
    registration: event.availability,
    drawing: drawingFor(event.id),
    ...(event.coverImageUrl
      ? {
          image: {
            src: `/media/events/${event.id}${event.coverImageUrl.includes('?') ? event.coverImageUrl.slice(event.coverImageUrl.indexOf('?')) : ''}`,
            alt: both(event.title),
          },
        }
      : {}),
    ...(organiser ? { organiser } : {}),
  }
}
