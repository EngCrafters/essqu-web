import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ScrollReveals } from '@/components/motion/ScrollReveals'
import { ProjectsLab } from '@/components/pages/projects/ProjectsLab'
import { ComingSoon } from '@/components/platform/ComingSoon'
import { getPublishedProjects } from '@/lib/core-api/projects.server'
import { isComingSoon } from '@/content/site'
import { getI18n } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  if (isComingSoon('projects'))
    return { title: t.platform.comingSoon.metaTitle(t.platform.comingSoon.modules.projects.name), description: t.platform.comingSoon.modules.projects.note }
  return { title: t.platform.projectsPage.metaTitle, description: t.platform.projectsPage.metaDescription }
}

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  if (isComingSoon('projects')) return <ComingSoon module="projects" />
  const [{ state }, projects] = await Promise.all([searchParams, getPublishedProjects()])
  return (
    <>
      <Suspense fallback={null}>
        <ProjectsLab projects={projects ?? []} state={projects === null ? 'error' : state} />
      </Suspense>
      <ScrollReveals />
    </>
  )
}
