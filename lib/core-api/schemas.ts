import type { CoreAvailability, CoreEvent, CoreEventList, CoreProblem, CoreProblemCode, CoreRegistrationStatus } from './types'

/*
 * Runtime validation of Core's JSON at the HTTP boundary. A response that isn't the v1 shape
 * becomes a controlled `invalid-response`, never a crash or a half-rendered card. Hand-written
 * on purpose: the contract is seven fields, so a schema library would cost more than it saves.
 */

export type Parsed<T> = { ok: true; value: T } | { ok: false }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const AVAILABILITY: readonly CoreAvailability[] = ['open', 'waitlist', 'closed']
const PROBLEM_CODES: readonly CoreProblemCode[] = [
  'bad-request',
  'unsupported-media-type',
  'payload-too-large',
  'invalid-fields',
  'unauthorized',
  'forbidden',
  'not-found',
  'conflict',
  'rate-limited',
  'service-unavailable',
]

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Core event ids are UUIDs; anything else is answered as not found without asking Core. */
export const isEventId = (value: string) => UUID.test(value)

/** ISO 8601 date-time with an explicit offset (`Z` or `±hh:mm`), as the contract specifies. */
const isDateTime = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(v) && Number.isFinite(Date.parse(v))

export function parseEvent(input: unknown): Parsed<CoreEvent> {
  if (!isRecord(input)) return { ok: false }
  const { id, title, description, eventDate, location, committeeName, availability } = input
  if (typeof id !== 'string' || !isEventId(id)) return { ok: false }
  if (typeof title !== 'string' || title.trim() === '') return { ok: false }
  if (typeof description !== 'string') return { ok: false }
  if (!isDateTime(eventDate)) return { ok: false }
  if (location !== null && typeof location !== 'string') return { ok: false }
  if (typeof committeeName !== 'string') return { ok: false }
  if (typeof availability !== 'string' || !AVAILABILITY.includes(availability as CoreAvailability)) return { ok: false }
  return {
    ok: true,
    value: {
      id: id.toLowerCase(),
      title: title.trim(),
      description,
      eventDate,
      location: location?.trim() ? location.trim() : null,
      committeeName: committeeName.trim(),
      availability: availability as CoreAvailability,
    },
  }
}

/**
 * GET /events. A malformed envelope fails the whole page; a single malformed event is dropped
 * and counted, so one bad record can't take the timeline down with it.
 */
export function parseEventList(input: unknown): Parsed<CoreEventList & { dropped: number }> {
  if (!isRecord(input) || !Array.isArray(input.data) || !isRecord(input.meta)) return { ok: false }
  const cursor = input.meta.nextCursor
  if (cursor !== null && (typeof cursor !== 'string' || cursor === '')) return { ok: false }
  const data: CoreEvent[] = []
  let dropped = 0
  for (const item of input.data) {
    const parsed = parseEvent(item)
    if (parsed.ok) data.push(parsed.value)
    else dropped++
  }
  return { ok: true, value: { data, meta: { nextCursor: cursor }, dropped } }
}

/** GET /events/{eventId}: `{ data: Event }`. */
export function parseEventDetail(input: unknown): Parsed<CoreEvent> {
  return isRecord(input) ? parseEvent(input.data) : { ok: false }
}

/** An `application/problem+json` body, or nothing usable. */
export function parseProblem(input: unknown): CoreProblem | null {
  if (!isRecord(input) || typeof input.code !== 'string' || !PROBLEM_CODES.includes(input.code as CoreProblemCode)) return null
  const errors = Array.isArray(input.errors)
    ? input.errors.filter((e): e is { field: string; code: string } => isRecord(e) && typeof e.field === 'string' && typeof e.code === 'string')
    : undefined
  return {
    status: typeof input.status === 'number' ? input.status : 0,
    code: input.code as CoreProblemCode,
    requestId: typeof input.requestId === 'string' ? input.requestId : '',
    ...(errors?.length ? { errors } : {}),
  }
}

/** 201 `{ data: { status } }`. Anything else is never reported to a visitor as success. */
export function parseRegistrationStatus(input: unknown): CoreRegistrationStatus | null {
  if (!isRecord(input) || !isRecord(input.data)) return null
  const status = input.data.status
  return status === 'confirmed' || status === 'waitlisted' ? status : null
}
