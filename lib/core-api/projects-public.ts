import type { Project } from '@/content/platform/projects'
import { isProjectContent, UUID, type ProjectContent } from './projects'

/** Optional translations use the submitted language throughout the presentation. */
function withLanguageFallback<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withLanguageFallback) as T
  if (value && typeof value === 'object') {
    const copy = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, withLanguageFallback(child)]))
    if (typeof copy.en === 'string' && typeof copy.ar === 'string') {
      if (!copy.ar.trim()) copy.ar = copy.en
      if (!copy.en.trim()) copy.en = copy.ar
    }
    return copy as T
  }
  return value
}

function toProject(id: string, content: ProjectContent): Project {
  const { team, links, mediaIds, ...details } = withLanguageFallback(content)
  return {
    ...details,
    slug: id,
    sample: false,
    contributors: [],
    teamCredits: team,
    links,
    // Decorative sheet used only when no photograph is supplied; no invented project model.
    drawing: 'truss',
    media: mediaIds.map((media) => ({ kind: 'photo', src: `/media/projects/${id}/${media}`, caption: details.title, alt: details.title })),
  }
}

/** Fail the whole response closed if any record violates the public snapshot contract. */
export function parsePublishedProjects(value: unknown): Project[] | null {
  if (!value || typeof value !== 'object' || !('data' in value)) return null
  const data = value.data
  if (
    !data ||
    typeof data !== 'object' ||
    !('code' in data) ||
    data.code !== 'SUCCESS' ||
    !('projects' in data) ||
    !Array.isArray(data.projects) ||
    data.projects.length > 30
  )
    return null
  const seen = new Set<string>()
  const projects: Project[] = []
  for (const record of data.projects) {
    if (
      !record ||
      typeof record !== 'object' ||
      Object.keys(record).some((key) => !['id', 'content', 'revision'].includes(key)) ||
      typeof record.id !== 'string' ||
      !UUID.test(record.id) ||
      !Number.isInteger(record.revision) ||
      record.revision < 1 ||
      !isProjectContent(record.content)
    )
      return null
    const id = record.id.toLowerCase()
    if (seen.has(id)) return null
    seen.add(id)
    projects.push(toProject(id, record.content))
  }
  return projects
}

export function parsePublishedProjectPage(value: unknown): { projects: Project[]; total: number; hasMore: boolean } | null {
  const projects = parsePublishedProjects(value)
  if (!projects || !value || typeof value !== 'object' || !('data' in value)) return null
  const data = value.data
  if (
    !data ||
    typeof data !== 'object' ||
    !('total' in data) ||
    !Number.isSafeInteger(data.total) ||
    Number(data.total) < 0 ||
    !('hasMore' in data) ||
    typeof data.hasMore !== 'boolean'
  )
    return null
  return { projects, total: Number(data.total), hasMore: data.hasMore }
}
