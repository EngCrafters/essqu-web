import type { CoreEvent, EventPage } from './types'

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid Core response')
  return value as Record<string, unknown>
}
export function parseEvent(value: unknown): CoreEvent {
  const row = object(value)
  if (
    typeof row.id !== 'string' ||
    !UUID.test(row.id) ||
    !['title', 'description', 'eventDate', 'committeeName'].every((key) => typeof row[key] === 'string') ||
    !Number.isFinite(Date.parse(row.eventDate as string)) ||
    !(row.location === null || typeof row.location === 'string') ||
    !['open', 'waitlist', 'closed'].includes(row.availability as string)
  )
    throw new Error('Invalid Core event')
  return {
    id: row.id,
    title: row.title as string,
    description: row.description as string,
    eventDate: row.eventDate as string,
    location: row.location as string | null,
    committeeName: row.committeeName as string,
    availability: row.availability as CoreEvent['availability'],
  }
}
export function parsePage(value: unknown): EventPage {
  const row = object(value),
    meta = object(row.meta)
  if (
    !Array.isArray(row.data) ||
    row.data.length > 20 ||
    !(meta.nextCursor === null || typeof meta.nextCursor === 'string')
  )
    throw new Error('Invalid Core page')
  return { data: row.data.map(parseEvent), meta: { nextCursor: meta.nextCursor as string | null } }
}
export function parseDetail(value: unknown): CoreEvent {
  return parseEvent(object(value).data)
}
