import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  MAX_DOCUMENT_BYTES,
  MEMBERSHIP_CONSENT_VERSION,
  fetchApplicationStatus,
  forgetApplication,
  membershipFormData,
  membershipOutcomeFor,
  prepareDocument,
  recallApplication,
  rememberApplication,
  sniffDocument,
} from '@/lib/core-api/membership'
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
  it('sends exactly the fields Core accepts, the consent wording version and the prepared card', () => {
    const form = membershipFormData(
      { fullName: ' Aisha Al-Hinai ', email: ' S123456@SQU.EDU.OM ', universityId: ' 123456 ', academicYear: '2', discipline: 'civil', interests: ['cad', 'data'] },
      { blob: encoded, fileName: 'squ-id-card.jpg' },
    )
    assert.deepEqual([...new Set(form.keys())].sort(), ['academicYear', 'consent', 'consentVersion', 'discipline', 'email', 'fullName', 'idDocument', 'interests', 'universityId'])
    assert.equal(form.get('fullName'), 'Aisha Al-Hinai')
    assert.equal(form.get('email'), 's123456@squ.edu.om')
    assert.equal(form.get('universityId'), '123456')
    assert.deepEqual(form.getAll('interests'), ['cad', 'data'])
    assert.equal(form.get('consent'), 'true')
    assert.equal(form.get('consentVersion'), MEMBERSHIP_CONSENT_VERSION)
    assert.equal((form.get('idDocument') as File).name, 'squ-id-card.jpg')
  })
})

describe('membershipOutcomeFor', () => {
  it('reports success only with a well-formed status token', () => {
    assert.deepEqual(membershipOutcomeFor(201, { data: { status: 'pending_review', statusToken: TOKEN } }, null), { kind: 'submitted', statusToken: TOKEN })
    assert.deepEqual(membershipOutcomeFor(201, { data: { status: 'pending_review' } }, null), { kind: 'unavailable' })
    assert.deepEqual(membershipOutcomeFor(200, { data: { statusToken: TOKEN } }, null), { kind: 'unavailable' })
  })

  it('maps duplicates, rate limits, field errors and failures', () => {
    assert.deepEqual(membershipOutcomeFor(409, problem(409, 'conflict', { reason: 'already-applied' }), null), { kind: 'conflict', reason: 'already-applied' })
    assert.deepEqual(membershipOutcomeFor(409, problem(409, 'conflict', { reason: 'already-member' }), null), { kind: 'conflict', reason: 'already-member' })
    assert.deepEqual(membershipOutcomeFor(409, problem(409, 'conflict'), null), { kind: 'conflict', reason: null })
    assert.deepEqual(membershipOutcomeFor(429, problem(429, 'rate-limited'), '3600'), { kind: 'rate-limited', retryAfterSeconds: 3600 })
    assert.deepEqual(
      membershipOutcomeFor(422, problem(422, 'invalid-fields', { errors: [{ field: 'email', code: 'invalid' }, { field: 'idDocument', code: 'unsupported-type' }, { field: 'status', code: 'unexpected-field' }] }), null),
      { kind: 'invalid', fields: [{ field: 'email', code: 'invalid' }, { field: 'idDocument', code: 'unsupported-type' }] },
    )
    assert.deepEqual(membershipOutcomeFor(413, problem(413, 'payload-too-large'), null), { kind: 'invalid', fields: [{ field: 'idDocument', code: 'too-large' }] })
    for (const status of [400, 403, 415, 500, 503]) assert.deepEqual(membershipOutcomeFor(status, null, null), { kind: 'unavailable' }, String(status))
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
