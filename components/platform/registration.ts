import type { PlatformEvent } from '@/content/platform/events'
import { DEMO_NOW } from '@/lib/data/clock'
import type { RegistrationState } from './DemoSession'
import type { StatusTone } from './Platform'

/**
 * One status per event for this visitor, combining the event's own registration state, the
 * sample member's records (`held`: events the member is already registered for) and what the
 * visitor did in this tab. Used by the listing, the detail page and the profile alike.
 */
export type EventStatus = 'open' | 'registered' | 'waitlisted' | 'waitlist' | 'full' | 'closed' | 'completed'

const NOW = new Date(DEMO_NOW).getTime()

export function isPast(e: Pick<PlatformEvent, 'end'>) {
  return new Date(e.end).getTime() < NOW
}

export function myRegistration(slug: string, session: Record<string, RegistrationState>, held: readonly string[]) {
  const mine = session[slug] ?? (held.includes(slug) ? 'registered' : undefined)
  return mine === 'cancelled' ? undefined : mine
}

export function eventStatus(e: PlatformEvent, mine: 'registered' | 'waitlisted' | undefined): EventStatus {
  if (isPast(e)) return 'completed'
  if (mine) return mine
  if (e.registration === 'open') return e.registered >= e.capacity ? 'full' : 'open'
  return e.registration
}

/** Seats taken, counting this visitor's own registration made in this tab. */
export function seatsTaken(e: PlatformEvent, session: Record<string, RegistrationState>, held: readonly string[]) {
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
