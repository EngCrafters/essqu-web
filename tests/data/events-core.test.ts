import assert from 'node:assert/strict'
import { after, afterEach, describe, it } from 'node:test'
import { IDS, coreEvent, fakeFetch, json, list, offline, problem, type Call } from '../support/core'

// Core mode, as on a deployment with the API configured.
process.env.CORE_API_BASE_URL = 'https://api.essqu.com/v1'
process.env.CORE_EVENTS_API_KEY = 'essq_test_landing01_' + 'k'.repeat(43)
const { getEventPage, getEventsTimeline, getHomeEvents } = await import('@/lib/data')

const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = offline
})
after(() => {
  globalThis.fetch = realFetch
})

function use(respond: (call: Call) => Response | Promise<Response>) {
  const fake = fakeFetch(respond)
  globalThis.fetch = fake.impl
  return fake.calls
}

const upcoming = [
  coreEvent({ id: IDS.open, eventDate: '2030-03-10T12:00:00.000Z', committeeName: 'Media Committee' }),
  coreEvent({ id: IDS.waitlist, eventDate: '2030-04-01T12:00:00.000Z', availability: 'waitlist', committeeName: 'Media Committee' }),
  coreEvent({ id: IDS.later, eventDate: '2030-05-01T12:00:00.000Z', committeeName: 'Forum Committee' }),
]
const past = [coreEvent({ id: IDS.past, eventDate: '2020-01-05T12:00:00.000Z', availability: 'closed', committeeName: 'Media Committee' })]

const core = (call: Call) => {
  if (call.url.includes('period=upcoming')) return json(list(upcoming))
  if (call.url.includes('period=past')) return json(list(past))
  const id = call.url.split('/events/')[1]
  const all = [...upcoming, ...past]
  const found = all.find((e) => e.id === id)
  return found ? json({ data: found }) : json(problem(404, 'not-found'), 404)
}

describe('Core mode', () => {
  it('feeds the homepage the next upcoming events only, with no sample label', async () => {
    use(core)
    const result = await getHomeEvents(2)
    assert.equal(result.status, 'ok')
    if (result.status === 'ok') {
      assert.equal(result.source, 'core')
      assert.deepEqual(
        result.events.map((e) => e.id),
        [IDS.open, IDS.waitlist],
      )
      assert.ok(result.events.every((e) => !e.sample))
      assert.ok(Math.abs(Date.parse(result.now) - Date.now()) < 60_000, 'Core events are judged against the real clock')
    }
  })

  it('puts past and upcoming events on the timeline, oldest first', async () => {
    use(core)
    const result = await getEventsTimeline()
    assert.equal(result.status, 'ok')
    if (result.status === 'ok')
      assert.deepEqual(
        result.events.map((e) => e.slug),
        [IDS.past, IDS.open, IDS.waitlist, IDS.later],
      )
  })

  it('builds an event page with real registration and same-committee related events', async () => {
    use(core)
    const page = await getEventPage(IDS.open)
    assert.equal(page.status, 'ok')
    if (page.status === 'ok') {
      assert.equal(page.source, 'core')
      assert.deepEqual(page.registration, { kind: 'core', baseUrl: 'https://api.essqu.com/v1' })
      assert.equal(page.event.organizer, 'media')
      assert.deepEqual(
        page.related.map((e) => e.slug),
        [IDS.waitlist, IDS.past],
      )
    }
  })

  it('answers sample addresses and unknown ids as not found, never with sample records', async () => {
    use(core)
    assert.deepEqual(await getEventPage('intro-robotics-workshop'), { status: 'not-found' })
    assert.deepEqual(await getEventPage('99999999-9999-4999-8999-999999999999'), { status: 'not-found' })
  })

  it('reports Core outages as unavailable on every surface', async () => {
    use(() => json(problem(503, 'service-unavailable'), 503))
    assert.deepEqual(await getHomeEvents(), { status: 'unavailable' })
    assert.deepEqual(await getEventsTimeline(), { status: 'unavailable' })
    assert.deepEqual(await getEventPage(IDS.open), { status: 'unavailable' })
  })

  it('still shows an event page when only the related list fails', async () => {
    use((call) => (call.url.includes('period=') ? json(problem(503, 'service-unavailable'), 503) : core(call)))
    const page = await getEventPage(IDS.open)
    assert.equal(page.status, 'ok')
    if (page.status === 'ok') assert.deepEqual(page.related, [])
  })
})
