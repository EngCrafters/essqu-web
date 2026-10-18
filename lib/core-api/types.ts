/**
 * The Core Public API v1 contract, as the landing consumes it. Source of truth: the Core
 * repository's `docs/api/openapi.v1.yaml` (engsoc-platform). Within v1 Core promises that no field
 * is removed, no type changes and no error code changes meaning; anything else is a /v2.
 *
 * These are wire shapes only. Components never see them: `adapter.ts` turns them into the site's
 * own view model.
 */

/** Derived by Core from status, capacity and the waitlist. Never inferred on the landing. */
export type CoreAvailability = 'open' | 'waitlist' | 'closed'

/** `components/schemas/Event`. */
export interface CoreEvent {
  /** UUID. */
  id: string
  /** Single-language text, as the committee wrote it. */
  title: string
  /** Plain text; blank lines separate paragraphs. */
  description: string
  /** ISO 8601 date-time with offset (the event's start; v1 has no end time). */
  eventDate: string
  location: string | null
  committeeName: string
  availability: CoreAvailability
}

/** `components/schemas/EventList`. Pages hold at most 20 events; pass `nextCursor` back verbatim. */
export interface CoreEventList {
  data: CoreEvent[]
  meta: { nextCursor: string | null }
}

/** `components/schemas/Problem` `code`: the complete public error vocabulary of v1. */
export type CoreProblemCode =
  | 'bad-request'
  | 'unsupported-media-type'
  | 'payload-too-large'
  | 'invalid-fields'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'rate-limited'
  | 'service-unavailable'

/** RFC 9457 problem details. `type` and `requestId` are never shown to visitors. */
export interface CoreProblem {
  status: number
  code: CoreProblemCode
  requestId: string
  errors?: { field: string; code: string }[]
}

/** POST /events/{eventId}/registrations request body. Core rejects any other field. */
export interface CoreRegistrationRequest {
  attendeeName: string
  attendeeEmail: string
  intent: 'register' | 'join_waitlist'
}

/** 201 response `data.status`. */
export type CoreRegistrationStatus = 'confirmed' | 'waitlisted'
