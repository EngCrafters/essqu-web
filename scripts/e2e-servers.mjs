// Synthetic local transport fixture only. Never imports a real credential or database.
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
const id = '11111111-1111-4111-8111-111111111111'
const event = {
  id,
  title: 'Local contract workshop',
  description: 'Synthetic local browser fixture',
  eventDate: '2027-01-01T12:00:00Z',
  location: 'Muscat',
  committeeName: 'Technical',
  availability: 'open',
}
const server = createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:4300')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Request-Id')
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }
  if (req.method === 'POST') {
    let text = ''
    for await (const chunk of req) text += chunk
    const body = JSON.parse(text)
    if (req.headers.authorization || req.headers.cookie || 'ipAddress' in body) {
      res.writeHead(400)
      res.end('{}')
      return
    }
    const duplicate = body.attendeeEmail === 'duplicate@example.test'
    if (body.attendeeEmail === 'full@example.test' && body.intent === 'register') {
      res.writeHead(409)
      res.end(JSON.stringify({ code: 'conflict', reason: 'event-full' }))
      return
    }
    res.writeHead(duplicate ? 409 : 201)
    res.end(
      JSON.stringify(
        duplicate
          ? { code: 'conflict', reason: 'already-registered' }
          : { data: { status: body.intent === 'join_waitlist' ? 'waitlisted' : 'confirmed' } },
      ),
    )
    return
  }
  if (req.headers.authorization !== 'Bearer local-e2e-secret-not-production') {
    res.writeHead(401)
    res.end('{}')
    return
  }
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname === '/v1/events') {
    if (url.searchParams.get('cursor') === 'unavailable') {
      res.writeHead(503)
      res.end('{}')
      return
    }
    res.end(
      JSON.stringify({
        data: url.searchParams.get('period') === 'past' ? [] : [event],
        meta: { nextCursor: url.searchParams.has('cursor') ? null : 'second-page' },
      }),
    )
    return
  }
  if (url.pathname === `/v1/events/${id}`) {
    res.end(JSON.stringify({ data: event }))
    return
  }
  res.writeHead(404)
  res.end('{}')
})
server.listen(4301, '127.0.0.1')
const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '4300'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      CORE_API_BASE_URL: 'http://127.0.0.1:4301/v1',
      CORE_EVENTS_API_KEY: 'local-e2e-secret-not-production',
      NEXT_PUBLIC_CORE_API_BASE_URL: 'http://127.0.0.1:4301/v1',
    },
  },
)
const stop = () => {
  child.kill()
  server.close()
  process.exit()
}
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
child.on('exit', () => server.close())
