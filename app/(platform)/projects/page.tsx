import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ScrollReveals } from '@/components/motion/ScrollReveals'
import { ProjectsLab } from '@/components/pages/projects/ProjectsLab'
import { getProjects } from '@/lib/data'
import { getI18n } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.platform.projectsPage.metaTitle, description: t.platform.projectsPage.metaDescription }
}

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
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
