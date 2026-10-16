import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ScrollReveals } from '@/components/motion/ScrollReveals'
import { EventsTimeline } from '@/components/pages/events/EventsTimeline'
import { FeaturedEvent } from '@/components/pages/events/FeaturedEvent'
import styles from '@/components/pages/events/Events.module.css'
import { PlatformHero, SampleNotice } from '@/components/platform/Platform'
import { DEMO_NOW, eventPhase, getCurrentMember, getEvents } from '@/lib/data'
import { getI18n } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.platform.eventsPage.metaTitle, description: t.platform.eventsPage.metaDescription }
}

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { t } = await getI18n()
  const c = t.platform.eventsPage
  const [{ state }, events, me] = await Promise.all([searchParams, getEvents(), getCurrentMember()])
  // Events the sample member already holds a place at, from their records.
  const held = me.attendance.filter((a) => a.status === 'registered').map((a) => a.event.slug)
  const upcoming = events.filter((e) => eventPhase(e) === 'upcoming')
  const featured = upcoming.find((e) => e.featured) ?? upcoming[0]
  const thisMonth = upcoming.filter((e) => e.start.slice(0, 7) === DEMO_NOW.slice(0, 7)).length
  const open = upcoming.filter((e) => e.registration === 'open' && e.registered < e.capacity).length

  return (
    <>
      <PlatformHero
        eyebrow={c.eyebrow}
        title={c.title}
        lead={<p>{c.lead}</p>}
        tone="surface"
        visual={featured ? <FeaturedEvent event={featured} held={held} /> : undefined}
      >
        <dl className={styles.heroStats}>
          <div>
            <dt>{c.stats.upcoming}</dt>
            <dd>{upcoming.length}</dd>
          </div>
          <div>
            <dt>{c.stats.thisMonth}</dt>
            <dd>{thisMonth}</dd>
          </div>
          <div>
            <dt>{c.stats.open}</dt>
            <dd>{open}</dd>
          </div>
        </dl>
        <SampleNotice />
      </PlatformHero>
      <Suspense fallback={null}>
        <EventsTimeline events={events} held={held} state={state} />
      </Suspense>
      <ScrollReveals />
    </>
  )
}
