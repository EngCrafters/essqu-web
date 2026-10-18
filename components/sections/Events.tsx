import Link from 'next/link'
import { eventDateParts } from '@/lib/format'
import { getI18n } from '@/lib/i18n/server'
import { getEvents } from '@/lib/core-api/server'
import { eventCopy } from '@/lib/core-api/copy'
import type { CoreEvent } from '@/lib/core-api/types'
import type { I18n } from '@/lib/i18n'
import { ItemMedia } from '@/components/ui/Plate'
import styles from './Events.module.css'

export async function Events({
  period = 'upcoming',
  cursor,
  full = false,
}: {
  period?: 'upcoming' | 'past'
  cursor?: string
  full?: boolean
}) {
  const i18n = await getI18n(),
    copy = eventCopy[i18n.locale]
  const page = await getEvents(period, cursor).catch(() => null)
  const [featured, ...rest] = page?.data ?? []
  return (
    <section id="events" className={`section ${styles.section}`} aria-labelledby="events-title">
      <div className="container">
        <header className="section-head">
          <h2 id="events-title" className="section-title" data-reveal="heading">
            {copy.title}
          </h2>
          <nav aria-label={copy.title} className={styles.headAside}>
            <Link href="/events">{copy.upcoming}</Link>
            <Link href="/events?period=past">{copy.past}</Link>
          </nav>
        </header>
        {!page ? (
          <p role="status" className={styles.empty}>
            {copy.unavailable}
          </p>
        ) : !featured ? (
          <p className={styles.empty}>{copy.empty}</p>
        ) : (
          <>
            <EventCard event={featured} i18n={i18n} featured />
            <div className={styles.schedule}>
              <ol className={styles.list}>
                {rest.map((event) => (
                  <li key={event.id} className={styles.item}>
                    <EventCard event={event} i18n={i18n} />
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}
        {full && page?.meta.nextCursor ? (
          <Link
            className="btn btn--secondary"
            href={`/events?${new URLSearchParams({ period, cursor: page.meta.nextCursor })}`}
          >
            {copy.next}
          </Link>
        ) : null}
        {!full ? (
          <Link className="btn btn--secondary" href="/events">
            {copy.all}
          </Link>
        ) : null}
      </div>
    </section>
  )
}
function EventCard({ event, i18n, featured = false }: { event: CoreEvent; i18n: I18n; featured?: boolean }) {
  const copy = eventCopy[i18n.locale],
    date = eventDateParts(event.eventDate, i18n.intl)
  const time = new Intl.DateTimeFormat(i18n.intl, {
    timeZone: 'Asia/Muscat',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(event.eventDate))
  return (
    <article className={featured ? styles.featured : styles.row} data-reveal={featured ? 'feature' : 'rise'}>
      {featured ? (
        <div className={styles.visual}>
          <div className={styles.media} data-part="media">
            <ItemMedia
              id={event.id}
              drawing="robotics-workshop"
              tone="soft"
              sizes="(min-width: 64rem) 58vw, 100vw"
              className={styles.plate}
            />
          </div>
          <p className={styles.date} data-part="date" aria-hidden="true">
            <span className={styles.day}>{date.day}</span>
            <span className={styles.dateMeta}>
              {date.month} {date.year}
            </span>
          </p>
        </div>
      ) : null}
      <div className={featured ? styles.featuredText : styles.rowMain}>
        <p className={styles.type} data-part="text">
          {event.committeeName}
        </p>
        <h3 className={featured ? styles.featuredTitle : styles.rowTitle} data-part="text">
          {event.title}
        </h3>
        <p className={styles.description} data-part="text">
          {event.description}
        </p>
        <p>
          <time dateTime={event.eventDate}>
            {date.long} · {time}
          </time>{' '}
          · {copy.timezone}
        </p>
        <p>{event.location ?? copy.location}</p>
        <p className={styles.status}>
          {event.availability === 'open' ? copy.open : event.availability === 'waitlist' ? copy.waitlist : copy.closed}
        </p>
        <Link href={`/events/${event.id}`} className={`btn btn--${featured ? 'primary' : 'secondary'}`}>
          {copy.details}
        </Link>
      </div>
    </article>
  )
}
