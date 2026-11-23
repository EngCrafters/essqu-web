import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { classifyAuthError, type AuthProblem } from './errors'

/**
 * The browser's Supabase Auth client for members (Core's ADR 0019): the same Auth project as the
 * Core platform. Passwords go from this browser straight to Supabase Auth and nowhere else; the
 * site never stores, logs or forwards them.
 *
 * Sessions stay in this browser. "Remember me" keeps the session in localStorage; otherwise it
 * lives in sessionStorage and ends with the tab. Links in Auth emails are handled by the pages
 * themselves (see links.ts), never by the client reading the URL on its own.
 */

export interface MemberAuthSettings {
  url: string
  anonKey: string
}

const REMEMBER_KEY = 'es-auth-remember'
const STORAGE_KEY = 'es-member-auth'

const remembered = () => {
  try {
    return localStorage.getItem(REMEMBER_KEY) === '1'
  } catch {
    return false
  }
}

export function setRememberMe(on: boolean) {
  try {
    localStorage.setItem(REMEMBER_KEY, on ? '1' : '0')
  } catch {
    // Private mode: the session simply lasts as long as the tab.
  }
}

const storage = {
  getItem(key: string) {
    try {
      return localStorage.getItem(key) ?? sessionStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem(key: string, value: string) {
    try {
      const [keep, drop] = remembered() ? [localStorage, sessionStorage] : [sessionStorage, localStorage]
      keep.setItem(key, value)
      drop.removeItem(key)
    } catch {
      // Storage unavailable: the visitor signs in again next time.
    }
  },
  removeItem(key: string) {
    try {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    } catch {
      // Nothing stored.
    }
  },
}

let cached: { key: string; client: SupabaseClient } | null = null

export function memberAuthClient(settings: MemberAuthSettings): SupabaseClient {
  const key = `${settings.url}|${settings.anonKey}`
  if (cached?.key !== key) {
    cached = {
      key,
      client: createClient(settings.url, settings.anonKey, {
        auth: { flowType: 'implicit', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storage, storageKey: STORAGE_KEY },
      }),
    }
  }
  return cached.client
}

export type SignUpOutcome = { ok: true } | { ok: false; problem: AuthProblem }

export type AccountTokenOutcome = { ok: true } | { ok: false; stage: 'sign-in' | 'password'; problem: AuthProblem }

/**
 * Immediate account activation (Core ADR 0030): Core created the account and returned a one-time
 * sign-in token. This browser signs in with it, then sets the chosen password with Supabase Auth
 * itself, so the password still goes nowhere else.
 */
export async function signInWithAccountToken(client: Pick<SupabaseClient, 'auth'>, tokenHash: string, password: string): Promise<AccountTokenOutcome> {
  try {
    const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
    if (error) return { ok: false, stage: 'sign-in', problem: classifyAuthError(error) }
  } catch (error) {
    return { ok: false, stage: 'sign-in', problem: classifyAuthError(error as { code?: string; status?: number }) }
  }
  return setAccountPassword(client, password)
}

/** The signed-in account's password (after an immediate sign-in, or to retry it). */
export async function setAccountPassword(client: Pick<SupabaseClient, 'auth'>, password: string): Promise<AccountTokenOutcome> {
  try {
    const { error } = await client.auth.updateUser({ password })
    return error ? { ok: false, stage: 'password', problem: classifyAuthError(error) } : { ok: true }
  } catch (error) {
    return { ok: false, stage: 'password', problem: classifyAuthError(error as { code?: string; status?: number }) }
  }
}

/**
 * The applicant's account, created by Supabase Auth's own sign-up after Core accepted the
 * application. Supabase sends the confirmation email; until it is confirmed the account cannot
 * sign in, and Core links nothing to it. For an address that already has an account, Supabase
 * answers the same way without creating anything, so this reveals nothing either.
 */
export async function signUpApplicant(client: Pick<SupabaseClient, 'auth'>, email: string, password: string, confirmRedirect: string): Promise<SignUpOutcome> {
  try {
    const { error } = await client.auth.signUp({ email: email.trim().toLowerCase(), password, options: { emailRedirectTo: confirmRedirect } })
    return error ? { ok: false, problem: classifyAuthError(error) } : { ok: true }
  } catch (error) {
    return { ok: false, problem: classifyAuthError(error as { code?: string; status?: number }) }
  }
}
