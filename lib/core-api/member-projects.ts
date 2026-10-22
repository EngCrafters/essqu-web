import { memberCall, type MemberResult } from './member-events'
import { isProjectContent, UUID, type ProjectContent } from './projects'
import { memberAuthClient, type MemberAuthSettings } from '@/lib/member-auth/client'
import { fetchOwnMembership } from '@/lib/member-auth/membership'

export type ProjectStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'changes_requested'
export type ProjectRecord = {
  id: string
  content: ProjectContent
  revision: number
  status: ProjectStatus
  publishedRevision: number | null
  authorName: string
  isAuthor: boolean
  updatedAt: string
  media: { id: string }[]
  publishedMediaIds: string[]
  history: { id: string; revision: number; action: string; feedback: string | null; occurredAt: string }[]
  historyTotal?: number
}
export type ProjectList = { code: 'SUCCESS'; projects: ProjectRecord[]; total: number }
export type ProjectWrite = { code: 'SUCCESS'; id: string; revision: number }
const statuses: string[] = ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'changes_requested']
const date = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v))
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const uuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v)
const positive = (v: unknown): v is number => Number.isInteger(v) && Number(v) > 0

/** Validate the member response before rendering private content or advancing a revision. */
export function isProjectRecord(v: unknown): v is ProjectRecord {
  return (
    object(v) &&
    uuid(v.id) &&
    isProjectContent(v.content) &&
    positive(v.revision) &&
    typeof v.status === 'string' &&
    statuses.includes(v.status) &&
    (v.publishedRevision === null || (positive(v.publishedRevision) && v.publishedRevision <= Number(v.revision))) &&
    typeof v.authorName === 'string' &&
    typeof v.isAuthor === 'boolean' &&
    date(v.updatedAt) &&
    Array.isArray(v.media) &&
    v.media.length <= 12 &&
    v.media.every((m) => object(m) && uuid(m.id)) &&
    Array.isArray(v.publishedMediaIds) &&
    v.publishedMediaIds.length <= 6 &&
    v.publishedMediaIds.every(uuid) &&
    Array.isArray(v.history) &&
    v.history.length <= 100 &&
    v.history.every(
      (h) =>
        object(h) &&
        uuid(h.id) &&
        positive(h.revision) &&
        typeof h.action === 'string' &&
        (h.feedback === null || typeof h.feedback === 'string') &&
        date(h.occurredAt),
    ) &&
    (v.historyTotal === undefined || (Number.isInteger(v.historyTotal) && Number(v.historyTotal) >= v.history.length))
  )
}
export function isProjectList(v: unknown): v is ProjectList {
  return (
    object(v) &&
    v.code === 'SUCCESS' &&
    Array.isArray(v.projects) &&
    v.projects.length <= 30 &&
    v.projects.every(isProjectRecord) &&
    Number.isInteger(v.total) &&
    Number(v.total) >= v.projects.length
  )
}
export function canEditProject(record: Pick<ProjectRecord, 'status' | 'revision' | 'publishedRevision' | 'isAuthor'>): boolean {
  return (
    record.isAuthor &&
    (['draft', 'rejected', 'changes_requested'].includes(record.status) || (record.status === 'approved' && record.publishedRevision === record.revision))
  )
}
export function emptyProject(): ProjectContent {
  const text = () => ({ en: '', ar: '' })
  return {
    title: text(),
    summary: text(),
    discipline: 'mechanical',
    alsoDisciplines: [],
    year: new Date().getFullYear(),
    type: 'capstone',
    stage: 'idea',
    technologies: [],
    problem: text(),
    solution: text(),
    technicalApproach: { overview: text(), decisions: [] },
    development: [],
    validation: [],
    nextSteps: text(),
    collaboration: { seeking: text(), application: text() },
    parts: [],
    achievements: [],
    team: [],
    links: [],
    mediaIds: [],
  }
}
/** Either language completes a field; translations can be added alongside it. */
export function projectReady(content: ProjectContent): boolean {
  return (
    isProjectContent(content) &&
    [content.title, content.summary, content.problem, content.solution, content.technicalApproach.overview].every(
      (t) => t.en.trim().length > 0 || t.ar.trim().length > 0,
    )
  )
}

export async function fetchMemberProjects(settings: MemberAuthSettings, base: string, id?: string, offset = 0): Promise<MemberResult<ProjectList>> {
  const path = id ? `/me/projects/${id}` : `/me/projects?offset=${offset}`
  let result = await memberCall<unknown>(settings, base, path)
  if (!result.ok && result.status === 403 && result.code === 'MEMBER_REQUIRED') {
    // Finish only Core's existing approved-membership activation path, as the event flow does.
    try {
      const { data, error } = await memberAuthClient(settings).auth.getSession()
      if (error || !data.session) return { ok: false, status: 401, code: 'SIGNED_OUT' }
      const membership = await fetchOwnMembership(base, data.session.access_token)
      if (membership.kind === 'signed-out') return { ok: false, status: 401, code: 'SIGNED_OUT' }
      if (membership.kind === 'unavailable') return { ok: false, status: 503, code: 'UNAVAILABLE' }
      if (membership.kind === 'member') result = await memberCall<unknown>(settings, base, path)
    } catch {
      return { ok: false, status: 503, code: 'UNAVAILABLE' }
    }
  }
  return result.ok ? (isProjectList(result.data) ? { ok: true, data: result.data } : { ok: false, status: 503, code: 'UNAVAILABLE' }) : result
}

export async function writeMemberProject(
  settings: MemberAuthSettings,
  base: string,
  id: string | null,
  revision: number,
  content: ProjectContent,
  submit = false,
): Promise<MemberResult<ProjectWrite>> {
  const result = await memberCall<unknown>(
    settings,
    base,
    id ? `/me/projects/${id}` : '/me/projects',
    id ? 'PATCH' : 'POST',
    submit ? { operation: 'submit', revision } : id ? { operation: 'save', revision, content } : { operation: 'create', content },
  )
  if (!result.ok) return result
  const data = result.data
  return object(data) && data.code === 'SUCCESS' && uuid(data.id) && positive(data.revision)
    ? { ok: true, data: data as ProjectWrite }
    : { ok: false, status: 503, code: 'UNAVAILABLE' }
}

/** Raw, authenticated bytes; neither the token nor private object key is put in an image URL. */
export async function projectImageRequest(
  settings: MemberAuthSettings,
  base: string,
  project: string,
  media?: string,
  file?: File,
  signal?: AbortSignal,
): Promise<MemberResult<{ id: string } | Blob>> {
  try {
    const { data, error } = await memberAuthClient(settings).auth.getSession()
    if (error || !data.session) return { ok: false, code: 'SIGNED_OUT', status: 401 }
    const path = file ? `/me/projects/${project}/media` : `/projects/${project}/media/${media}`
    const response = await fetch(`${base}${path}`, {
      method: file ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${data.session.access_token}`, ...(file ? { 'Content-Type': file.type } : {}) },
      ...(file ? { body: file } : {}),
      credentials: 'omit',
      mode: 'cors',
      cache: 'no-store',
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000),
    })
    if (response.ok && !file && ['image/jpeg', 'image/png'].includes(response.headers.get('content-type') ?? '')) {
      const blob = await response.blob()
      if (blob.size <= 3 * 1024 * 1024) return { ok: true, data: blob }
    }
    const json = await response.json().catch(() => null)
    if (response.ok && json?.data?.code === 'SUCCESS' && uuid(json.data.id)) return { ok: true, data: { id: json.data.id } }
    return { ok: false, status: response.status, code: json?.errors?.[0]?.code ?? 'UNAVAILABLE' }
  } catch {
    return { ok: false, status: 503, code: 'UNAVAILABLE' }
  }
}
