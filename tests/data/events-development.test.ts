import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

// Local development with no Core configured (and the retired CORE_API_MODE=sample still set): the
// public event surfaces say "unavailable" and never show the sample catalogue in its place.
delete process.env.CORE_API_BASE_URL
delete process.env.CORE_EVENTS_API_KEY
process.env.CORE_API_MODE = 'sample'
;(process.env as Record<string, string>).NODE_ENV = 'development'
const { getEventPage, getEventsTimeline, getHomeEvents } = await import('@/lib/data')

describe('development without Core', () => {
  it('shows no sample events and asks nothing of the network', async () => {
    let fetched = false
    const realFetch = globalThis.fetch
    const realWarn = console.warn
    const warned: string[] = []
    globalThis.fetch = (async () => {
      fetched = true
      throw new Error('no request should be made')
    }) as typeof fetch
    console.warn = (...args: unknown[]) => warned.push(args.join(' '))
    try {
      assert.deepEqual(await getHomeEvents(), { status: 'unavailable' })
      assert.deepEqual(await getEventsTimeline(), { status: 'unavailable' })
      assert.deepEqual(await getEventPage('11111111-1111-4111-8111-111111111111'), { status: 'unavailable' })
      // A sample event's address is not an event any more.
      assert.deepEqual(await getEventPage('intro-robotics-workshop'), { status: 'not-found' })
      assert.equal(fetched, false)
      // Why events are missing is said once, by name, with nothing secret in it.
      assert.equal(warned.filter((w) => w.includes('"unconfigured":"missing-base-url"')).length, 1)
    } finally {
      globalThis.fetch = realFetch
      console.warn = realWarn
    }
  })
})
