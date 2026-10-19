import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ScrollReveals } from '@/components/motion/ScrollReveals'
import { ArchiveCabinet } from '@/components/pages/activities/ArchiveCabinet'
import { ArchiveExplorer } from '@/components/pages/activities/ArchiveExplorer'
import { PlatformHero } from '@/components/platform/Platform'
import { ACTIVITIES, leadPhoto } from '@/content/activities'
import { getArchive } from '@/lib/data'
import { getI18n } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.platform.activitiesPage.metaTitle, description: t.platform.activitiesPage.metaDescription }
}

export default async function ActivitiesPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { t } = await getI18n()
  const c = t.platform.activitiesPage
  const [{ state }, entries] = await Promise.all([searchParams, getArchive()])
  const activities = ACTIVITIES.map((a) => ({ id: a.id, nameEn: a.nameEn, nameAr: a.nameAr }))
  const drawers = ACTIVITIES.map((a) => ({
    ...activities.find((x) => x.id === a.id)!,
    count: entries.filter((e) => e.activity === a.id).length,
    photo: leadPhoto(a)?.src ?? '/images/activities/gathering.jpg',
  }))

  return (
    <>
      <Suspense fallback={null}>
        <PlatformHero eyebrow={c.eyebrow} title={c.title} lead={<p>{c.lead}</p>} visual={<ArchiveCabinet drawers={drawers} />} tone="surface" />
        <ArchiveExplorer entries={entries} activities={activities} state={state} />
      </Suspense>
      <ScrollReveals />
    </>
  )
}
