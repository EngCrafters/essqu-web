import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CoreApiError, isRetryable, kindForStatus, toCoreError } from '@/lib/core-api/errors'

describe('kindForStatus', () => {
  it('maps statuses, preferring Core’s stable problem code', () => {
    assert.equal(kindForStatus(404), 'not-found')
    assert.equal(kindForStatus(401), 'unauthorized')
    assert.equal(kindForStatus(403), 'forbidden')
    assert.equal(kindForStatus(429), 'rate-limited')
    assert.equal(kindForStatus(503), 'unavailable')
    assert.equal(kindForStatus(500), 'unavailable')
    assert.equal(kindForStatus(418), 'bad-status')
    assert.equal(kindForStatus(400, 'service-unavailable'), 'unavailable')
  })
})

describe('toCoreError', () => {
  it('turns timeouts and network failures into stable kinds', () => {
    assert.equal(toCoreError(new DOMException('t', 'TimeoutError')).kind, 'timeout')
    assert.equal(toCoreError(new TypeError('fetch failed')).kind, 'network')
    const own = new CoreApiError('forbidden', 403)
    assert.equal(toCoreError(own), own)
  })
})

describe('isRetryable', () => {
  it('retries only a 503 or a dropped connection', () => {
    assert.equal(isRetryable(new CoreApiError('unavailable', 503)), true)
    assert.equal(isRetryable(new CoreApiError('network')), true)
    for (const kind of ['timeout', 'unauthorized', 'forbidden', 'not-found', 'invalid-response', 'rate-limited'] as const) {
      assert.equal(isRetryable(new CoreApiError(kind)), false, kind)
    }
  })
})
