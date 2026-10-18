import 'server-only'
import { getVercelOidcToken } from '@vercel/oidc'
import { apiBase } from './config'
import { parseDetail, parsePage, UUID } from './schemas'
import type { CoreEvent, EventPage } from './types'

export class CoreUnavailable extends Error {}
async function read(path: string): Promise<unknown | null> {
  try {
    const base = apiBase(process.env.CORE_API_BASE_URL)
    const key = process.env.CORE_EVENTS_API_KEY
    if (!key) throw new Error('Core credential missing')
    const headers: Record<string, string> = { Authorization: `Bearer ${key}`, 'X-Request-Id': crypto.randomUUID() }
    // Scoped Vercel Trusted Sources access, separate from Core application auth.
    // The short-lived platform token stays on this server-to-server boundary.
    if (process.env.VERCEL_ENV === 'preview' && new URL(base).hostname.endsWith('.vercel.app')) {
      const token = await getVercelOidcToken()
      if (!token) throw new Error('Preview platform identity unavailable')
      headers['x-vercel-trusted-oidc-idp-token'] = token
    }
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch(base + path, {
        headers,
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      })
      if (response.status === 503 && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 150))
        continue
      }
      if (response.status === 404) return null
      if (!response.ok) throw new Error('Core read failed')
      return await response.json()
    }
  } catch {
    throw new CoreUnavailable('Events are temporarily unavailable')
  }
  throw new CoreUnavailable('Events are temporarily unavailable')
}
export async function getEvents(period: 'upcoming' | 'past' = 'upcoming', cursor?: string): Promise<EventPage> {
  const query = new URLSearchParams({ period })
  if (cursor) query.set('cursor', cursor)
  try {
    return parsePage(await read(`/events?${query}`))
  } catch {
    throw new CoreUnavailable('Events are temporarily unavailable')
  }
}
export async function getEvent(id: string): Promise<CoreEvent | null> {
  if (!UUID.test(id)) return null
  const value = await read(`/events/${id}`)
  if (value === null) return null
  try {
    return parseDetail(value)
  } catch {
    throw new CoreUnavailable('Events are temporarily unavailable')
  }
}
