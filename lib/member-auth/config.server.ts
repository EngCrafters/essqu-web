import 'server-only'

/*
 * Member sign-in configuration (Core's ADR 0019): the same Supabase Auth project the Core
 * platform uses, never a second one. Both values are public by design (Supabase's URL and its
 * anon/publishable key, which only allow what Auth and Row Level Security allow), but they are
 * read here, on the server, and handed to the sign-in pages like Core's base URL, so the site
 * can be reconfigured without a rebuild. Absent or invalid, the sign-in pages say sign-in is
 * unavailable and registration still works without an account.
 */

export interface MemberAuthConfig {
  /** `https://<project>.supabase.co` */
  url: string
  anonKey: string
}

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]'])

export function getMemberAuthConfig(env: Record<string, string | undefined> = process.env): MemberAuthConfig | null {
  const rawUrl = env.SUPABASE_URL?.trim()
  const anonKey = env.SUPABASE_ANON_KEY?.trim()
  if (!rawUrl || !anonKey || !/^[A-Za-z0-9._-]{20,}$/.test(anonKey)) return null
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }
  // Plain http only for a Supabase stand-in on this machine, as for Core's base URL (config.server.ts).
  const secure = url.protocol === 'https:' || (url.protocol === 'http:' && env.VERCEL_ENV !== 'production' && LOOPBACK.has(url.hostname))
  if (!secure || url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) return null
  return { url: url.origin, anonKey }
}
