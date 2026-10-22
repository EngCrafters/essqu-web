import path from 'node:path'
import type { NextConfig } from 'next'
import { siteHeaders } from './lib/security-headers'

const nextConfig: NextConfig = {
  distDir: process.env.ESSQU_EVENT_FLOW === 'true' ? '.next-event-flow' : '.next',
  reactStrictMode: true,
  images: {
    localPatterns: [{ pathname: '/**', search: '' }, { pathname: '/media/events/*' }],
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 90],
  },
  // Next.js blocks dev-only assets for origins other than localhost. Without this, a phone that
  // opens the dev server at the computer's network address (e.g. http://192.168.8.158:3000)
  // receives the HTML but never hydrates: no menu, no animations, no 3D. Private network
  // ranges only, and development only; production builds are unaffected.
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.*.*.*', '*.local'],
  // A stray lockfile in the home directory would otherwise be mistaken for the workspace root.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Security headers on every page; sign-in pages also send no referrer and are never cached.
  async headers() {
    return siteHeaders(process.env)
  },
}

export default nextConfig
