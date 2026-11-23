import type { MemberAuthSettings } from '@/lib/member-auth/client'
import { memberCall, type MemberResult } from './member-events'

/**
 * The member's choice about the society's optional announcements (Core ADR 0028):
 * `GET` and `PATCH /me/email-preferences`. Core keeps the choice and applies it to every Email
 * Centre message; unsubscribe links in those messages change the same setting.
 */
export type EmailPreferences = { announcements: boolean }

export function toEmailPreferences(value: unknown): EmailPreferences | null {
  return value && typeof value === 'object' && typeof (value as { announcements?: unknown }).announcements === 'boolean'
    ? { announcements: (value as { announcements: boolean }).announcements }
    : null
}

const mapped = (result: MemberResult<unknown>): MemberResult<EmailPreferences> => {
  if (!result.ok) return result
  const data = toEmailPreferences(result.data)
  return data ? { ok: true, data } : { ok: false, code: 'UNAVAILABLE', status: 503 }
}

export async function fetchEmailPreferences(settings: MemberAuthSettings, base: string) {
  return mapped(await memberCall(settings, base, '/me/email-preferences'))
}

export async function saveEmailPreferences(settings: MemberAuthSettings, base: string, announcements: boolean) {
  return mapped(await memberCall(settings, base, '/me/email-preferences', 'PATCH', { announcements }))
}
