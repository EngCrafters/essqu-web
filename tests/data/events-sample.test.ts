import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

// Sample mode: local development with no Core configured. The events pages must read exactly
// the records they read before the integration, labelled as samples.
delete process.env.CORE_API_BASE_URL
delete process.env.CORE_API_MODE
;(process.env as Record<string, string>).NODE_ENV = 'development'
const { EVENTS } = await import('@/content/events')
const { EVENT_CATALOGUE } = await import('@/content/platform/events')
const { DEMO_NOW, getEventPage, getEventsTimeline, getHomeEvents } = await import('@/lib/data')

describe('sample mode', () => {
  it('gives the homepage its three sample listings, unchanged', async () => {
    const result = await getHomeEvents()
    assert.equal(result.status, 'ok')
    if (result.status === 'ok') {
      assert.equal(result.source, 'sample')
      assert.equal(result.events, EVENTS)
      assert.equal(result.now, DEMO_NOW)
    }
  })

  it('gives /events the whole sample catalogue at the prototype’s date', async () => {
    const result = await getEventsTimeline()
    assert.equal(result.status, 'ok')
    if (result.status === 'ok') {
      assert.equal(result.source, 'sample')
      assert.equal(result.now, DEMO_NOW)
      assert.deepEqual(
        result.events.map((e) => e.slug),
        [...EVENT_CATALOGUE].sort((a, b) => a.start.localeCompare(b.start)).map((e) => e.slug),
      )
      assert.ok(result.events.every((e) => e.sample))
    }
  })

  it('keeps the prototype registration and related events on a sample page', async () => {
    const page = await getEventPage('intro-robotics-workshop')
    assert.equal(page.status, 'ok')
    if (page.status === 'ok') {
      assert.deepEqual(page.registration, { kind: 'sample' })
      assert.ok(page.related.length > 0)
      assert.ok(page.related.every((e) => e.sample))
    }
    assert.deepEqual(await getEventPage('no-such-event'), { status: 'not-found' })
  })
})
