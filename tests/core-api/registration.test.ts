import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { outcomeFor, registrationBody, submitRegistration, validateRegistration } from '@/lib/core-api/registration'
import { IDS, fakeFetch, json, problem } from '../support/core'

const BASE = 'https://api.essqu.com/v1'

describe('validateRegistration', () => {
  it('passes a complete form', () => {
    assert.deepEqual(validateRegistration({ name: 'Test Visitor', email: 'visitor@example.test' }), {})
  })

  it('applies Core’s own limits', () => {
    assert.deepEqual(validateRegistration({ name: '  ', email: '' }), { attendeeName: 'required', attendeeEmail: 'required' })
    assert.deepEqual(validateRegistration({ name: 'x'.repeat(201), email: `${'a'.repeat(250)}@x.io` }), { attendeeName: 'too-long', attendeeEmail: 'too-long' })
    assert.deepEqual(validateRegistration({ name: 'Bad\u0007Name', email: 'no-at-sign' }), { attendeeName: 'invalid', attendeeEmail: 'invalid' })
  })
})

describe('registrationBody', () => {
  it('sends exactly the three fields Core accepts, trimmed', () => {
    assert.deepEqual(registrationBody({ name: ' Test Visitor ', email: ' visitor@example.test ', waitlist: false }), {
      attendeeName: 'Test Visitor',
      attendeeEmail: 'visitor@example.test',
      intent: 'register',
    })
    assert.equal(registrationBody({ name: 'a', email: 'a@b.co', waitlist: true }).intent, 'join_waitlist')
  })
})

describe('outcomeFor', () => {
  it('reports success only when Core says confirmed or waitlisted', () => {
    assert.deepEqual(outcomeFor(201, { data: { status: 'confirmed' } }, null), { kind: 'confirmed' })
    assert.deepEqual(outcomeFor(201, { data: { status: 'waitlisted' } }, null), { kind: 'waitlisted' })
    assert.deepEqual(outcomeFor(201, { data: { status: 'pending' } }, null), { kind: 'unavailable' })
    assert.deepEqual(outcomeFor(200, { data: { status: 'confirmed' } }, null), { kind: 'unavailable' })
  })

  it('maps every documented failure', () => {
    assert.deepEqual(outcomeFor(409, problem(409, 'conflict'), null), { kind: 'conflict' })
    assert.deepEqual(outcomeFor(404, problem(404, 'not-found'), null), { kind: 'not-found' })
    assert.deepEqual(outcomeFor(429, problem(429, 'rate-limited'), '600'), { kind: 'rate-limited', retryAfterSeconds: 600 })
    assert.deepEqual(outcomeFor(429, problem(429, 'rate-limited'), null), { kind: 'rate-limited', retryAfterSeconds: null })
    assert.deepEqual(outcomeFor(429, null, 'soon'), { kind: 'rate-limited', retryAfterSeconds: null })
    for (const [status, code] of [
      [503, 'service-unavailable'],
      [403, 'forbidden'],
      [400, 'bad-request'],
      [413, 'payload-too-large'],
      [415, 'unsupported-media-type'],
      [500, 'x'],
      [502, 'x'],
    ] as const) {
      assert.deepEqual(outcomeFor(status, problem(status, code), null), { kind: 'unavailable' }, `${status}`)
    }
  })

  it('names the rejected fields of a 422', () => {
    const body = problem(422, 'invalid-fields', { errors: [{ field: 'attendeeEmail', code: 'invalid' }, { field: 'intent', code: 'invalid' }] })
    assert.deepEqual(outcomeFor(422, body, null), { kind: 'invalid', fields: ['attendeeEmail'] })
    assert.deepEqual(outcomeFor(422, problem(422, 'invalid-fields'), null), { kind: 'invalid', fields: [] })
  })
})

describe('submitRegistration', () => {
  it('posts once, straight to Core, with no key and no cookie', async () => {
    const { impl, calls } = fakeFetch(() => json({ data: { status: 'confirmed' } }, 201))
    const outcome = await submitRegistration(BASE, IDS.open, { attendeeName: 'T', attendeeEmail: 't@example.test', intent: 'register' }, impl)
    assert.deepEqual(outcome, { kind: 'confirmed' })
    assert.equal(calls.length, 1)
    const [call] = calls
    assert.equal(call!.url, `${BASE}/events/${IDS.open}/registrations`)
    assert.equal(call!.init.method, 'POST')
    assert.equal(call!.init.credentials, 'omit')
    assert.equal(call!.init.mode, 'cors')
    const headers = call!.init.headers as Record<string, string>
    assert.equal(headers['Content-Type'], 'application/json')
    assert.equal(Object.keys(headers).some((h) => h.toLowerCase() === 'authorization'), false)
    assert.deepEqual(JSON.parse(String(call!.init.body)), { attendeeName: 'T', attendeeEmail: 't@example.test', intent: 'register' })
  })

  it('never retries a failure and never throws', async () => {
    const failing = fakeFetch(() => json(problem(503, 'service-unavailable'), 503))
    assert.deepEqual(await submitRegistration(BASE, IDS.open, { attendeeName: 'T', attendeeEmail: 't@example.test', intent: 'register' }, failing.impl), {
      kind: 'unavailable',
    })
    assert.equal(failing.calls.length, 1)

    const offline = fakeFetch(() => {
      throw new TypeError('Failed to fetch')
    })
    assert.deepEqual(await submitRegistration(BASE, IDS.open, { attendeeName: 'T', attendeeEmail: 't@example.test', intent: 'register' }, offline.impl), {
      kind: 'unavailable',
    })
    assert.equal(offline.calls.length, 1)
  })

  it('reads a non-JSON body as unavailable', async () => {
    const { impl } = fakeFetch(() => new Response('<html>gateway</html>', { status: 502 }))
    assert.deepEqual(await submitRegistration(BASE, IDS.open, { attendeeName: 'T', attendeeEmail: 't@example.test', intent: 'register' }, impl), {
      kind: 'unavailable',
    })
  })
})
