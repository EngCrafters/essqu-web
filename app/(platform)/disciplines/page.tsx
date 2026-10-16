import type { Metadata } from 'next'
import Link from 'next/link'
import { ScrollReveals } from '@/components/motion/ScrollReveals'
import { DisciplineLinks, type DisciplineLink } from '@/components/pages/disciplines/DisciplineLinks'
import { DisciplinesExhibit, type DisciplineCounts } from '@/components/pages/disciplines/DisciplinesExhibit'
import { FloorPlan } from '@/components/pages/disciplines/FloorPlan'
import styles from '@/components/pages/disciplines/Disciplines.module.css'
import { CtaBand, PlatformHero, SampleNotice } from '@/components/platform/Platform'
import { IconArrowRight } from '@/components/ui/icons'
import { DISCIPLINES, type DisciplineId } from '@/content/disciplines'
import { eventPhase, getEvents, getMembers, getProjects } from '@/lib/data'
import { getI18n } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.platform.disciplinesPage.metaTitle, description: t.platform.disciplinesPage.metaDescription }
}

export default async function DisciplinesPage() {
  const { t } = await getI18n()
  const c = t.platform.disciplinesPage
  const [projects, events, members] = await Promise.all([getProjects(), getEvents(), getMembers()])

  const involves = (ds: DisciplineId[], d: DisciplineId) => ds.includes(d)
  const counts = Object.fromEntries(
    DISCIPLINES.map((d) => [
      d.id,
      {
        projects: projects.filter((p) => involves([p.discipline, ...(p.alsoDisciplines ?? [])], d.id)).length,
        events: events.filter((e) => eventPhase(e) === 'upcoming' && involves(e.disciplines, d.id)).length,
        members: members.filter((m) => m.discipline === d.id).length,
      },
    ]),
  ) as Record<DisciplineId, DisciplineCounts>

  // Every pair of disciplines that shares a sample project, with the projects behind it.
  const order = DISCIPLINES.map((d) => d.id)
  const pairs = new Map<string, DisciplineLink>()
  for (const p of projects) {
    const ds = [...new Set([p.discipline, ...(p.alsoDisciplines ?? [])])].sort((a, b) => order.indexOf(a) - order.indexOf(b))
    for (let i = 0; i < ds.length; i++)
      for (let j = i + 1; j < ds.length; j++) {
        const key = `${ds[i]}-${ds[j]}`
        const link = pairs.get(key) ?? { a: ds[i]!, b: ds[j]!, projects: [] }
        link.projects.push({ slug: p.slug, title: p.title })
        pairs.set(key, link)
      }
  }

  return (
    <>
      <PlatformHero eyebrow={c.eyebrow} title={c.title} lead={<p>{c.lead}</p>} visual={<FloorPlan />} tone="blueprint">
        <p className={styles.listNote}>{c.listNote}</p>
      </PlatformHero>
      <DisciplinesExhibit counts={counts} />
      <DisciplineLinks links={[...pairs.values()]} />
      <div className="container" style={{ paddingBottom: 'var(--space-9)' }}>
        <SampleNotice />
      </div>
      <CtaBand title={c.closingTitle} body={c.closingBody}>
        <Link href="/register" className="btn btn--on-dark">
          {c.closingJoin}
          <IconArrowRight className="btn__arrow" />
        </Link>
        <Link href="/members" className="btn btn--outline-dark">
          {c.closingMembers}
        </Link>
      </CtaBand>
      <ScrollReveals />
    </>
  )
}
