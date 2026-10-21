import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { siteHeaders } from '@/lib/security-headers'

type Header = { key: string; value: string }

const ENV = { NODE_ENV: 'production', CORE_API_BASE_URL: 'https://api.essqu.com/v1', SUPABASE_URL: 'https://project.supabase.co' }

function headersFor(source: string): Header[] {
  // Next applies every matching rule in order; a later value for the same key wins.
  const merged = new Map<string, string>()
  for (const rule of siteHeaders(ENV)) if (rule.source === '/:path*' || rule.source === source) for (const h of rule.headers) merged.set(h.key, h.value)
  return [...merged].map(([key, value]) => ({ key, value }))
}
const get = (headers: Header[], key: string) => headers.find((h) => h.key === key)?.value

describe('site-wide security headers', () => {
  it('forbids framing, sniffing and foreign plugins, bases and form targets on every page', () => {
    const headers = headersFor('/')
    const csp = get(headers, 'Content-Security-Policy')!
    for (const directive of ["frame-ancestors 'none'", "base-uri 'self'", "object-src 'none'", "form-action 'self'"]) assert.ok(csp.includes(directive), directive)
    // The enforced policy never restricts scripts, styles or media: the 3D scenes and GSAP stay intact.
    assert.ok(!/script-src|style-src|img-src|connect-src/.test(csp))
    assert.equal(get(headers, 'X-Frame-Options'), 'DENY')
    assert.equal(get(headers, 'X-Content-Type-Options'), 'nosniff')
    assert.equal(get(headers, 'Referrer-Policy'), 'strict-origin-when-cross-origin')
    assert.match(get(headers, 'Permissions-Policy')!, /camera=\(\)/)
  })

  it('observes the full content policy in report-only mode first', () => {
    const policy = get(headersFor('/'), 'Content-Security-Policy-Report-Only')!
    assert.match(policy, /default-src 'self'/)
    assert.ok(policy.includes("connect-src 'self' https://api.essqu.com https://project.supabase.co"))
    assert.match(policy, /frame-src 'none'/)
    assert.ok(!policy.includes('unsafe-eval'))
  })

  it('keeps sign-in and attendance pages free of referrers and caches', () => {
    for (const page of ['/login', '/reset-password', '/events/:slug/attendance', '/profile']) {
      const headers = headersFor(page)
      assert.equal(get(headers, 'Referrer-Policy'), 'no-referrer')
      assert.equal(get(headers, 'Cache-Control'), 'no-store')
      assert.equal(get(headers, 'X-Frame-Options'), 'DENY')
    }
  })
})
