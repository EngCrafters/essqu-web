/*
 * Synthetic Core API v1 payloads for the unit tests: the shapes of the Core repository's
 * docs/api/openapi.v1.yaml, with made-up content. Test-only; nothing here reaches a page.
 */

export const IDS = {
  open: '11111111-1111-4111-8111-111111111111',
  waitlist: '22222222-2222-4222-8222-222222222222',
  past: '33333333-3333-4333-8333-333333333333',
  later: '44444444-4444-4444-8444-444444444444',
} as const

export function coreEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: IDS.open,
    title: 'Synthetic Workshop',
    description: 'A short first paragraph.\nA second paragraph with details.',
    eventDate: '2030-03-10T12:00:00.000Z',
    location: 'Room 1',
    committeeName: 'Media Committee',
    availability: 'open',
    ...overrides,
  }
}

export const list = (data: unknown[], nextCursor: string | null = null) => ({ data, meta: { nextCursor } })

export const problem = (status: number, code: string, extra: Record<string, unknown> = {}) => ({
  type: `https://api.essqu.com/problems/${code}`,
  title: 'Problem',
  status,
  code,
  requestId: 'req-test-0001',
  ...extra,
})

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })
}

export interface Call {
  url: string
  init: RequestInit
}

/**
 * Installed between tests: a request still in flight from the previous test (a sibling page of a
 * failed list, for instance) fails here instead of reaching the real network.
 */
export const offline = (async () => {
  throw new TypeError('offline: no fetch stubbed for this test')
}) as typeof fetch

/** A fetch stand-in that answers from a queue of responders and records every call. */
export function fakeFetch(...responders: ((call: Call) => Response | Promise<Response>)[]) {
  const calls: Call[] = []
  const impl = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const call = { url: String(input), init }
    calls.push(call)
    const responder = responders[Math.min(calls.length - 1, responders.length - 1)]
    if (!responder) throw new Error('unexpected fetch')
    return responder(call)
  }) as typeof fetch
  return { impl, calls }
}
