import 'server-only'

/*
 * Core API configuration: read from the server environment once, validated, and resolved into
 * one of three modes. Nothing here reaches the browser except the public API base URL, and only
 * for registration (see events.server.ts → getRegistrationEndpoint).
 *
 *   core          CORE_API_BASE_URL and CORE_EVENTS_API_KEY are set: events come from Core.
 *   sample        The site's own sample catalogue (content/), labelled "Sample" on every page,
 *                 with the browser-only prototype registration. Local development with nothing
 *                 configured, or CORE_API_MODE=sample. Never on a Vercel production deployment.
 *   unconfigured  Anything else: event surfaces show an honest "can't be shown right now" state
 *                 and the rest of the site renders normally. Never a fallback to sample events.
 *
 * There is no hard-coded Core URL and no silent fallback to one. The key is server-only; there is
 * no NEXT_PUBLIC_ variant, by design.
 */

export type ConfigProblem = 'missing-base-url' | 'invalid-base-url' | 'insecure-base-url' | 'missing-api-key' | 'invalid-api-key' | 'invalid-mode' | 'sample-not-allowed'

export interface CoreModeConfig {
  mode: 'core'
  /** Including the version, without a trailing slash: `https://api.essqu.com/v1`. */
  baseUrl: string
  /** Bearer token with the `events:read` scope. Sent on server-side reads only. */
  apiKey: string
  timeoutMs: number
  /** Server-side cache lifetime for event reads; 0 disables caching. */
  revalidateSeconds: number
}

export type CoreConfig = CoreModeConfig | { mode: 'sample' } | { mode: 'unconfigured'; problem: ConfigProblem }

type Env = Record<string, string | undefined>

/** Core's guidance: "You may cache the parsed result server-side for up to 30 seconds." */
export const DEFAULTS = { timeoutMs: 4000, revalidateSeconds: 30 } as const
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]'])

function intInRange(value: string | undefined, fallback: number, min: number, max: number) {
  if (value === undefined || value.trim() === '') return fallback
  const n = Number(value)
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback
}

/** Sample events may be shown anywhere except a Vercel production deployment. */
export function sampleAllowed(env: Env) {
  return env.VERCEL_ENV !== 'production'
}

/** Validates CORE_API_BASE_URL; returns the normalised value or the problem. */
export function normaliseBaseUrl(raw: string, env: Env): { ok: true; value: string } | { ok: false; problem: ConfigProblem } {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return { ok: false, problem: 'invalid-base-url' }
  }
  if (url.username || url.password || url.search || url.hash) return { ok: false, problem: 'invalid-base-url' }
  const path = url.pathname.replace(/\/+$/, '')
  // The contract is versioned in the path. Pointing at the bare origin is a configuration error,
  // not something to guess around.
  if (!/\/v1$/.test(path)) return { ok: false, problem: 'invalid-base-url' }
  if (url.protocol === 'http:') {
    // Plain HTTP only for a Core running on this machine (local development).
    if (!LOOPBACK.has(url.hostname) || env.VERCEL_ENV === 'production') return { ok: false, problem: 'insecure-base-url' }
  } else if (url.protocol !== 'https:') {
    return { ok: false, problem: 'invalid-base-url' }
  }
  return { ok: true, value: `${url.origin}${path}` }
}

/** Pure: resolves the configuration from an environment object (tests pass their own). */
export function resolveCoreConfig(env: Env): CoreConfig {
  const mode = env.CORE_API_MODE?.trim().toLowerCase() || undefined
  if (mode && mode !== 'core' && mode !== 'sample') return { mode: 'unconfigured', problem: 'invalid-mode' }
  if (mode === 'sample') return sampleAllowed(env) ? { mode: 'sample' } : { mode: 'unconfigured', problem: 'sample-not-allowed' }

  const rawBase = env.CORE_API_BASE_URL?.trim()
  if (!rawBase) {
    // Local development works with no Core at all; nowhere else falls back to samples.
    if (!mode && env.NODE_ENV === 'development' && sampleAllowed(env)) return { mode: 'sample' }
    return { mode: 'unconfigured', problem: 'missing-base-url' }
  }

  const base = normaliseBaseUrl(rawBase, env)
  if (!base.ok) return { mode: 'unconfigured', problem: base.problem }

  // Event reads require the key (401 without it), so a half-configured deployment is reported
  // as such rather than failing on every request.
  const apiKey = env.CORE_EVENTS_API_KEY?.trim() ?? ''
  if (!apiKey) return { mode: 'unconfigured', problem: 'missing-api-key' }
  if (/\s/.test(apiKey)) return { mode: 'unconfigured', problem: 'invalid-api-key' }

  return {
    mode: 'core',
    baseUrl: base.value,
    apiKey,
    timeoutMs: intInRange(env.CORE_API_TIMEOUT_MS, DEFAULTS.timeoutMs, 500, 15000),
    revalidateSeconds: intInRange(env.CORE_EVENTS_REVALIDATE_SECONDS, DEFAULTS.revalidateSeconds, 0, 300),
  }
}

let resolved: CoreConfig | null = null

/** This deployment's configuration, resolved once per server process. */
export function getCoreConfig(): CoreConfig {
  resolved ??= resolveCoreConfig(process.env)
  return resolved
}
