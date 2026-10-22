/**
 * The password rule, which is Supabase Auth's own policy for this project: at least 8 characters
 * (the owner's decision of 20 October 2026; Supabase's "Minimum password length" must say 8 too)
 * and at most 72 bytes, the most Supabase Auth accepts. Nothing stricter is invented here, so the
 * form never accepts what Auth would refuse or refuses what Auth would accept.
 */
export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_BYTES = 72

export type PasswordProblem = 'required' | 'too-short' | 'too-long'
export type ConfirmationProblem = 'required' | 'mismatch'

export function checkPassword(value: string): PasswordProblem | null {
  if (!value) return 'required'
  if ([...value].length < MIN_PASSWORD_LENGTH) return 'too-short'
  if (new TextEncoder().encode(value).length > MAX_PASSWORD_BYTES) return 'too-long'
  return null
}

export function checkConfirmation(password: string, confirmation: string): ConfirmationProblem | null {
  if (!confirmation) return 'required'
  return confirmation === password ? null : 'mismatch'
}
