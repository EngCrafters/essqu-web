import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DEFAULTS, normaliseBaseUrl, resolveCoreConfig } from '@/lib/core-api/config.server'

const KEY = 'essq_test_landing01_' + 'a'.repeat(43)
const CORE = { CORE_API_BASE_URL: 'https://api.essqu.com/v1', CORE_EVENTS_API_KEY: KEY }

describe('resolveCoreConfig', () => {
  it('connects to Core when the base URL and key are set', () => {
    assert.deepEqual(resolveCoreConfig({ ...CORE, NODE_ENV: 'production', VERCEL_ENV: 'production' }), {
      mode: 'core',
      baseUrl: 'https://api.essqu.com/v1',
      apiKey: KEY,
      timeoutMs: DEFAULTS.timeoutMs,
      revalidateSeconds: DEFAULTS.revalidateSeconds,
    })
  })

  it('uses the sample catalogue in local development with nothing configured', () => {
    assert.deepEqual(resolveCoreConfig({ NODE_ENV: 'development' }), { mode: 'sample' })
  })

  it('never falls back to samples outside development', () => {
    assert.deepEqual(resolveCoreConfig({ NODE_ENV: 'production' }), { mode: 'unconfigured', problem: 'missing-base-url' })
    assert.deepEqual(resolveCoreConfig({ NODE_ENV: 'production', VERCEL_ENV: 'preview' }), { mode: 'unconfigured', problem: 'missing-base-url' })
  })

  it('refuses sample mode on a Vercel production deployment, whatever is asked', () => {
    assert.deepEqual(resolveCoreConfig({ CORE_API_MODE: 'sample', VERCEL_ENV: 'production' }), { mode: 'unconfigured', problem: 'sample-not-allowed' })
    assert.deepEqual(resolveCoreConfig({ NODE_ENV: 'development', VERCEL_ENV: 'production' }), { mode: 'unconfigured', problem: 'missing-base-url' })
  })

  it('allows explicit sample mode for previews and design review', () => {
    assert.deepEqual(resolveCoreConfig({ CORE_API_MODE: 'sample', VERCEL_ENV: 'preview', ...CORE }), { mode: 'sample' })
  })

  it('requires the server key for Core mode', () => {
    assert.deepEqual(resolveCoreConfig({ CORE_API_BASE_URL: CORE.CORE_API_BASE_URL }), { mode: 'unconfigured', problem: 'missing-api-key' })
    assert.deepEqual(resolveCoreConfig({ ...CORE, CORE_EVENTS_API_KEY: 'two words' }), { mode: 'unconfigured', problem: 'invalid-api-key' })
  })

  it('rejects an unknown mode', () => {
    assert.deepEqual(resolveCoreConfig({ ...CORE, CORE_API_MODE: 'fixtures' }), { mode: 'unconfigured', problem: 'invalid-mode' })
  })

  it('keeps timeout and cache lifetime within bounds', () => {
    const tuned = resolveCoreConfig({ ...CORE, CORE_API_TIMEOUT_MS: '2500', CORE_EVENTS_REVALIDATE_SECONDS: '0' })
    assert.equal(tuned.mode, 'core')
    if (tuned.mode === 'core') {
      assert.equal(tuned.timeoutMs, 2500)
      assert.equal(tuned.revalidateSeconds, 0)
    }
    const wild = resolveCoreConfig({ ...CORE, CORE_API_TIMEOUT_MS: '999999', CORE_EVENTS_REVALIDATE_SECONDS: '-4' })
    if (wild.mode === 'core') {
      assert.equal(wild.timeoutMs, DEFAULTS.timeoutMs)
      assert.equal(wild.revalidateSeconds, DEFAULTS.revalidateSeconds)
    } else assert.fail('expected core mode')
  })
})

describe('normaliseBaseUrl', () => {
  it('accepts the versioned API address and trims a trailing slash', () => {
    assert.deepEqual(normaliseBaseUrl('https://api.essqu.com/v1/', {}), { ok: true, value: 'https://api.essqu.com/v1' })
  })

  it('requires the /v1 path the contract is versioned in', () => {
    assert.deepEqual(normaliseBaseUrl('https://api.essqu.com', {}), { ok: false, problem: 'invalid-base-url' })
    assert.deepEqual(normaliseBaseUrl('https://api.essqu.com/v2', {}), { ok: false, problem: 'invalid-base-url' })
  })

  it('allows plain HTTP only for a Core on this machine, and never in Vercel production', () => {
    assert.deepEqual(normaliseBaseUrl('http://127.0.0.1:3001/v1', {}), { ok: true, value: 'http://127.0.0.1:3001/v1' })
    assert.deepEqual(normaliseBaseUrl('http://localhost:3001/v1', {}), { ok: true, value: 'http://localhost:3001/v1' })
    assert.deepEqual(normaliseBaseUrl('http://api.essqu.com/v1', {}), { ok: false, problem: 'insecure-base-url' })
    assert.deepEqual(normaliseBaseUrl('http://127.0.0.1:3001/v1', { VERCEL_ENV: 'production' }), { ok: false, problem: 'insecure-base-url' })
  })

  it('rejects credentials, queries and fragments in the URL', () => {
    for (const raw of ['https://user:pw@api.essqu.com/v1', 'https://api.essqu.com/v1?x=1', 'https://api.essqu.com/v1#a', 'ftp://api.essqu.com/v1', 'not a url']) {
      assert.equal(normaliseBaseUrl(raw, {}).ok, false, raw)
    }
  })
})
