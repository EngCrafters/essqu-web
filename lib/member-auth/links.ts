/**
 * Supabase Auth email links that land on the website's sign-in and reset pages. Read once, then
 * removed from the address bar and history before anything else happens, so a token never stays
 * in the URL, a bookmark, a shared link or a referrer (the pages are also served with
 * `Referrer-Policy: no-referrer`).
 *
 * Shapes handled:
 *  - `?token_hash=…&type=…`   the recommended templates (any device): verified with verifyOtp
 *  - `#access_token=…`        the provider's default ConfirmationURL (implicit flow)
 *  - `?error…` / `#error…`    Supabase's failure redirect, e.g. `error_code=otp_expired`
 */

export const LINK_TYPES = ['recovery', 'signup', 'email', 'invite', 'magiclink', 'email_change'] as const
export type LinkType = (typeof LINK_TYPES)[number]

export type AuthLink =
  | { kind: 'none' }
  | { kind: 'token-hash'; tokenHash: string; type: LinkType }
  | { kind: 'session'; accessToken: string; refreshToken: string; type: string | null }
  | { kind: 'error'; failure: 'expired' | 'invalid' }

const AUTH_KEYS = ['token_hash', 'type', 'code', 'error', 'error_code', 'error_description', 'access_token', 'refresh_token', 'expires_in', 'expires_at', 'token_type', 'provider_token', 'provider_refresh_token']

export function readAuthLink(search: string, hash: string): AuthLink {
  const query = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const fragment = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  const failure = [query, fragment].find((p) => p.has('error') || p.has('error_code') || p.has('error_description'))
  if (failure) {
    const text = `${failure.get('error') ?? ''} ${failure.get('error_code') ?? ''} ${failure.get('error_description') ?? ''}`.toLowerCase()
    return { kind: 'error', failure: text.includes('expired') ? 'expired' : 'invalid' }
  }
  const tokenHash = query.get('token_hash')
  const type = LINK_TYPES.find((t) => t === query.get('type'))
  if (tokenHash) {
    return type && /^[A-Za-z0-9_-]{8,512}$/.test(tokenHash) ? { kind: 'token-hash', tokenHash, type } : { kind: 'error', failure: 'invalid' }
  }
  const accessToken = fragment.get('access_token')
  const refreshToken = fragment.get('refresh_token')
  if (accessToken && refreshToken) return { kind: 'session', accessToken, refreshToken, type: fragment.get('type') }
  // A PKCE `code` needs the verifier of the browser that asked; this site does not use that flow.
  if (query.has('code')) return { kind: 'error', failure: 'invalid' }
  return { kind: 'none' }
}

/** The current address without any Auth parameter or fragment, for history.replaceState. */
export function withoutAuthLink(href: string): string {
  const url = new URL(href)
  for (const key of AUTH_KEYS) url.searchParams.delete(key)
  url.hash = ''
  return `${url.pathname}${url.search}`
}
