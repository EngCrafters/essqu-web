import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { memberFailure } from '@/lib/core-api/member-events'
import { STUDENT_NUMBER, teamStillOffered, toLeadershipOptions, toOwnLeadership, toSquState } from '@/lib/core-api/member-roles'

// The profile's two independent cards (Core ADR 0025): Core's answers to GET /me/verification and
// GET /me/leadership, as the cards check them before rendering. Synthetic content only.
const path = {
  committee: { id: 'c-1', name: 'Technical Committee' },
  team: { id: 't-1', name: { en: 'Development Team', ar: 'فريق التطوير' }, description: { en: null, ar: null }, status: 'active' },
  position: { id: 'chief', label: { en: 'Chief', ar: 'رئيس' } },
}
const squ = {
  code: 'SUCCESS',
  status: 'rejected',
  studentNumber: '•••234',
  submittedAt: '2026-11-01T08:00:00Z',
  decidedAt: '2026-11-02T08:00:00Z',
  verifiedAt: null,
  rejectionReason: 'The card photo is blurred.',
  revokedAt: null,
  revocationReason: null,
  submissionsPer30Days: 3,
  recentSubmissions: 1,
  canSubmit: true,
  nextSubmissionAt: null,
}
const leadership = {
  code: 'SUCCESS',
  appointments: [
    { id: 'a-1', active: true, appointedAt: '2026-11-03T08:00:00Z', endedAt: null, endReason: null, ...path, committee: { ...path.committee, archived: false } },
    { id: 'a-2', active: true, appointedAt: '2026-11-03T08:00:00Z', ...path, position: { id: 'chief' } },
  ],
  requests: [
    { id: 'r-1', status: 'cancelled', submittedAt: '2026-10-01T08:00:00Z', decidedAt: '2026-10-02T08:00:00Z', rejectionReason: null, cancellationReason: 'team_moved', ...path },
    { id: 'r-2', status: 'hacked', submittedAt: '2026-10-01T08:00:00Z', ...path },
  ],
  limits: { requestsPer30Days: 5, recentRequests: 0, maxActiveAppointments: null, activeAppointments: 1 },
  dashboardAccess: false,
  requestsOpen: true,
}

describe('toSquState (the SQU verification card)', () => {
  it('reads the SQU state on its own, with the member-facing reason', () => {
    const state = toSquState(squ)!
    assert.equal(state.status, 'rejected')
    assert.equal(state.rejectionReason, 'The card photo is blurred.')
    assert.equal(state.canSubmit, true)
    assert.equal(state.studentNumber, '•••234')
  })

  it('never carries more than Core sends about the student number or the reviewers', () => {
    const state = toSquState({ ...squ, reviewerNote: 'internal', verifiedBy: 'someone', studentNumberFull: '20231234' })!
    const text = JSON.stringify(state)
    for (const secret of ['internal', 'someone', '20231234']) assert.equal(text.includes(secret), false, secret)
  })

  it('treats anything malformed as unavailable, never as "not verified"', () => {
    assert.equal(toSquState({ ...squ, status: 'maybe' }), null)
    assert.equal(toSquState({ squ }), null)
    assert.equal(toSquState(null), null)
    assert.equal(toSquState({ ...squ, canSubmit: 'yes' })!.canSubmit, false)
  })
})

describe('toOwnLeadership (the committee leadership card)', () => {
  it('keeps appointments, requests and limits, and drops entries that are not what Core sends', () => {
    const roles = toOwnLeadership(leadership)!
    assert.deepEqual(
      roles.appointments.map((a) => a.id),
      ['a-1'],
    )
    assert.deepEqual(roles.appointments[0]!.team?.name, { en: 'Development Team', ar: 'فريق التطوير' })
    assert.deepEqual(
      roles.requests.map((r) => [r.id, r.cancellationReason]),
      [['r-1', 'team_moved']],
    )
    assert.equal(roles.limits.maxActiveAppointments, null)
    assert.equal(roles.limits.recentRequests, 0)
  })

  it('reads dashboard access only when Core says so, and anything malformed as unavailable', () => {
    assert.equal(toOwnLeadership({ ...leadership, dashboardAccess: 'yes' })!.dashboardAccess, false)
    assert.equal(toOwnLeadership({ ...leadership, dashboardAccess: true })!.dashboardAccess, true)
    assert.equal(toOwnLeadership({ ...leadership, limits: undefined }), null)
    assert.equal(toOwnLeadership({ ...leadership, appointments: 'none' }), null)
    // The old combined answer is not a leadership answer.
    assert.equal(toOwnLeadership({ squ, leadership: leadership.limits }), null)
    assert.equal(toOwnLeadership(null), null)
  })

  it('reads committee-level leadership, which has no team (Core ADR 0026)', () => {
    const committeeLevel = { id: 'a-9', active: true, appointedAt: '2026-11-20T08:00:00Z', endedAt: null, endReason: null, committee: path.committee, team: null, level: 'committee', position: path.position }
    const pending = { id: 'r-9', status: 'pending', submittedAt: '2026-11-20T08:00:00Z', committee: path.committee, team: null, position: path.position }
    const roles = toOwnLeadership({ ...leadership, appointments: [committeeLevel], requests: [pending] })!
    assert.deepEqual(
      roles.appointments.map((a) => [a.id, a.level, a.team]),
      [['a-9', 'committee', null]],
    )
    assert.deepEqual(
      roles.requests.map((r) => [r.id, r.level, r.team]),
      [['r-9', 'committee', null]],
    )
    assert.equal(toOwnLeadership(leadership)!.appointments[0]!.level, 'team')
    // A team that is present but malformed is dropped, never read as committee level.
    assert.equal(toOwnLeadership({ ...leadership, appointments: [{ ...committeeLevel, team: { id: 7 } }] })!.appointments.length, 0)
  })

  it('reads whether requests are open, and treats a Core without the switch as open', () => {
    assert.equal(toOwnLeadership({ ...leadership, requestsOpen: false })!.requestsOpen, false)
    assert.equal(toOwnLeadership({ ...leadership, requestsOpen: undefined })!.requestsOpen, true)
  })

  it('is independent of the SQU answer: neither reads the other', () => {
    assert.equal(toSquState(leadership), null)
    assert.equal(toOwnLeadership(squ), null)
  })
})

describe('toLeadershipOptions and team selection', () => {
  const options = toLeadershipOptions({
    committees: [
      { id: 'c-1', name: 'Technical Committee', teams: [{ id: 't-1', name: { en: 'Development Team', ar: null } }] },
      { id: 'c-2', name: 'Empty Committee', teams: [] },
      { id: 'c-3', name: 'Broken', teams: [{ id: 't-9' }] },
      { id: 'c-4', name: 'Media Committee', teams: [{ id: 't-4', name: { en: 'Design Team', ar: 'فريق التصميم' } }] },
    ],
    positions: [
      { id: 'chief', label: { en: 'Chief', ar: 'رئيس' } },
      { id: 'assistant_chief', label: { en: 'Assistant Chief' } },
    ],
  })!

  it('offers every committee, with or without teams, and positions with both labels', () => {
    assert.deepEqual(
      options.committees.map((c) => [c.id, c.teams.length]),
      [
        ['c-1', 1],
        ['c-2', 0],
        ['c-3', 0],
        ['c-4', 1],
      ],
    )
    assert.equal(options.requestsOpen, true)
    assert.equal(toLeadershipOptions({ committees: [], positions: [], requestsOpen: false })!.requestsOpen, false)
    assert.deepEqual(options.committees[0]!.teams[0]!.name, { en: 'Development Team', ar: null })
    assert.deepEqual(
      options.positions.map((p) => p.id),
      ['chief'],
    )
    assert.equal(toLeadershipOptions({ committees: 'x' }), null)
  })

  it('keeps a team only under its own committee, so changing committee drops it', () => {
    assert.equal(teamStillOffered(options, 'c-1', 't-1'), true)
    assert.equal(teamStillOffered(options, 'c-4', 't-1'), false)
    // A team Core no longer lists (inactive, archived or moved) is not offered.
    assert.equal(teamStillOffered(options, 'c-1', 't-gone'), false)
    assert.equal(teamStillOffered(null, 'c-1', 't-1'), false)
  })
})

describe('memberFailure (what a card shows when its request fails)', () => {
  it("keeps Core's code and request reference, so the failing request can be found in Core's logs", () => {
    const failure = memberFailure(
      503,
      new Headers({ 'x-request-id': 'ae1e576b-4008-4fc4-b656-23ef60d70d56' }),
      { type: 'https://api.essqu.com/problems/service-unavailable', status: 503, code: 'service-unavailable', requestId: 'ae1e576b-4008-4fc4-b656-23ef60d70d56' },
    )
    assert.deepEqual(failure, { ok: false, status: 503, code: 'service-unavailable', requestId: 'ae1e576b-4008-4fc4-b656-23ef60d70d56' })
  })

  it('names a refused field code first, and never echoes a malformed reference', () => {
    assert.equal(memberFailure(422, new Headers(), { errors: [{ code: 'invalid' }], code: 'invalid-fields' }).code, 'invalid')
    assert.equal(memberFailure(503, new Headers({ 'x-request-id': '<script>' }), null).requestId, undefined)
    assert.equal(memberFailure(503, new Headers(), 'not json').code, 'UNAVAILABLE')
    assert.equal(memberFailure(429, new Headers({ 'retry-after': '60' }), {}).retryAfterSeconds, 60)
  })
})

describe('the SQU student number', () => {
  it('is 6 to 10 digits, as Core requires', () => {
    for (const ok of ['123456', '2023123456']) assert.ok(STUDENT_NUMBER.test(ok), ok)
    for (const bad of ['12345', '12345678901', '12a456', ' 123456']) assert.ok(!STUDENT_NUMBER.test(bad), bad)
  })
})
