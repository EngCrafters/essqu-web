import 'server-only'
import { cache } from 'react'
import type { Project } from '@/content/platform/projects'
import { getCoreConfig } from './config.server'
import { UUID } from './projects'
import { parsePublishedProjects, parsePublishedProjectPage } from './projects-public'

const PAGE_SIZE = 30
// Return unavailable if an unexpectedly large archive cannot be read safely; never a partial list.
const MAX_PAGES = 100

function read(url: string, timeout: number) {
  return fetch(url, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(timeout) })
}

/** Only Core's published snapshots. `null` means unavailable; an empty list is valid content. */
export const getPublishedProjects = cache(async (): Promise<Project[] | null> => {
  const config = getCoreConfig()
  if (config.mode !== 'core') return null
  try {
    const projects: Project[] = []
    const seen = new Set<string>()
    let total: number | undefined
    for (let pageNumber = 0; pageNumber < MAX_PAGES; pageNumber++) {
      const offset = pageNumber * PAGE_SIZE
      const response = await read(`${config.baseUrl}/projects?offset=${offset}`, config.timeoutMs)
      if (!response.ok) return null
      const page = parsePublishedProjectPage(await response.json())
      if (!page || (total !== undefined && total !== page.total)) return null
      total = page.total
      const loaded = offset + page.projects.length
      const moreExpected = loaded < page.total
      if (page.projects.length > PAGE_SIZE || page.total < loaded || page.hasMore !== moreExpected) return null
      for (const project of page.projects) {
        if (seen.has(project.slug)) return null
        seen.add(project.slug)
        projects.push(project)
      }
      if (!page.hasMore) return projects
      if (page.projects.length !== PAGE_SIZE) return null
    }
    return null
  } catch {
    return null
  }
})

export type PublishedProjectResult = { status: 'ok'; project: Project } | { status: 'not-found' } | { status: 'unavailable' }

/** Full public story; catalogue pages deliberately contain only card fields. */
export const getPublishedProject = cache(async (id: string): Promise<PublishedProjectResult> => {
  if (!UUID.test(id)) return { status: 'not-found' }
  const config = getCoreConfig()
  if (config.mode !== 'core') return { status: 'unavailable' }
  try {
    const response = await read(`${config.baseUrl}/projects/${id}`, config.timeoutMs)
    if (response.status === 404) return { status: 'not-found' }
    if (!response.ok) return { status: 'unavailable' }
    const projects = parsePublishedProjects(await response.json())
    if (!projects || projects.length !== 1 || projects[0]!.slug !== id.toLowerCase()) return { status: 'unavailable' }
    return { status: 'ok', project: projects[0]! }
  } catch {
    return { status: 'unavailable' }
  }
})
