import 'server-only'
import { cache } from 'react'
import { coreGetJson } from './client.server'
import { getCoreConfig, type ConfigProblem, type CoreModeConfig } from './config.server'
import { CoreApiError, toCoreError, type CoreErrorKind } from './errors'
import { isEventId, parseEventDetail, parseEventList } from './schemas'
import type { CoreEvent } from './types'

/*
 * Event reads from Core, for lib/data (pages never call these directly). Both functions resolve,
 * never throw: a Core failure becomes `unavailable` and the page around it keeps rendering. They
 * are memoised per request (React `cache`), so a page and its metadata share one round of calls;
 * across requests the HTTP responses are cached by Next.js (client.server.ts). Revalidate on
 * demand with `revalidateTag(EVENTS_TAG)`.
 */

export const EVENTS_TAG = 'core-events'
export const eventTag = (id: string) => `core-event:${id}`

/**
 * Core pages hold 20 events. Upcoming events are followed for up to five pages (100 events, far
 * beyond a society's calendar); past events stop at the 20 most recent, which is all the
 * timeline shows before "Show earlier events" folds them away anyway.
 */
export const PAGE_LIMITS = { upcoming: 5, past: 1 } as const

export type Unavailable = { status: 'unavailable'; reason: CoreErrorKind | ConfigProblem | 'not-core-mode' }
export type CoreListResult = { status: 'ok'; events: CoreEvent[] } | Unavailable
export type CoreDetailResult = { status: 'ok'; event: CoreEvent } | { status: 'not-found' } | Unavailable

function coreConfig(): CoreModeConfig | Unavailable {
  const config = getCoreConfig()
  if (config.mode === 'core') return config
  return { status: 'unavailable', reason: config.mode === 'unconfigured' ? config.problem : 'not-core-mode' }
}

async function listPeriod(config: CoreModeConfig, period: 'upcoming' | 'past'): Promise<CoreEvent[]> {
  const events: CoreEvent[] = []
  let cursor: string | null = null
  for (let page = 0; page < PAGE_LIMITS[period]; page++) {
    const query = new URLSearchParams({ period })
    // Opaque: passed back exactly as Core sent it, never built or decoded here.
    if (cursor) query.set('cursor', cursor)
    const body = await coreGetJson(config, { path: `/events?${query}`, route: `GET /events?period=${period}`, tags: [EVENTS_TAG] })
    const parsed = parseEventList(body)
    if (!parsed.ok) throw new CoreApiError('invalid-response')
    if (parsed.value.dropped > 0) console.warn(JSON.stringify({ source: 'core-api', route: 'GET /events', dropped: parsed.value.dropped }))
    events.push(...parsed.value.data)
    cursor = parsed.value.meta.nextCursor
    if (!cursor) break
  }
  return events
}

/**
 * Published events. `upcoming`: soonest first. `all`: upcoming and recent past together (the
 * timeline orders them itself). An event that moved from upcoming to past between two cached
 * pages appears once.
 */
export const listCoreEvents = cache(async (scope: 'upcoming' | 'all'): Promise<CoreListResult> => {
  const config = coreConfig()
  if ('status' in config) return config
  try {
    const [upcoming, past] = await Promise.all([listPeriod(config, 'upcoming'), scope === 'all' ? listPeriod(config, 'past') : Promise.resolve([])])
    const seen = new Set<string>()
    const events = [...upcoming, ...past].filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
    return { status: 'ok', events }
  } catch (error) {
    return { status: 'unavailable', reason: toCoreError(error).kind }
  }
})

/** One published event. Draft, archived and unknown ids are all `not-found`, as Core answers them. */
export const getCoreEvent = cache(async (id: string): Promise<CoreDetailResult> => {
  // Anything that can't be a Core id is a 404 without a round trip.
  if (!isEventId(id)) return { status: 'not-found' }
  const config = coreConfig()
  if ('status' in config) return config
  try {
    const body = await coreGetJson(config, { path: `/events/${encodeURIComponent(id)}`, route: 'GET /events/{eventId}', tags: [EVENTS_TAG, eventTag(id.toLowerCase())] })
    const parsed = parseEventDetail(body)
    // A record for another id is as wrong as no record at all.
    if (!parsed.ok || parsed.value.id !== id.toLowerCase()) throw new CoreApiError('invalid-response')
    return { status: 'ok', event: parsed.value }
  } catch (error) {
    const kind = toCoreError(error).kind
    return kind === 'not-found' ? { status: 'not-found' } : { status: 'unavailable', reason: kind }
  }
})

/**
 * Where a visitor's browser posts a registration: Core's public base URL. Not a secret (it is the
 * API's public address); registration carries no key and no cookie. Null outside Core mode.
 */
export function getRegistrationBaseUrl(): string | null {
  const config = getCoreConfig()
  return config.mode === 'core' ? config.baseUrl : null
}
