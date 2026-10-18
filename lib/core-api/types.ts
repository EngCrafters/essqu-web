export type CoreEvent = {
  id: string
  title: string
  description: string
  eventDate: string
  location: string | null
  committeeName: string
  availability: 'open' | 'waitlist' | 'closed'
}
export type EventPage = { data: CoreEvent[]; meta: { nextCursor: string | null } }
export type ConflictReason =
  'already-registered' | 'already-waitlisted' | 'event-full' | 'registration-closed' | 'registration-available'
export type RegistrationResult =
  | { ok: true; status: 'confirmed' | 'waitlisted' }
  | { ok: false; code: string; reason?: ConflictReason; requestId?: string; retryAfter?: number }
