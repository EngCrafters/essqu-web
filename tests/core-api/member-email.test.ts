import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { toEmailPreferences } from '@/lib/core-api/member-email'
import { toOwnLeadership } from '@/lib/core-api/member-roles'

// Core ADR 0028: GET /me/email-preferences, and ADR 0027: which positions give dashboard access.
describe('email announcements preference', () => {
  it('accepts only a boolean choice from Core', () => {
    assert.deepEqual(toEmailPreferences({ code: 'SUCCESS', announcements: false }), { announcements: false })
    assert.deepEqual(toEmailPreferences({ announcements: true }), { announcements: true })
    assert.equal(toEmailPreferences({ announcements: 'yes' }), null)
    assert.equal(toEmailPreferences(null), null)
  })
})

describe('positions and dashboard access', () => {
  const base = {
    code: 'SUCCESS',
    requestsOpen: true,
    requests: [],
    limits: { requestsPer30Days: 5, recentRequests: 0, maxActiveAppointments: null, activeAppointments: 1 },
    dashboardAccess: true,
  }
  const appointment = (fields: Record<string, unknown>) => ({
    id: 'a-1',
    active: true,
    appointedAt: '2026-11-01T08:00:00Z',
    endedAt: null,
    endReason: null,
    committee: { id: 'c-1', name: 'Media Committee' },
    team: null,
    position: { id: 'chief', label: { en: 'Chief', ar: 'رئيس' } },
    ...fields,
  })

  it('shows which active position gives access, and treats an older Core as none', () => {
    const own = toOwnLeadership({
      ...base,
      appointments: [appointment({ grantsAccess: true }), appointment({ id: 'a-2', grantsAccess: false }), appointment({ id: 'a-3' })],
    })
    assert.deepEqual(
      own?.appointments.map((a) => a.grantsAccess),
      [true, false, false],
    )
    assert.equal(own?.dashboardAccess, true)
  })

  it('never shows an ended position as giving access', () => {
    const own = toOwnLeadership({ ...base, appointments: [appointment({ active: false, endedAt: '2026-11-10T08:00:00Z', grantsAccess: true })] })
    assert.equal(own?.appointments[0].grantsAccess, false)
  })
})
