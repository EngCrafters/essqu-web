import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ScrollReveals } from '@/components/motion/ScrollReveals'
import { ProjectsLab } from '@/components/pages/projects/ProjectsLab'
import { getProjects } from '@/lib/data'
import { ComingSoon } from '@/components/platform/ComingSoon'
import { isComingSoon } from '@/content/site'
import { getI18n } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  if (isComingSoon('projects')) return { title: t.platform.comingSoon.metaTitle(t.platform.comingSoon.modules.projects.name), description: t.platform.comingSoon.modules.projects.note }
  return { title: t.platform.projectsPage.metaTitle, description: t.platform.projectsPage.metaDescription }
}

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  // Not open yet: the Coming Soon page stands in, and the full page below stays ready.
  if (isComingSoon('projects')) return <ComingSoon module="projects" />
  const [{ state }, projects] = await Promise.all([searchParams, getProjects()])
  return (
    <>
      <Suspense fallback={null}>
        <ProjectsLab projects={projects} state={state} />
      </Suspense>
      <ScrollReveals />
    </>
  )
}
