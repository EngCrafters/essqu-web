import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ScrollReveals } from '@/components/motion/ScrollReveals'
import { EventsTimeline } from '@/components/pages/events/EventsTimeline'
import { FeaturedEvent } from '@/components/pages/events/FeaturedEvent'
import styles from '@/components/pages/events/Events.module.css'
import { PlatformHero, SampleNotice } from '@/components/platform/Platform'
import { isPast } from '@/components/platform/registration'
import { getCurrentMember, getEventsTimeline } from '@/lib/data'
import { omanMonthKey } from '@/lib/format'
import { getI18n } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.platform.eventsPage.metaTitle, description: t.platform.eventsPage.metaDescription }
}

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { t } = await getI18n()
  const c = t.platform.eventsPage
  const [{ state }, listing] = await Promise.all([searchParams, getEventsTimeline()])
  const ok = listing.status === 'ok'
  const events = ok ? listing.events : []
  const now = ok ? listing.now : new Date().toISOString()
  // Events the sample member already holds a place at: only for sample listings, which the public
  // timeline no longer receives (nobody is signed in to the Core platform).
  const held = ok && listing.source === 'sample' ? (await getCurrentMember()).attendance.filter((a) => a.status === 'registered').map((a) => a.event.slug) : []
  const upcoming = events.filter((e) => !isPast(e, now))
  const featured = upcoming.find((e) => e.featured) ?? upcoming[0]
  const thisMonth = upcoming.filter((e) => omanMonthKey(e.start) === omanMonthKey(now)).length
  const open = upcoming.filter((e) => e.registration === 'open' && (e.capacity === undefined || e.registered === undefined || e.registered < e.capacity)).length

  return (
    <>
      <PlatformHero
        eyebrow={c.eyebrow}
        title={c.title}
        lead={<p>{c.lead}</p>}
        tone="surface"
        visual={featured ? <FeaturedEvent event={featured} held={held} now={now} /> : undefined}
      >
        {ok && (
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
        )}
        {ok && listing.source === 'sample' && <SampleNotice />}
      </PlatformHero>
      <Suspense fallback={null}>
        {/* Core unreachable: the timeline's own error state, with its retry. */}
        <EventsTimeline events={events} held={held} state={ok ? state : 'error'} now={now} />
      </Suspense>
      <ScrollReveals />
    </>
  )
}
