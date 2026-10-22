/**
 * Supabase Auth errors reduced to what a visitor can act on. No provider message, status or
 * token is ever shown; and nothing here distinguishes "no such account" from "wrong password".
 */
export type AuthProblem =
  | 'invalid-credentials'
  | 'email-not-confirmed'
  | 'weak-password'
  | 'same-password'
  | 'rate-limited'
  | 'disabled'
  | 'session-missing'
  | 'link-expired'
  | 'unavailable'

export function classifyAuthError(error: { code?: string; status?: number; message?: string; name?: string } | null | undefined): AuthProblem {
  const code = error?.code ?? ''
  const status = error?.status ?? 0
  const text = `${code} ${error?.message ?? ''}`.toLowerCase()
  if (code === 'invalid_credentials' || code === 'user_not_found' || text.includes('invalid login credentials')) return 'invalid-credentials'
  if (code === 'email_not_confirmed' || text.includes('email not confirmed')) return 'email-not-confirmed'
  if (code === 'weak_password') return 'weak-password'
  if (code === 'same_password') return 'same-password'
  if (code === 'user_banned') return 'disabled'
  if (code === 'otp_expired' || text.includes('expired')) return code.startsWith('session') ? 'session-missing' : 'link-expired'
  if (code === 'session_not_found' || code === 'session_expired' || code === 'refresh_token_not_found' || error?.name === 'AuthSessionMissingError') return 'session-missing'
  if (status === 429 || code.startsWith('over_')) return 'rate-limited'
  // Anything unrecognised is reported as a failure to complete, never guessed at.
  return 'unavailable'
}
