import { getRegistrationBaseUrl } from '@/lib/core-api/events.server'
import { isEventId } from '@/lib/core-api/schemas'
export const dynamic = 'force-dynamic'
export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const base = getRegistrationBaseUrl()
  if (!base || !isEventId(eventId)) return new Response(null, { status: 404 })
  const version = new URL(request.url).searchParams.get('v')
  if (version && !/^[a-f0-9-]{36}\.(jpg|png)$/.test(version)) return new Response(null, { status: 400 })
  try {
    const response = await fetch(`${base}/events/${eventId}/image${version ? `?v=${encodeURIComponent(version)}` : ''}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
      redirect: 'error',
      credentials: 'omit',
    })
    if (!response.ok) return new Response(null, { status: response.status === 404 ? 404 : 503 })
    const type = response.headers.get('content-type')
    if (!['image/jpeg', 'image/png'].includes(type ?? '') || Number(response.headers.get('content-length')) > 3 * 1024 * 1024) {
      await response.body?.cancel()
      return new Response(null, { status: 502 })
    }
    const bytes = await response.arrayBuffer()
    if (bytes.byteLength > 3 * 1024 * 1024) return new Response(null, { status: 502 })
    // A versioned URL names one immutable object (a new cover gets a new name), so the CDN may
    // share it for five minutes instead of asking Core and Storage on every view. Short enough
    // that Core's visibility check still decides soon after an event is archived.
    const caching = version ? 'public, max-age=300, s-maxage=300' : 'public, max-age=60, must-revalidate'
    return new Response(bytes, {
      headers: { 'content-type': type!, 'cache-control': caching, 'x-content-type-options': 'nosniff' },
    })
  } catch {
    return new Response(null, { status: 503, headers: { 'cache-control': 'no-store' } })
  }
}
