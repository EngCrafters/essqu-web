import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  MAX_DOCUMENT_BYTES,
  MEMBERSHIP_CONSENT_VERSION,
  fetchApplicationStatus,
  forgetApplication,
  membershipFormData,
  immediateAccountFor,
  membershipOutcomeFor,
  prepareDocument,
  recallApplication,
  rememberApplication,
  sniffDocument,
} from '@/lib/core-api/membership'
import { findCategory, toMembershipOptions } from '@/lib/core-api/membership-options'
import { fakeFetch, json, problem } from '../support/core'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 9, 9])
const PDF = new TextEncoder().encode('%PDF-1.7\n%%EOF')
const TOKEN = 'T'.repeat(43)
const file = (bytes: Uint8Array, name = 'card.bin', type = '') => new File([new Uint8Array(bytes)], name, { type })
const encoded = new Blob([JPEG], { type: 'image/jpeg' })

describe('sniffDocument', () => {
  it('reads the type from the bytes, as Core does', () => {
    assert.equal(sniffDocument(PNG), 'image/png')
    assert.equal(sniffDocument(JPEG), 'image/jpeg')
    assert.equal(sniffDocument(PDF), 'application/pdf')
    assert.equal(sniffDocument(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ')), 'image/webp')
    assert.equal(sniffDocument(new TextEncoder().encode('GIF89a')), null)
    assert.equal(sniffDocument(new TextEncoder().encode('<svg/>')), null)
  })
})

describe('prepareDocument', () => {
  it('requires a file', async () => {
    assert.deepEqual(await prepareDocument(null), { ok: false, problem: 'required' })
    assert.deepEqual(await prepareDocument(file(new Uint8Array())), { ok: false, problem: 'required' })
  })

  it('refuses files that are not images or PDFs, whatever they are called', async () => {
    assert.deepEqual(await prepareDocument(file(new TextEncoder().encode('<svg/>'), 'card.png', 'image/png')), { ok: false, problem: 'unsupported-type' })
  })

  it('sends a PDF as it is, within the size limit', async () => {
    const prepared = await prepareDocument(file(PDF, 'scan.pdf'))
    assert.equal(prepared.ok, true)
    if (prepared.ok) assert.equal(prepared.fileName, 'squ-id-card.pdf')
    const big = new Uint8Array(MAX_DOCUMENT_BYTES + 1)
    big.set(PDF)
    assert.deepEqual(await prepareDocument(file(big)), { ok: false, problem: 'too-large' })
  })

  it('re-encodes a photo to JPEG (dropping its metadata) and never sends the original', async () => {
    let seen: Blob | null = null
    const prepared = await prepareDocument(file(PNG, 'IMG_2041.png'), async (input) => {
      seen = input
      return encoded
    })
    assert.ok(seen)
    assert.deepEqual(prepared, { ok: true, blob: encoded, fileName: 'squ-id-card.jpg', kind: 'image/jpeg' })
  })

  it('explains a photo the browser cannot read, and one still too large after shrinking', async () => {
    assert.deepEqual(await prepareDocument(file(JPEG), async () => null), { ok: false, problem: 'unreadable' })
    assert.deepEqual(await prepareDocument(file(JPEG), async () => new Blob([new Uint8Array(MAX_DOCUMENT_BYTES + 1)])), { ok: false, problem: 'too-large' })
  })
})

describe('membershipFormData', () => {
  const student = { id: 'university_student', label: { en: 'University Student', ar: 'طالب جامعي' }, institution: 'required' as const, academicYear: true }
  const graduate = { id: 'graduate', label: { en: 'Graduate / Alumni', ar: 'خرّيج' }, institution: 'optional' as const, academicYear: false }
  const professional = { id: 'industry_professional', label: { en: 'Industry Professional', ar: 'مهني' }, institution: 'none' as const, academicYear: false }
  const values = {
    fullName: ' Aisha Al-Hinai ', email: ' Aisha@Gmail.COM ',
    category: 'university_student',
    institution: 'utas',
    institutionName: '',
    academicYear: '2', discipline: 'civil', interests: ['cad', 'data'],
  }

  it('sends a student’s fields, the consent wording version, and no student ID or document', () => {
    const form = membershipFormData(values, student)
    assert.deepEqual([...new Set(form.keys())].sort(), ['academicYear', 'category',
      'consent', 'consentVersion', 'discipline', 'email', 'fullName', 'institution', 'interests',
    ])
    assert.equal(form.get('fullName'), 'Aisha Al-Hinai')
    assert.equal(form.get('email'), 'aisha@gmail.com')
    assert.equal(form.get('category'), 'university_student')
    assert.equal(form.get('institution'), 'utas')
    assert.equal(form.get('academicYear'), '2')
    assert.deepEqual(form.getAll('interests'), ['cad', 'data'])
    assert.equal(form.get('consent'), 'true')
    assert.equal(form.get('consentVersion'), MEMBERSHIP_CONSENT_VERSION)
    assert.equal(MEMBERSHIP_CONSENT_VERSION, '2026-11-v2')
    assert.equal(form.has('idDocument'), false)
    assert.equal(form.has('universityId'), false)
  })

  it('sends a typed university name only with “Other university”', () => {
    const form = membershipFormData({ ...values, institution: 'other', institutionName: '  ETH Zürich ' }, student)
    assert.equal(form.get('institution'), 'other')
    assert.equal(form.get('institutionName'), 'ETH Zürich')
    assert.equal(membershipFormData({ ...values, institutionName: 'Stale' }, student).has('institutionName'), false)
  })

  it('never sends a detail the category does not collect, even if it was typed before switching', () => {
    const form = membershipFormData(
      { ...values, category: 'industry_professional', institution: 'other', institutionName: 'Stale', academicYear: '4' },
      professional,
    )
    assert.deepEqual([...new Set(form.keys())].sort(), ['category', 'consent', 'consentVersion', 'discipline', 'email', 'fullName', 'interests'])
    const alumnus = membershipFormData({ ...values, category: 'graduate', institution: '', academicYear: '3' }, graduate)
    assert.equal(alumnus.has('institution'), false)
    assert.equal(alumnus.has('academicYear'), false)
    assert.equal(membershipFormData({ ...values, category: 'graduate', institution: 'squ' }, graduate).get('institution'), 'squ')
  })
})

describe('toMembershipOptions', () => {
  const body = {
    data: {
      categories: [
        { id: 'university_student', label: { en: 'University Student', ar: 'طالب جامعي' }, institution: 'required', academicYear: true },
        { id: 'BAD ID', label: { en: 'x', ar: 'x' }, institution: 'none', academicYear: false },
        { id: 'other', label: { en: 'Other', ar: 'أخرى' }, institution: 'sometimes', academicYear: false },
      ],
      institutions: [
        { id: 'squ', name: { en: 'Sultan Qaboos University (SQU)', ar: 'جامعة السلطان قابوس' }, country: 'OM' },
        { id: 'other', name: { en: 'Clash', ar: 'تعارض' }, country: 'OM' },
        { id: 'no-arabic', name: { en: 'Only English' }, country: 'OM' },
      ],
      consentVersion: '2026-11-v2',
    },
  }

  it('keeps only categories and institutions it can render, and never an institution called "other"', () => {
    const options = toMembershipOptions(body)!
    assert.deepEqual(
      options.categories.map((c) => c.id),
      ['university_student'],
    )
    assert.deepEqual(
      options.institutions.map((i) => i.id),
      ['squ'],
    )
    assert.equal(options.consentVersion, '2026-11-v2')
    // A Core before automatic approval (Core ADR 0029) doesn't say: the page keeps the review wording.
    assert.equal(options.approval, 'review')
    assert.equal(findCategory(options, 'university_student')?.academicYear, true)
    assert.equal(findCategory(options, 'astronaut'), null)
  })

  it('reads immediate account activation only from the exact value (Core ADR 0030)', () => {
    assert.equal(toMembershipOptions(body)!.accountActivation, 'email_confirmation')
    assert.equal(toMembershipOptions({ data: { ...body.data, accountActivation: 'immediate' } })!.accountActivation, 'immediate')
    assert.equal(toMembershipOptions({ data: { ...body.data, accountActivation: 'yes' } })!.accountActivation, 'email_confirmation')
  })

  it('reads automatic approval only from the exact value', () => {
    assert.equal(toMembershipOptions({ data: { ...body.data, approval: 'automatic' } })!.approval, 'automatic')
    assert.equal(toMembershipOptions({ data: { ...body.data, approval: 'AUTOMATIC' } })!.approval, 'review')
    assert.equal(toMembershipOptions({ data: { ...body.data, approval: true } })!.approval, 'review')
  })

  it('reads anything unexpected as unavailable', () => {
    assert.equal(toMembershipOptions(null), null)
    assert.equal(toMembershipOptions({ data: { ...body.data, categories: [] } }), null)
    assert.equal(toMembershipOptions({ data: { ...body.data, consentVersion: '<script>' } }), null)
  })
})

describe('immediateAccountFor (Core ADR 0030)', () => {
  const TOKEN_HASH = 'f'.repeat(56)
  it('accepts only a well-formed one-time sign-in token', () => {
    assert.deepEqual(immediateAccountFor(201, { data: { tokenHash: TOKEN_HASH, member: true } }), { kind: 'ready', tokenHash: TOKEN_HASH, member: true })
    assert.deepEqual(immediateAccountFor(201, { data: { tokenHash: TOKEN_HASH } }), { kind: 'ready', tokenHash: TOKEN_HASH, member: false })
    assert.deepEqual(immediateAccountFor(201, { data: { tokenHash: 'short' } }), { kind: 'unavailable' })
    assert.deepEqual(immediateAccountFor(201, { data: { tokenHash: 'has spaces and <tags> '.repeat(3) } }), { kind: 'unavailable' })
  })

  it('maps every refusal, and falls back to email confirmation when Core cannot create accounts', () => {
    assert.deepEqual(immediateAccountFor(409, { reason: 'confirmation-required' }), { kind: 'confirmation-required' })
    assert.deepEqual(immediateAccountFor(409, { reason: 'account-exists' }), { kind: 'account-exists' })
    assert.deepEqual(immediateAccountFor(409, { reason: 'already-set-up' }), { kind: 'already-set-up' })
    assert.deepEqual(immediateAccountFor(409, { reason: 'expired' }), { kind: 'expired' })
    assert.deepEqual(immediateAccountFor(503, { reason: 'not-configured' }), { kind: 'confirmation-required' })
    for (const [status, body] of [[503, null], [404, {}], [409, { reason: 'other' }], [500, 'x']] as const) {
      assert.deepEqual(immediateAccountFor(status, body), { kind: 'unavailable' })
    }
  })
})

describe('membershipOutcomeFor', () => {
  it('reports success only with a well-formed status token', () => {
    const confirm = { accountActivation: 'email_confirmation' }
    assert.deepEqual(membershipOutcomeFor(201, { data: { status: 'pending_review', statusToken: TOKEN } }, null), { kind: 'submitted', statusToken: TOKEN, status: 'pending_review', ...confirm })
    // Core ADR 0029: approved at submission. Only the exact 'approved' counts.
    assert.deepEqual(membershipOutcomeFor(201, { data: { status: 'approved', statusToken: TOKEN } }, null), { kind: 'submitted', statusToken: TOKEN, status: 'approved', ...confirm })
    assert.deepEqual(membershipOutcomeFor(201, { data: { status: 'member', statusToken: TOKEN } }, null), { kind: 'submitted', statusToken: TOKEN, status: 'pending_review', ...confirm })
    assert.deepEqual(membershipOutcomeFor(201, { data: { statusToken: TOKEN } }, null), { kind: 'submitted', statusToken: TOKEN, status: 'pending_review', ...confirm })
    // Core ADR 0030: only the exact 'immediate' skips the confirmation email.
    assert.deepEqual(membershipOutcomeFor(201, { data: { status: 'approved', statusToken: TOKEN, accountActivation: 'immediate' } }, null), {
      kind: 'submitted',
      statusToken: TOKEN,
      status: 'approved',
      accountActivation: 'immediate',
    })
    assert.equal((membershipOutcomeFor(201, { data: { statusToken: TOKEN, accountActivation: 'IMMEDIATE' } }, null) as { accountActivation: string }).accountActivation, 'email_confirmation')
    assert.deepEqual(membershipOutcomeFor(201, { data: { status: 'pending_review' } }, null), { kind: 'unavailable' })
    assert.deepEqual(membershipOutcomeFor(200, { data: { statusToken: TOKEN } }, null), { kind: 'unavailable' })
  })

  it('maps duplicates, rate limits, field errors and failures', () => {
    assert.deepEqual(membershipOutcomeFor(409, problem(409, 'conflict', { reason: 'already-applied' }), null), { kind: 'conflict', reason: 'already-applied' })
    assert.deepEqual(membershipOutcomeFor(409, problem(409, 'conflict', { reason: 'already-member' }), null), { kind: 'conflict', reason: 'already-member' })
    assert.deepEqual(membershipOutcomeFor(409, problem(409, 'conflict'), null), { kind: 'conflict', reason: null })
    assert.deepEqual(membershipOutcomeFor(429, problem(429, 'rate-limited'), '3600'), { kind: 'rate-limited', retryAfterSeconds: 3600 })
    assert.deepEqual(
      membershipOutcomeFor(422, problem(422, 'invalid-fields', { errors: [{ field: 'email', code: 'invalid' }, { field: 'institutionName', code: 'required' }, { field: 'status', code: 'unexpected-field' }] }), null),
      { kind: 'invalid', fields: [{ field: 'email', code: 'invalid' }, { field: 'institutionName', code: 'required' }] },
    )
    // No document is sent any more, so an oversized body is simply a failure.
    for (const status of [400, 403, 413, 415, 500, 503]) assert.deepEqual(membershipOutcomeFor(status, null, null), { kind: 'unavailable' }, String(status))
  })
})

describe('fetchApplicationStatus', () => {
  const BASE = 'https://api.essqu.com/v1'

  it('asks with the token in the body and no credentials', async () => {
    const { impl, calls } = fakeFetch(() => json({ data: { status: 'approved', submittedAt: '2026-10-20T10:00:00.000Z', decidedAt: '2026-10-21T08:00:00.000Z', activated: true } }))
    assert.deepEqual(await fetchApplicationStatus(BASE, TOKEN, impl), { kind: 'status', status: 'approved', activated: true, submittedAt: '2026-10-20T10:00:00.000Z' })
    assert.equal(calls[0]!.url, `${BASE}/membership-applications/status`)
    assert.equal(calls[0]!.init.credentials, 'omit')
    assert.deepEqual(JSON.parse(String(calls[0]!.init.body)), { statusToken: TOKEN })
    assert.equal(calls[0]!.url.includes(TOKEN), false)
  })

  it('distinguishes an unknown token from an outage, and never throws', async () => {
    assert.deepEqual(await fetchApplicationStatus(BASE, TOKEN, fakeFetch(() => json(problem(404, 'not-found'), 404)).impl), { kind: 'not-found' })
    assert.deepEqual(await fetchApplicationStatus(BASE, TOKEN, fakeFetch(() => json(problem(503, 'service-unavailable'), 503)).impl), { kind: 'unavailable' })
    assert.deepEqual(await fetchApplicationStatus(BASE, TOKEN, fakeFetch(() => json({ data: { status: 'hacked' } })).impl), { kind: 'unavailable' })
    const offline = fakeFetch(() => {
      throw new TypeError('Failed to fetch')
    })
    assert.deepEqual(await fetchApplicationStatus(BASE, TOKEN, offline.impl), { kind: 'unavailable' })
  })
})

describe('the status token in this browser', () => {
  it('is remembered, validated on the way back, and forgotten', () => {
    const store = new Map<string, string>()
    ;(globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    }
    try {
      assert.equal(recallApplication(), null)
      rememberApplication(TOKEN)
      assert.equal(recallApplication(), TOKEN)
      store.set('es-membership-application', 'tampered value')
      assert.equal(recallApplication(), null)
      forgetApplication()
      assert.equal(store.size, 0)
    } finally {
      delete (globalThis as { localStorage?: unknown }).localStorage
    }
    // Without storage (private mode) nothing throws.
    assert.equal(recallApplication(), null)
    rememberApplication(TOKEN)
    forgetApplication()
  })
})
