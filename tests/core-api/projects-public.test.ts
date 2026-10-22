import assert from 'node:assert/strict'
import { after, afterEach, describe, it } from 'node:test'
import { COMING_SOON, isComingSoon, upcomingAt } from '@/content/site'
import { parsePublishedProjects } from '@/lib/core-api/projects-public'
import { isProjectContent, type ProjectContent } from '@/lib/core-api/projects'

const ID = '11111111-1111-4111-8111-111111111111'
const MEDIA = '22222222-2222-4222-8222-222222222222'
const text = (en = 'Synthetic project', ar = '') => ({ en, ar })
const content: ProjectContent = {
  title: text(),
  summary: text('Synthetic summary'),
  discipline: 'electrical',
  alsoDisciplines: [],
  year: 2026,
  type: 'research',
  stage: 'testing',
  technologies: ['sensors'],
  problem: text('Problem'),
  solution: text('Solution'),
  technicalApproach: { overview: text('Overview'), decisions: [text('Decision')] },
  development: [text('Built')],
  validation: [{ measure: text('Voltage'), result: text('3.3 V') }],
  nextSteps: text('Next test'),
  collaboration: { seeking: text('Review'), application: text('Learning') },
  parts: [{ name: text('Board'), qty: 1 }],
  achievements: [],
  team: [{ name: text('Synthetic member'), role: text('Design') }],
  links: [{ label: text('Documentation'), href: 'https://example.org/project' }],
  mediaIds: [MEDIA],
}
const response = (rows: unknown[], total = rows.length, hasMore = false) => ({ data: { code: 'SUCCESS', projects: rows, total, hasMore } })
const record = (overrides: Record<string, unknown> = {}) => ({ id: ID, revision: 2, content: structuredClone(content), ...overrides })

describe('public project presentation contract', () => {
  it('maps only published DTOs with authentic credits, links and private-proxy image addresses', () => {
    assert.ok(isProjectContent(content))
    const [project] = parsePublishedProjects(response([record()]))!
    assert.equal(project!.sample, false)
    assert.equal(project!.model, undefined)
    assert.deepEqual(project!.contributors, [])
    assert.equal(project!.teamCredits![0]!.name.en, 'Synthetic member')
    assert.equal(project!.links![0]!.href, 'https://example.org/project')
    assert.equal(project!.media[0]!.src, `/media/projects/${ID}/${MEDIA}`)
    assert.deepEqual(project!.achievements, [])
    assert.equal('mediaIds' in project!, false)
  })

  it('uses English when optional Arabic copy is blank, including nested credits and results', () => {
    const [project] = parsePublishedProjects(response([record()]))!
    assert.equal(project!.title.ar, content.title.en)
    assert.equal(project!.technicalApproach.decisions[0]!.ar, 'Decision')
    assert.equal(project!.validation[0]!.result.ar, '3.3 V')
    assert.equal(project!.teamCredits![0]!.role.ar, 'Design')
    assert.equal(project!.links![0]!.label.ar, 'Documentation')
    assert.equal(content.title.ar, '', 'presentation does not mutate the submitted snapshot')
  })

  it('preserves provided Arabic and supports genuinely empty media and optional content', () => {
    const c = structuredClone(content)
    c.title.ar = 'مشروع تجريبي'
    c.mediaIds = []
    const [project] = parsePublishedProjects(response([record({ content: c })]))!
    assert.equal(project!.title.ar, 'مشروع تجريبي')
    assert.deepEqual(project!.media, [])
    assert.deepEqual(parsePublishedProjects(response([])), [])
  })

  it('accepts Arabic-only copy and uses it for the English presentation without rewriting content', () => {
    const c = structuredClone(content)
    c.title = { en: '', ar: 'مشروع تجريبي' }
    c.team[0]!.name = { en: '', ar: 'عضو تجريبي' }
    const [project] = parsePublishedProjects(response([record({ content: c })]))!
    assert.equal(project!.title.en, c.title.ar)
    assert.equal(project!.teamCredits![0]!.name.en, 'عضو تجريبي')
    assert.equal(c.title.en, '')
  })

  it('refuses private workflow records, duplicate ids, invalid UUIDs and incomplete contracts', () => {
    for (const body of [
      response([record({ status: 'draft', memberId: ID })]),
      response([record({ id: 'sample-project' })]),
      response([record({ revision: null })]),
      response([record(), record()]),
      { data: { projects: [record()] } },
      { data: { code: 'MEMBER_REQUIRED', projects: [] } },
    ])
      assert.equal(parsePublishedProjects(body), null)
  })

  it('fails closed on malicious links or unexpected private fields inside project content', () => {
    for (const extra of [
      { links: [{ label: text(), href: 'javascript:alert(1)' }] },
      { links: [{ label: text(), href: 'https://user:secret@example.org' }] },
      { storageKey: 'private/secret.png' },
      { mediaIds: [MEDIA, MEDIA] },
    ])
      assert.equal(parsePublishedProjects(response([record({ content: { ...content, ...extra } })])), null)
  })
})

describe('developer-controlled page visibility', () => {
  it('activates Projects and registration, retaining the selected unfinished pages', () => {
    assert.equal(isComingSoon('projects'), false)
    assert.equal(isComingSoon('register'), false)
    assert.deepEqual(COMING_SOON, ['members', 'network', 'certificates'])
    for (const page of COMING_SOON) assert.equal(upcomingAt(`/${page}`), page)
    assert.equal(upcomingAt('/projects'), undefined)
    assert.equal(upcomingAt('/events'), undefined)
  })
})

process.env.CORE_API_BASE_URL = 'https://api.example.org/v1'
process.env.CORE_EVENTS_API_KEY = 'synthetic-project-test-key'
const { getPublishedProjects, getPublishedProject } = await import('@/lib/core-api/projects.server')
const { GET: getProjectImage } = await import('@/app/media/projects/[id]/[media]/route')
const realFetch = globalThis.fetch
after(() => {
  globalThis.fetch = realFetch
})
afterEach(() => {
  globalThis.fetch = realFetch
})

describe('published project server reads', () => {
  it('makes an uncached server request without member credentials or event keys', async () => {
    let call: RequestInit | undefined
    globalThis.fetch = async (url, init) => {
      assert.equal(url, 'https://api.example.org/v1/projects?offset=0')
      call = init
      return Response.json(response([record()]))
    }
    assert.equal((await getPublishedProjects())![0]!.slug, ID)
    assert.equal(call!.cache, 'no-store')
    assert.equal(call!.redirect, 'error')
    assert.equal(call!.headers, undefined)
  })

  it('distinguishes valid empty content from a failed or malformed upstream', async () => {
    globalThis.fetch = async () => Response.json(response([]))
    assert.deepEqual(await getPublishedProjects(), [])
    globalThis.fetch = async () => new Response(null, { status: 503 })
    assert.equal(await getPublishedProjects(), null)
    globalThis.fetch = async () => Response.json({ data: [] })
    assert.equal(await getPublishedProjects(), null)
    globalThis.fetch = async () => {
      throw new Error('Offline')
    }
    assert.equal(await getPublishedProjects(), null)
  })

  it('follows bounded card pages to completion, including archives beyond 500 records', async () => {
    const rows = Array.from({ length: 501 }, (_, index) => record({ id: `11111111-1111-4111-8111-${index.toString(16).padStart(12, '0')}` }))
    const offsets: number[] = []
    globalThis.fetch = async (url) => {
      const offset = Number(new URL(String(url)).searchParams.get('offset'))
      offsets.push(offset)
      return Response.json(response(rows.slice(offset, offset + 30), rows.length, offset + 30 < rows.length))
    }
    assert.equal((await getPublishedProjects())!.length, 501)
    assert.deepEqual(
      offsets,
      Array.from({ length: 17 }, (_, index) => index * 30),
    )
  })

  it('rejects incomplete pagination and mid-read failures instead of publishing a partial catalogue', async () => {
    globalThis.fetch = async () => Response.json(response([record()], 31, true))
    assert.equal(await getPublishedProjects(), null)
    const rows = Array.from({ length: 30 }, (_, index) => record({ id: `11111111-1111-4111-8111-${index.toString(16).padStart(12, '0')}` }))
    globalThis.fetch = async (url) => (String(url).endsWith('offset=0') ? Response.json(response(rows, 31, true)) : new Response(null, { status: 503 }))
    assert.equal(await getPublishedProjects(), null)
    globalThis.fetch = async (url) => Response.json(String(url).endsWith('offset=0') ? response(rows, 31, true) : response([rows[0]], 31, false))
    assert.equal(await getPublishedProjects(), null)
  })

  it('reads full stories from the detail endpoint and verifies the requested identity', async () => {
    globalThis.fetch = async (url) => {
      assert.equal(url, `https://api.example.org/v1/projects/${ID}`)
      return Response.json(response([record()]))
    }
    const result = await getPublishedProject(ID)
    assert.equal(result.status, 'ok')
    if (result.status === 'ok') assert.equal(result.project.technicalApproach.overview.en, 'Overview')
    globalThis.fetch = async () => Response.json(response([record({ id: MEDIA })]))
    assert.equal((await getPublishedProject(ID)).status, 'unavailable')
    globalThis.fetch = async () => new Response(null, { status: 404 })
    assert.equal((await getPublishedProject(ID)).status, 'not-found')
    globalThis.fetch = async () => {
      throw new Error('Unexpected request')
    }
    assert.equal((await getPublishedProject('sample-project')).status, 'not-found')
  })
})

describe('public project image boundary', () => {
  const request = new Request('https://essqu.example/media/projects/image', { headers: { cookie: 'private=synthetic', authorization: 'Bearer synthetic' } })
  const params = { params: Promise.resolve({ id: ID, media: MEDIA }) }

  it('uses a fixed Core origin and forwards only bounded image bytes with no cache', async () => {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, `https://api.example.org/v1/projects/${ID}/media/${MEDIA}`)
      assert.equal(init!.headers, undefined)
      assert.equal(init!.redirect, 'error')
      assert.equal(init!.cache, 'no-store')
      return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } })
    }
    const result = await getProjectImage(request, params)
    assert.equal(result.status, 200)
    assert.equal(result.headers.get('cache-control'), 'no-store')
    assert.equal(result.headers.get('x-content-type-options'), 'nosniff')
    assert.deepEqual(new Uint8Array(await result.arrayBuffer()), new Uint8Array([1, 2, 3]))
  })

  it('denies arbitrary paths without a network call and does not cache removed photos', async () => {
    globalThis.fetch = async () => {
      throw new Error('Unexpected network request')
    }
    assert.equal((await getProjectImage(request, { params: Promise.resolve({ id: '../private', media: MEDIA }) })).status, 404)
    globalThis.fetch = async () => new Response(null, { status: 404 })
    const result = await getProjectImage(request, params)
    assert.equal(result.status, 404)
    assert.equal(result.headers.get('cache-control'), 'no-store')
  })

  it('rejects HTML, oversized files and unavailable upstreams', async () => {
    globalThis.fetch = async () => new Response('<script>synthetic</script>', { headers: { 'content-type': 'text/html' } })
    assert.equal((await getProjectImage(request, params)).status, 502)
    globalThis.fetch = async () => new Response(new Uint8Array(3 * 1024 * 1024 + 1), { headers: { 'content-type': 'image/jpeg' } })
    assert.equal((await getProjectImage(request, params)).status, 502)
    globalThis.fetch = async () => new Response(null, { status: 403 })
    assert.equal((await getProjectImage(request, params)).status, 503)
  })
})
