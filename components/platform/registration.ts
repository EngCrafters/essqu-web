import type { EventView } from '@/content/platform/events'
import { DEMO_NOW } from '@/lib/data/clock'
import type { RegistrationState } from './DemoSession'
import type { StatusTone } from './Platform'

/**
 * One status per event for this visitor, combining the event's own registration state, the
 * sample member's records (`held`: events the member is already registered for) and what the
 * visitor did in this tab. Used by the listing, the detail page and the profile alike.
 *
 * `now` is the events pages' "today": the prototype's fixed date for sample events (the default,
 * so the profile reads exactly as before), the real time for events from Core.
 */
export type EventStatus = 'open' | 'registered' | 'waitlisted' | 'waitlist' | 'full' | 'closed' | 'completed'

/** An event is past once it has ended, or, when only its start is published (Core), once it has started. */
export function isPast(e: Pick<EventView, 'start' | 'end'>, now: string = DEMO_NOW) {
  return new Date(e.end ?? e.start).getTime() < new Date(now).getTime()
}

export function myRegistration(slug: string, session: Record<string, RegistrationState>, held: readonly string[]) {
  const mine = session[slug] ?? (held.includes(slug) ? 'registered' : undefined)
  return mine === 'cancelled' ? undefined : mine
}

export function eventStatus(e: EventView, mine: 'registered' | 'waitlisted' | undefined, now?: string): EventStatus {
  if (isPast(e, now)) return 'completed'
  if (mine) return mine
  if (e.registration === 'open') return e.capacity !== undefined && e.registered !== undefined && e.registered >= e.capacity ? 'full' : 'open'
  return e.registration
}

/**
 * Seats taken, counting this visitor's own registration made in this tab. Null when the event
 * publishes no capacity or count (Core keeps them private), so nothing is drawn for it.
 */
export function seatsTaken(e: EventView, session: Record<string, RegistrationState>, held: readonly string[]): number | null {
  if (e.capacity === undefined || e.registered === undefined) return null
  const s = session[e.slug]
  if (s === 'registered' && !held.includes(e.slug)) return Math.min(e.capacity, e.registered + 1)
  if (s === 'cancelled' && held.includes(e.slug)) return Math.max(0, e.registered - 1)
  return e.registered
}

export const STATUS_TONE: Record<EventStatus, StatusTone> = {
  open: 'open',
  registered: 'positive',
  waitlisted: 'waiting',
  waitlist: 'waiting',
  full: 'negative',
  closed: 'neutral',
  completed: 'done',
}
