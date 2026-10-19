import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, describe, it } from 'node:test'
import { IDS, coreEvent, fakeFetch, json, list, offline, problem, type Call } from '../support/core'

// Configuration is read once per process, so it is set before the module loads.
const KEY = 'essq_test_landing01_' + 'S'.repeat(43)
process.env.CORE_API_BASE_URL = 'https://api.essqu.com/v1'
process.env.CORE_EVENTS_API_KEY = KEY
const { listCoreEvents, getCoreEvent, getRegistrationBaseUrl, PAGE_LIMITS } = await import('@/lib/core-api/events.server')

const realFetch = globalThis.fetch
const realWarn = console.warn
let logged: string[] = []

function use(...responders: ((call: Call) => Response | Promise<Response>)[]) {
  const fake = fakeFetch(...responders)
  globalThis.fetch = fake.impl
  return fake.calls
}

beforeEach(() => {
  logged = []
  console.warn = (...args: unknown[]) => logged.push(args.join(' '))
})

after(() => {
  globalThis.fetch = realFetch
})

afterEach(() => {
  globalThis.fetch = offline
  console.warn = realWarn
  // A failure log may carry a route, a status and Core's request id, never the key.
  for (const line of logged) assert.equal(line.includes(KEY), false, 'the API key reached a log line')
})

describe('listCoreEvents', () => {
  it('follows the opaque cursor and sends the server key', async () => {
    const calls = use(
      () => json(list([coreEvent()], 'cursor/opaque+1')),
      () => json(list([coreEvent({ id: IDS.later })])),
    )
    const result = await listCoreEvents('upcoming')
    assert.equal(result.status, 'ok')
    if (result.status === 'ok')
      assert.deepEqual(
        result.events.map((e) => e.id),
        [IDS.open, IDS.later],
      )
    assert.equal(calls.length, 2)
    assert.equal(calls[0]!.url, 'https://api.essqu.com/v1/events?period=upcoming')
    assert.equal(new URL(calls[1]!.url).searchParams.get('cursor'), 'cursor/opaque+1')
    assert.equal((calls[0]!.init.headers as Record<string, string>).Authorization, `Bearer ${KEY}`)
    assert.deepEqual((calls[0]!.init as { next?: unknown }).next, { revalidate: 30, tags: ['core-events'] })
  })

  it('bounds how many pages it follows, and says when a list was cut short', async () => {
    const calls = use(() => json(list([coreEvent()], 'more')))
    await listCoreEvents('upcoming')
    assert.equal(calls.length, PAGE_LIMITS.upcoming)
    assert.ok(logged.some((l) => l.includes('truncatedAfterPages')))
  })

  it('follows past pages too, so the archive is not cut at the first 20', async () => {
    const calls = use((call) =>
      call.url.includes('period=past')
        ? json(list([coreEvent({ id: IDS.past, availability: 'closed' })], new URL(call.url).searchParams.has('cursor') ? null : 'older'))
        : json(list([])),
    )
    await listCoreEvents('all')
    assert.equal(calls.filter((c) => c.url.includes('period=past')).length, 2)
    assert.equal(logged.some((l) => l.includes('truncatedAfterPages')), false)
  })

  it('adds recent past events for the timeline, each event once', async () => {
    const calls = use((call) =>
      call.url.includes('period=past')
        ? json(list([coreEvent({ id: IDS.past, availability: 'closed' }), coreEvent()], 'older'))
        : json(list([coreEvent()])),
    )
    const result = await listCoreEvents('all')
    assert.equal(result.status, 'ok')
    if (result.status === 'ok')
      assert.deepEqual(
        result.events.map((e) => e.id),
        [IDS.open, IDS.past],
      )
    assert.equal(calls.filter((c) => c.url.includes('period=past')).length, PAGE_LIMITS.past)
  })

  it('retries a 503 once', async () => {
    const calls = use(
      () => json(problem(503, 'service-unavailable'), 503),
      () => json(list([coreEvent()])),
    )
    assert.equal((await listCoreEvents('upcoming')).status, 'ok')
    assert.equal(calls.length, 2)
  })

  it('does not retry a refused key, and reports the page unavailable', async () => {
    const calls = use(() => json(problem(401, 'unauthorized'), 401))
    assert.deepEqual(await listCoreEvents('upcoming'), { status: 'unavailable', reason: 'unauthorized' })
    assert.equal(calls.length, 1)
  })

  it('does not retry after a timeout', async () => {
    const calls = use(() => {
      throw new DOMException('timed out', 'TimeoutError')
    })
    assert.deepEqual(await listCoreEvents('upcoming'), { status: 'unavailable', reason: 'timeout' })
    assert.equal(calls.length, 1)
  })

  it('treats a malformed envelope as unavailable, not as an empty list', async () => {
    use(() => json({ events: [] }))
    assert.deepEqual(await listCoreEvents('upcoming'), { status: 'unavailable', reason: 'invalid-response' })
  })

  it('stays up when Core gives up twice', async () => {
    const calls = use(() => json(problem(503, 'service-unavailable'), 503))
    assert.deepEqual(await listCoreEvents('all'), { status: 'unavailable', reason: 'unavailable' })
    assert.ok(calls.length <= 4)
  })
})

describe('getCoreEvent', () => {
  it('answers a non-UUID address as not found without calling Core', async () => {
    const calls = use(() => json({}))
    assert.deepEqual(await getCoreEvent('intro-robotics-workshop'), { status: 'not-found' })
    assert.equal(calls.length, 0)
  })

  it('reads one event under its own cache tag', async () => {
    const calls = use(() => json({ data: coreEvent() }))
    const result = await getCoreEvent(IDS.open)
    assert.equal(result.status, 'ok')
    assert.equal(calls[0]!.url, `https://api.essqu.com/v1/events/${IDS.open}`)
    assert.deepEqual((calls[0]!.init as { next?: { tags: string[] } }).next?.tags, ['core-events', `core-event:${IDS.open}`])
  })

  it('passes Core’s 404 on as not found', async () => {
    use(() => json(problem(404, 'not-found'), 404))
    assert.deepEqual(await getCoreEvent(IDS.open), { status: 'not-found' })
  })

  it('refuses a record for a different id', async () => {
    use(() => json({ data: coreEvent({ id: IDS.later }) }))
    assert.deepEqual(await getCoreEvent(IDS.open), { status: 'unavailable', reason: 'invalid-response' })
  })
})

describe('getRegistrationBaseUrl', () => {
  it('hands the browser only the public API address', () => {
    assert.equal(getRegistrationBaseUrl(), 'https://api.essqu.com/v1')
  })
})
