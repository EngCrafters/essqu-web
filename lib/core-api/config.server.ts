import 'server-only'

/*
 * Core API configuration: read from the server environment once, validated, and resolved into
 * one of two modes. Nothing here reaches the browser except the public API base URL, and only
 * for registration (see events.server.ts → getRegistrationBaseUrl).
 *
 *   core          CORE_API_BASE_URL and CORE_EVENTS_API_KEY are set: events come from Core.
 *   unconfigured  Anything else: event surfaces show an honest "can't be shown right now" state
 *                 and the rest of the site renders normally. The problem is logged once.
 *
 * There is no sample mode: the public event pages show Core's published events and nothing else,
 * in development, Preview and Production alike. There is no hard-coded Core URL and no silent
 * fallback to one. The key is server-only; there is no NEXT_PUBLIC_ variant, by design.
 */

export type ConfigProblem = 'missing-base-url' | 'invalid-base-url' | 'insecure-base-url' | 'missing-api-key' | 'invalid-api-key'

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

export type CoreConfig = CoreModeConfig | { mode: 'unconfigured'; problem: ConfigProblem }

type Env = Record<string, string | undefined>

/** Core's guidance: "You may cache the parsed result server-side for up to 30 seconds." */
export const DEFAULTS = { timeoutMs: 4000, revalidateSeconds: 30 } as const
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]'])

function intInRange(value: string | undefined, fallback: number, min: number, max: number) {
  if (value === undefined || value.trim() === '') return fallback
  const n = Number(value)
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback
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
  const rawBase = env.CORE_API_BASE_URL?.trim()
  if (!rawBase) return { mode: 'unconfigured', problem: 'missing-base-url' }

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
  if (!resolved) {
    resolved = resolveCoreConfig(process.env)
    // Said once, so a Preview or a dev server missing its variables says why events are absent.
    // The problem's name only: never a URL or a key.
    if (resolved.mode === 'unconfigured') console.warn(JSON.stringify({ source: 'core-api', unconfigured: resolved.problem }))
  }
  return resolved
}
