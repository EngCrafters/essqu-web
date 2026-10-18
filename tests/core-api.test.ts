import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiBase } from '../lib/core-api/config'
import { parseEvent, parsePage } from '../lib/core-api/schemas'
import { submitRegistration } from '../lib/core-api/registration'
import { getEvent, getEvents } from '../lib/core-api/server'
vi.mock('@vercel/oidc', () => ({ getVercelOidcToken: vi.fn().mockResolvedValue('local-platform-identity') }))
const id = '11111111-1111-4111-8111-111111111111'
const event = {
  id,
  title: 'ورشة',
  description: 'Description',
  eventDate: '2027-01-01T12:00:00Z',
  location: null,
  committeeName: 'Technical',
  availability: 'open',
}
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})
describe('Core transport boundary', () => {
  it('forwards short-lived identity only for Vercel preview server reads', async () => {
    vi.stubEnv('CORE_API_BASE_URL', 'https://core-git-staging-team.vercel.app/v1')
    vi.stubEnv('CORE_EVENTS_API_KEY', 'server-key')
    vi.stubEnv('VERCEL_ENV', 'preview')
    const fetcher = vi
      .fn()
      .mockImplementation(() => Promise.resolve(Response.json({ data: [], meta: { nextCursor: null } })))
    vi.stubGlobal('fetch', fetcher)
    await getEvents()
    expect(fetcher.mock.calls[0][1].headers['x-vercel-trusted-oidc-idp-token']).toBe('local-platform-identity')
    vi.stubEnv('VERCEL_ENV', 'production')
    await getEvents()
    expect(fetcher.mock.calls[1][1].headers['x-vercel-trusted-oidc-idp-token']).toBeUndefined()
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('CORE_API_BASE_URL', 'https://core.example/v1')
    await getEvents()
    expect(fetcher.mock.calls[2][1].headers['x-vercel-trusted-oidc-idp-token']).toBeUndefined()
  })
  it('retries one service-unavailable read and validates the resulting page', async () => {
    vi.stubEnv('CORE_API_BASE_URL', 'https://core.example/v1')
    vi.stubEnv('CORE_EVENTS_API_KEY', 'key')
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ data: [], meta: { nextCursor: null } }))
    vi.stubGlobal('fetch', fetcher)
    expect((await getEvents()).data).toEqual([])
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('handles old conflicts and invalid success payloads without inventing success', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ code: 'conflict' }, { status: 409 }))
      .mockResolvedValueOnce(Response.json({ data: { status: 'invented' } }, { status: 201 }))
    vi.stubGlobal('fetch', fetcher)
    const fields = { attendeeName: 'N', attendeeEmail: 'e@example.com', intent: 'register' as const }
    expect(await submitRegistration('https://core.example/v1', id, fields)).toMatchObject({
      ok: false,
      code: 'conflict',
    })
    expect(await submitRegistration('https://core.example/v1', id, fields)).toMatchObject({
      ok: false,
      code: 'service-unavailable',
    })
  })
  it('contains malformed JSON and network failures without retrying POST', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response('not JSON', { status: 503 }))
      .mockRejectedValueOnce(new Error('timeout'))
    vi.stubGlobal('fetch', fetcher)
    for (let i = 0; i < 2; i++)
      expect(
        await submitRegistration('https://core.example/v1', id, {
          attendeeName: 'N',
          attendeeEmail: 'e@example.com',
          intent: 'register',
        }),
      ).toEqual({ ok: false, code: 'service-unavailable' })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('requires an explicit safe versioned URL', () => {
    expect(apiBase('https://core.example/v1/')).toBe('https://core.example/v1')
    for (const value of [
      undefined,
      'https://key@core.example/v1',
      'http://core.example/v1',
      'https://core.example/v2',
      'https://core.example/v1?secret=x',
    ])
      expect(() => apiBase(value)).toThrow()
  })
  it('validates public events and strips internal properties', () => {
    expect(parseEvent({ ...event, capacity: 12 })).toEqual(event)
    for (const value of [
      { ...event, availability: 'draft' },
      { ...event, eventDate: 'tomorrow' },
      { ...event, id: 'bad' },
    ])
      expect(() => parseEvent(value)).toThrow()
    expect(parsePage({ data: [], meta: { nextCursor: null } }).data).toEqual([])
    expect(() => parsePage({ data: [event], meta: {} })).toThrow()
  })
  it('reads exactly one canonical list with opaque cursor and server credential', async () => {
    vi.stubEnv('CORE_API_BASE_URL', 'https://core.example/v1')
    vi.stubEnv('CORE_EVENTS_API_KEY', 'secret-server-only')
    const fetcher = vi.fn().mockResolvedValue(Response.json({ data: [event], meta: { nextCursor: 'opaque' } }))
    vi.stubGlobal('fetch', fetcher)
    expect((await getEvents('past', 'a+/=')).data).toHaveLength(1)
    expect(fetcher).toHaveBeenCalledTimes(1)
    const [url, options] = fetcher.mock.calls[0]
    expect(new URL(url).searchParams.get('cursor')).toBe('a+/=')
    expect(options.headers.Authorization).toBe('Bearer secret-server-only')
    expect(options.cache).toBe('no-store')
  })
  it('does not retry invalid credentials or fall back to mock events', async () => {
    vi.stubEnv('CORE_API_BASE_URL', 'https://core.example/v1')
    vi.stubEnv('CORE_EVENTS_API_KEY', 'bad')
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 401 }))
    vi.stubGlobal('fetch', fetcher)
    await expect(getEvents()).rejects.toThrow('temporarily unavailable')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('returns null for hidden/malformed event', async () => {
    vi.stubEnv('CORE_API_BASE_URL', 'https://core.example/v1')
    vi.stubEnv('CORE_EVENTS_API_KEY', 'key')
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 404 }))
    vi.stubGlobal('fetch', fetcher)
    expect(await getEvent('bad')).toBeNull()
    expect(fetcher).not.toHaveBeenCalled()
    expect(await getEvent(id)).toBeNull()
  })
  it.each(['confirmed', 'waitlisted'])('posts %s without cookie key or IP', async (status) => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ data: { status } }, { status: 201 }))
    vi.stubGlobal('fetch', fetcher)
    expect(
      await submitRegistration('https://core.example/v1', id, {
        attendeeName: 'Name',
        attendeeEmail: 'a@example.com',
        intent: 'register',
      }),
    ).toEqual({ ok: true, status })
    expect(fetcher).toHaveBeenCalledTimes(1)
    const [, options] = fetcher.mock.calls[0]
    expect(options.credentials).toBe('omit')
    expect(options.headers.Authorization).toBeUndefined()
    expect(JSON.parse(options.body)).toEqual({
      attendeeName: 'Name',
      attendeeEmail: 'a@example.com',
      intent: 'register',
    })
  })
  it.each(['already-registered', 'already-waitlisted', 'event-full', 'registration-closed', 'registration-available'])(
    'maps %s safely',
    async (reason) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ code: 'conflict', reason }, { status: 409 })))
      expect(
        await submitRegistration('https://core.example/v1', id, {
          attendeeName: 'N',
          attendeeEmail: 'e@example.com',
          intent: 'register',
        }),
      ).toMatchObject({ ok: false, reason })
    },
  )
  it('preserves retry advice and never retries writes', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { code: 'rate-limited', requestId: 'correlation' },
          { status: 429, headers: { 'Retry-After': '600' } },
        ),
      )
    vi.stubGlobal('fetch', fetcher)
    expect(
      await submitRegistration('https://core.example/v1', id, {
        attendeeName: 'N',
        attendeeEmail: 'e@example.com',
        intent: 'register',
      }),
    ).toMatchObject({ code: 'rate-limited', requestId: 'correlation', retryAfter: 600 })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
