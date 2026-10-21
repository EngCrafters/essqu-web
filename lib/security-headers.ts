type Env = Record<string, string | undefined>
export type HeaderRule = { source: string; headers: { key: string; value: string }[] }

const originOf = (value: string | undefined) => {
  try {
    return value ? new URL(value).origin : null
  } catch {
    return null
  }
}

/**
 * Response headers for every page, used by next.config.ts.
 *
 * Enforced: only directives that cannot touch scripts, styles, media or the 3D scenes (no
 * framing, no plugins, no foreign base or form targets). The full content policy is sent
 * report-only, so any violation shows in the browser console before it is ever enforced.
 *
 * Sign-in and attendance pages receive Supabase Auth links and check-in codes, and the member's
 * own profile shows their private details: they send no referrer and are never cached. Their
 * rules come after the site-wide rule, so their values win.
 */
export function siteHeaders(env: Env): HeaderRule[] {
  const contentPolicy = [
    "default-src 'self'",
    // Next.js inlines its bootstrap scripts; development also evaluates code for Fast Refresh.
    `script-src 'self' 'unsafe-inline'${env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    ['connect-src', "'self'", originOf(env.CORE_API_BASE_URL), originOf(env.SUPABASE_URL)].filter(Boolean).join(' '),
    "worker-src 'self' blob:",
    "media-src 'self'",
    "frame-src 'none'",
    "manifest-src 'self'",
  ].join('; ')
  const site = [
    { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
    { key: 'Content-Security-Policy-Report-Only', value: contentPolicy },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  ]
  const private_ = [
    { key: 'Referrer-Policy', value: 'no-referrer' },
    { key: 'Cache-Control', value: 'no-store' },
  ]
  return [
    { source: '/:path*', headers: site },
    ...['/login', '/forgot-password', '/reset-password', '/events/:slug/attendance', '/projects/submit', '/profile'].map((source) => ({ source, headers: private_ })),
  ]
}
