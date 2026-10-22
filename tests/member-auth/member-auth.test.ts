import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { signUpApplicant } from '@/lib/member-auth/client'
import { getMemberAuthConfig } from '@/lib/member-auth/config.server'
import { classifyAuthError } from '@/lib/member-auth/errors'
import { readAuthLink, withoutAuthLink } from '@/lib/member-auth/links'
import { fetchOwnMembership } from '@/lib/member-auth/membership'
import { MIN_PASSWORD_LENGTH, checkConfirmation, checkPassword } from '@/lib/member-auth/password'
import { fakeFetch, json, problem } from '../support/core'

describe('the password rule (Supabase Auth’s policy: 8 characters minimum)', () => {
  it('accepts exactly what Supabase Auth accepts', () => {
    assert.equal(MIN_PASSWORD_LENGTH, 8)
    assert.equal(checkPassword(''), 'required')
    assert.equal(checkPassword('1234567'), 'too-short')
    assert.equal(checkPassword('12345678'), null)
    assert.equal(checkPassword('كلمة مرور'), null)
    assert.equal(checkPassword('a'.repeat(72)), null)
    assert.equal(checkPassword('a'.repeat(73)), 'too-long')
    // 72 bytes, not characters: 37 two-byte Arabic letters are 74 bytes.
    assert.equal(checkPassword('ب'.repeat(37)), 'too-long')
  })

  it('requires a matching confirmation', () => {
    assert.equal(checkConfirmation('password1', ''), 'required')
    assert.equal(checkConfirmation('password1', 'password2'), 'mismatch')
    assert.equal(checkConfirmation('password1', 'password1'), null)
  })
})

describe('Auth email links', () => {
  it('reads a token-hash link, refusing malformed ones', () => {
    assert.deepEqual(readAuthLink('?token_hash=pkce_abc123def456&type=recovery', ''), { kind: 'token-hash', tokenHash: 'pkce_abc123def456', type: 'recovery' })
    assert.deepEqual(readAuthLink('?token_hash=abc%2F..%2Fx&type=recovery', ''), { kind: 'error', failure: 'invalid' })
    assert.deepEqual(readAuthLink('?token_hash=abcdefgh1234&type=admin', ''), { kind: 'error', failure: 'invalid' })
  })

  it('reads the implicit-flow fragment and Supabase’s error redirects', () => {
    assert.deepEqual(readAuthLink('', '#access_token=a.b.c&refresh_token=r1&type=signup'), { kind: 'session', accessToken: 'a.b.c', refreshToken: 'r1', type: 'signup' })
    assert.deepEqual(readAuthLink('', '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'), { kind: 'error', failure: 'expired' })
    assert.deepEqual(readAuthLink('?error=server_error', ''), { kind: 'error', failure: 'invalid' })
    // A PKCE code needs a verifier this site never created.
    assert.deepEqual(readAuthLink('?code=abc', ''), { kind: 'error', failure: 'invalid' })
    assert.deepEqual(readAuthLink('?lang=ar', ''), { kind: 'none' })
  })

  it('takes every Auth parameter and the fragment out of the address, keeping the rest', () => {
    assert.equal(withoutAuthLink('https://essqu.com/reset-password?token_hash=x&type=recovery&lang=ar#access_token=y'), '/reset-password?lang=ar')
    assert.equal(withoutAuthLink('https://essqu.com/login#access_token=a&refresh_token=b'), '/login')
  })
})

describe('Auth errors', () => {
  it('never tells a missing account from a wrong password, and never guesses', () => {
    assert.equal(classifyAuthError({ code: 'invalid_credentials', status: 400 }), 'invalid-credentials')
    assert.equal(classifyAuthError({ code: 'user_not_found', status: 400 }), 'invalid-credentials')
    assert.equal(classifyAuthError({ code: 'email_not_confirmed', status: 400 }), 'email-not-confirmed')
    assert.equal(classifyAuthError({ code: 'weak_password', status: 422 }), 'weak-password')
    assert.equal(classifyAuthError({ code: 'same_password', status: 422 }), 'same-password')
    assert.equal(classifyAuthError({ code: 'user_banned', status: 403 }), 'disabled')
    assert.equal(classifyAuthError({ code: 'otp_expired', status: 403 }), 'link-expired')
    assert.equal(classifyAuthError({ code: 'session_not_found', status: 403 }), 'session-missing')
    assert.equal(classifyAuthError({ name: 'AuthSessionMissingError' }), 'session-missing')
    assert.equal(classifyAuthError({ code: 'over_email_send_rate_limit', status: 429 }), 'rate-limited')
    assert.equal(classifyAuthError({ status: 500 }), 'unavailable')
    assert.equal(classifyAuthError({ code: 'validation_failed', status: 400 }), 'unavailable')
    assert.equal(classifyAuthError(null), 'unavailable')
  })
})

describe('the signed-in person’s own membership', () => {
  const BASE = 'https://api.essqu.com/v1'
  const TOKEN = 'header.payload.signature'

  it('asks Core with the token in the Authorization header only, and no cookie', async () => {
    const { impl, calls } = fakeFetch(() => json({ data: { emailConfirmed: true, member: null, application: { status: 'verified', submittedAt: '2026-10-20T10:00:00.000Z', decidedAt: null, activated: false } } }))
    assert.deepEqual(await fetchOwnMembership(BASE, TOKEN, impl), { kind: 'application', stage: 'verified', submittedAt: '2026-10-20T10:00:00.000Z' })
    assert.equal(calls[0]!.url, `${BASE}/me/membership`)
    assert.equal(calls[0]!.url.includes(TOKEN), false)
    assert.equal(calls[0]!.init.credentials, 'omit')
    assert.equal((calls[0]!.init.headers as Record<string, string>).authorization, `Bearer ${TOKEN}`)
  })

  it('puts membership first, then the application, then nothing', async () => {
    const member = await fetchOwnMembership(BASE, TOKEN, fakeFetch(() => json({ data: { emailConfirmed: true, member: { status: 'member', since: '2026-11-01T08:00:00.000Z' }, application: { status: 'approved', submittedAt: '2026-10-20T10:00:00.000Z', decidedAt: null, activated: true } } })).impl)
    assert.deepEqual(member, { kind: 'member', since: '2026-11-01T08:00:00.000Z' })
    assert.deepEqual(await fetchOwnMembership(BASE, TOKEN, fakeFetch(() => json({ data: { emailConfirmed: true, member: null, application: null } })).impl), { kind: 'none' })
    assert.deepEqual(await fetchOwnMembership(BASE, TOKEN, fakeFetch(() => json({ data: { emailConfirmed: false, member: null, application: null } })).impl), { kind: 'unconfirmed' })
  })

  it('tells signed-out from unavailable, and distrusts odd answers', async () => {
    assert.deepEqual(await fetchOwnMembership(BASE, TOKEN, fakeFetch(() => json(problem(401, 'unauthorized'), 401)).impl), { kind: 'signed-out' })
    assert.deepEqual(await fetchOwnMembership(BASE, TOKEN, fakeFetch(() => json(problem(503, 'service-unavailable'), 503)).impl), { kind: 'unavailable' })
    assert.deepEqual(await fetchOwnMembership(BASE, TOKEN, fakeFetch(() => json({ data: { emailConfirmed: true, member: { status: 'admin', since: 'x' }, application: null } })).impl), { kind: 'unavailable' })
    assert.deepEqual(await fetchOwnMembership(BASE, TOKEN, fakeFetch(() => json({ data: { emailConfirmed: true, member: null, application: { status: 'hacked', submittedAt: '2026-10-20T10:00:00.000Z' } } })).impl), { kind: 'unavailable' })
    const offline = fakeFetch(() => {
      throw new TypeError('Failed to fetch')
    })
    assert.deepEqual(await fetchOwnMembership(BASE, TOKEN, offline.impl), { kind: 'unavailable' })
  })
})

describe('the applicant’s sign-up', () => {
  function client(result: { error: { code?: string; status?: number } | null } | Error) {
    const calls: unknown[] = []
    return {
      calls,
      auth: {
        signUp: async (input: unknown) => {
          calls.push(input)
          if (result instanceof Error) throw result
          return { data: { user: null, session: null }, ...result }
        },
      },
    }
  }

  it('sends the password to Supabase Auth only, with the confirmation link back to /login', async () => {
    const fake = client({ error: null })
    assert.deepEqual(await signUpApplicant(fake as never, ' S123456@SQU.EDU.OM ', 'chosen-password', 'https://essqu.com/login'), { ok: true })
    assert.deepEqual(fake.calls, [{ email: 's123456@squ.edu.om', password: 'chosen-password', options: { emailRedirectTo: 'https://essqu.com/login' } }])
  })

  it('reports a refused password, a limit or an outage, and never throws', async () => {
    assert.deepEqual(await signUpApplicant(client({ error: { code: 'weak_password', status: 422 } }) as never, 'a@squ.edu.om', 'x', 'https://essqu.com/login'), { ok: false, problem: 'weak-password' })
    assert.deepEqual(await signUpApplicant(client({ error: { code: 'over_email_send_rate_limit', status: 429 } }) as never, 'a@squ.edu.om', 'x', 'https://essqu.com/login'), { ok: false, problem: 'rate-limited' })
    assert.deepEqual(await signUpApplicant(client(new TypeError('Failed to fetch')) as never, 'a@squ.edu.om', 'x', 'https://essqu.com/login'), { ok: false, problem: 'unavailable' })
  })
})

describe('sign-in configuration', () => {
  const key = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.c2lnbmF0dXJl'
  it('takes only a clean Supabase origin and a key-shaped anon key', () => {
    assert.deepEqual(getMemberAuthConfig({ SUPABASE_URL: 'https://project.supabase.co', SUPABASE_ANON_KEY: key }), { url: 'https://project.supabase.co', anonKey: key })
    assert.equal(getMemberAuthConfig({}), null)
    assert.equal(getMemberAuthConfig({ SUPABASE_URL: 'http://project.supabase.co', SUPABASE_ANON_KEY: key }), null)
    assert.equal(getMemberAuthConfig({ SUPABASE_URL: 'https://project.supabase.co/rest/v1', SUPABASE_ANON_KEY: key }), null)
    assert.equal(getMemberAuthConfig({ SUPABASE_URL: 'https://project.supabase.co', SUPABASE_ANON_KEY: 'short' }), null)
    assert.equal(getMemberAuthConfig({ SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_ANON_KEY: key, VERCEL_ENV: 'production' }), null)
    assert.equal(getMemberAuthConfig({ SUPABASE_URL: 'http://project.example:54321', SUPABASE_ANON_KEY: key }), null)
    assert.deepEqual(getMemberAuthConfig({ SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_ANON_KEY: key })?.url, 'http://127.0.0.1:54321')
  })
})
