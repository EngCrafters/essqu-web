/** Shared URL validation only. Credentials live exclusively in server.ts. */
export function apiBase(value: string | undefined): string {
  if (!value) throw new Error('Core API URL is not configured')
  const url = new URL(value)
  if (
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname.replace(/\/$/, '') !== '/v1'
  )
    throw new Error('Invalid Core API URL')
  return url.href.replace(/\/$/, '')
}
