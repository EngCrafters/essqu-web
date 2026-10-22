import { getCoreConfig } from '@/lib/core-api/config.server'
import { UUID } from '@/lib/core-api/projects'

export const dynamic = 'force-dynamic'
const headers = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
const fail = (status: number) => new Response(null, { status, headers })

/** Fixed-origin proxy. Core rechecks that each image belongs to the current public snapshot. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; media: string }> }) {
  const { id, media } = await params
  const config = getCoreConfig()
  if (config.mode !== 'core' || !UUID.test(id) || !UUID.test(media)) return fail(404)
  try {
    const response = await fetch(`${config.baseUrl}/projects/${id}/media/${media}`, {
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(config.timeoutMs),
    })
    if (!response.ok) return fail(response.status === 404 ? 404 : 503)
    const type = response.headers.get('content-type')
    if (type !== 'image/jpeg' && type !== 'image/png') return fail(502)
    const reader = response.body?.getReader()
    if (!reader) return fail(502)
    const chunks: Uint8Array[] = []
    let total = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        total += value.length
        if (total > 3 * 1024 * 1024) {
          await reader.cancel()
          return fail(502)
        }
        chunks.push(value)
      }
    } finally {
      reader.releaseLock()
    }
    return new Response(Buffer.concat(chunks), { headers: { ...headers, 'content-type': type } })
  } catch {
    return fail(503)
  }
}
