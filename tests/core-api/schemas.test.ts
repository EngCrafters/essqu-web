import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isEventId, parseEvent, parseEventDetail, parseEventList, parseProblem, parseRegistrationStatus } from '@/lib/core-api/schemas'
import { IDS, coreEvent, list, problem } from '../support/core'

describe('parseEvent', () => {
  it('accepts the v1 Event shape', () => {
    const parsed = parseEvent(coreEvent())
    assert.equal(parsed.ok, true)
    if (parsed.ok) assert.equal(parsed.value.title, 'Synthetic Workshop')
  })

  it('accepts a null or blank location as "no location"', () => {
    for (const location of [null, '   ']) {
      const parsed = parseEvent(coreEvent({ location }))
      assert.ok(parsed.ok && parsed.value.location === null)
    }
  })

  it('accepts offsets other than Z', () => {
    assert.equal(parseEvent(coreEvent({ eventDate: '2030-03-10T16:00:00+04:00' })).ok, true)
  })

  it('rejects every field that breaks the contract', () => {
    const broken: Record<string, unknown>[] = [
      { id: 'not-a-uuid' },
      { id: 42 },
      { title: '' },
      { title: null },
      { description: undefined },
      { eventDate: '2030-03-10' },
      { eventDate: 'yesterday' },
      { eventDate: '2030-03-10T12:00:00' },
      { location: 7 },
      { committeeName: null },
      { availability: 'full' },
      { availability: 'available' },
    ]
    for (const change of broken) assert.equal(parseEvent(coreEvent(change)).ok, false, JSON.stringify(change))
    assert.equal(parseEvent(null).ok, false)
    assert.equal(parseEvent([coreEvent()]).ok, false)
  })
})

describe('parseEventList', () => {
  it('keeps valid events, counts the malformed ones and passes the cursor through', () => {
    const parsed = parseEventList(list([coreEvent(), coreEvent({ id: 'bad' }), coreEvent({ id: IDS.later })], 'opaque-cursor'))
    assert.ok(parsed.ok)
    if (parsed.ok) {
      assert.deepEqual(
        parsed.value.data.map((e) => e.id),
        [IDS.open, IDS.later],
      )
      assert.equal(parsed.value.dropped, 1)
      assert.equal(parsed.value.meta.nextCursor, 'opaque-cursor')
    }
  })

  it('fails on a malformed envelope', () => {
    for (const body of [[coreEvent()], { data: [] }, { data: {}, meta: { nextCursor: null } }, { data: [], meta: { nextCursor: 5 } }, { events: [] }, null]) {
      assert.equal(parseEventList(body).ok, false, JSON.stringify(body))
    }
  })
})

describe('parseEventDetail', () => {
  it('reads the event wrapped in data', () => {
    assert.equal(parseEventDetail({ data: coreEvent() }).ok, true)
    assert.equal(parseEventDetail(coreEvent()).ok, false)
  })
})

describe('parseProblem', () => {
  it('reads the stable code and field errors', () => {
    assert.deepEqual(parseProblem(problem(422, 'invalid-fields', { errors: [{ field: 'attendeeEmail', code: 'invalid' }] })), {
      status: 422,
      code: 'invalid-fields',
      requestId: 'req-test-0001',
      errors: [{ field: 'attendeeEmail', code: 'invalid' }],
    })
  })

  it('ignores anything outside the public vocabulary', () => {
    assert.equal(parseProblem({ code: 'EVENT_FULL' }), null)
    assert.equal(parseProblem('<html>'), null)
  })
})

describe('parseRegistrationStatus', () => {
  it('accepts only confirmed or waitlisted', () => {
    assert.equal(parseRegistrationStatus({ data: { status: 'confirmed' } }), 'confirmed')
    assert.equal(parseRegistrationStatus({ data: { status: 'waitlisted' } }), 'waitlisted')
    assert.equal(parseRegistrationStatus({ data: { status: 'registered' } }), null)
    assert.equal(parseRegistrationStatus({ status: 'confirmed' }), null)
  })
})

describe('isEventId', () => {
  it('accepts only UUIDs', () => {
    assert.equal(isEventId(IDS.open), true)
    assert.equal(isEventId('intro-robotics-workshop'), false)
    assert.equal(isEventId('../admin'), false)
  })
})
