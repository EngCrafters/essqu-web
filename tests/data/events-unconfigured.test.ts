import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

// A production deployment with no Core configured: an honest "unavailable", never samples.
delete process.env.CORE_API_BASE_URL
delete process.env.CORE_API_MODE
;(process.env as Record<string, string>).NODE_ENV = 'production'
process.env.VERCEL_ENV = 'production'
const { getEventPage, getEventsTimeline, getHomeEvents } = await import('@/lib/data')

describe('unconfigured production', () => {
  it('shows no sample events anywhere', async () => {
    let fetched = false
    const realFetch = globalThis.fetch
    globalThis.fetch = (async () => {
      fetched = true
      throw new Error('no request should be made')
    }) as typeof fetch
    try {
      assert.deepEqual(await getHomeEvents(), { status: 'unavailable' })
      assert.deepEqual(await getEventsTimeline(), { status: 'unavailable' })
      assert.deepEqual(await getEventPage('intro-robotics-workshop'), { status: 'unavailable' })
      assert.equal(fetched, false)
    } finally {
      globalThis.fetch = realFetch
    }
  })
})
