'use client'

import Link from 'next/link'
import type { CSSProperties } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { useDemoSession } from '@/components/platform/DemoSession'
import { StatusBadge } from '@/components/platform/Platform'
import { STATUS_TONE, eventStatus, myRegistration, seatsTaken } from '@/components/platform/registration'
import { IconArrowRight } from '@/components/ui/icons'
import { ItemMedia } from '@/components/ui/Plate'
import type { EventView } from '@/content/platform/events'
import { eventDateParts, eventTimesIsolated } from '@/lib/format'
import styles from './Events.module.css'

/**
 * The hero's featured event: its drawing on a sheet, with the date stamped across the corner.
 * The seat bar appears only for events that publish their capacity (sample events; Core keeps it
 * private).
 */
export function FeaturedEvent({ event, held, now }: { event: EventView; held: string[]; now?: string }) {
  const { t, l, intl } = useI18n()
  const c = t.platform.eventsPage
  const session = useDemoSession()
  const status = eventStatus(event, myRegistration(event.slug, session.registrations, held), now)
  const taken = seatsTaken(event, session.registrations, held)
  const capacity = event.capacity ?? 0
  const d = eventDateParts(event.start, intl)
  return (
    <Link href={`/events/${event.slug}`} className={`${styles.featured} intro-item`} style={{ '--i': 2 } as CSSProperties}>
      <ItemMedia
        id={`featured-${event.slug}`}
        drawing={event.drawing}
        image={event.image ? { src: event.image.src, alt: '', focus: event.image.focus } : undefined}
        tone="ivory"
        sizes="(min-width: 64rem) 40vw, 92vw"
        className={styles.featuredMedia}
      />
      <span className={styles.featuredStamp}>
        <span className={styles.stampDay}>{d.day}</span>
        <span className={styles.stampMonth}>{d.month}</span>
      </span>
      <span className={styles.featuredBody}>
        <span className={styles.cardTop}>
          <span className="chip chip--brand">{c.featured}</span>
          <StatusBadge tone={STATUS_TONE[status]}>{t.platform.status[status]}</StatusBadge>
        </span>
        <span className={styles.featuredTitle}>{l(event.title)}</span>
        <span className={styles.cardMeta}>
          {d.weekday} · {eventTimesIsolated(event.start, event.end, intl)}
          {event.location && <> · {l(event.location)}</>}
        </span>
        <span className={styles.featuredFoot}>
          {taken !== null && (
            <span className={styles.seats}>
              <span className={styles.seatBar} style={{ '--fill': `${(taken / capacity) * 100}%` } as CSSProperties} aria-hidden="true" />
              <span className={styles.seatText}>{c.seats(Math.max(0, capacity - taken), capacity)}</span>
            </span>
          )}
          <span className={styles.featuredCta}>
            {c.view}
            <IconArrowRight className="btn__arrow" />
          </span>
        </span>
      </span>
    </Link>
  )
}
