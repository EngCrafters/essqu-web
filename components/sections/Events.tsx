import Link from 'next/link'
import { EVENTS, type SocietyEvent } from '@/content/events'
import { eventDateParts, eventTimeRange } from '@/lib/format'
import type { I18n } from '@/lib/i18n'
import { getI18n } from '@/lib/i18n/server'
import { IconArrowRight, IconClock, IconPin } from '@/components/ui/icons'
import { ItemMedia } from '@/components/ui/Plate'
import { routes } from '@/lib/routes'
import styles from './Events.module.css'

export async function Events() {
  const i18n = await getI18n()
  const { t } = i18n
  const [featured, ...rest] = EVENTS

  return (
    <section id="events" className={`section ${styles.section}`} aria-labelledby="events-title">
      <div className="container">
        <header className="section-head">
          <h2 id="events-title" className="section-title" data-reveal="heading">
            {t.events.title}
          </h2>
          <div className={styles.headAside} data-reveal="rise">
            <p className="preview-note">
              <span className="status-dot" aria-hidden="true" />
              <span>
                <strong>{t.events.sampleStrong}</strong> {t.events.sampleBody}
              </span>
            </p>
          </div>
        </header>

        {featured ? (
          <>
            <FeaturedEvent event={featured} i18n={i18n} />
            {rest.length > 0 && (
              <div className={styles.schedule}>
                <h3 className={styles.scheduleTitle}>{t.events.alsoComingUp}</h3>
                <ol className={styles.list} data-reveal="rows">
                  {rest.map((event) => (
                    <li key={event.id} className={styles.item}>
                      <span className={styles.rule} data-part="rule" aria-hidden="true" />
                      <EventRow event={event} i18n={i18n} />
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        ) : (
          <p className={styles.empty}>{t.events.empty}</p>
        )}
      </div>
    </section>
  )
}

type Props = { event: SocietyEvent; i18n: I18n }

function Meta({ event, i18n, className }: Props & { className?: string }) {
  const { t, l, intl } = i18n
  const date = eventDateParts(event.start, intl)
  return (
    <dl className={[styles.meta, className].filter(Boolean).join(' ')}>
      <div>
        <dt>
          <IconClock className={styles.metaIcon} />
          <span className="visually-hidden">{t.events.dateTime}</span>
        </dt>
        <dd>
          <time dateTime={event.start}>{date.long}</time>
          {t.common.comma}
          <span dir="ltr">{eventTimeRange(event.start, event.end, intl)}</span>{' '}
          <span className={styles.tz}>{t.events.timezone}</span>
        </dd>
      </div>
      <div>
        <dt>
          <IconPin className={styles.metaIcon} />
          <span className="visually-hidden">{t.events.location}</span>
        </dt>
        <dd>{l(event.location)}</dd>
      </div>
    </dl>
  )
}

/** The event's own page holds its (prototype) registration, so the action opens it there. */
function Register({ event, i18n, variant }: Props & { variant: 'primary' | 'secondary' }) {
  const { t, l } = i18n
  const title = l(event.title)
  return (
    <div className={styles.register}>
      <p className={styles.status}>
        <span className="status-dot" aria-hidden="true" />
        {t.events.registration[event.registration]}
      </p>
      <Link
        href={`${routes.event(event.id)}#register`}
        className={`btn btn--${variant} btn--compact`}
        aria-label={t.events.previewFor(t.events.previewRegistration, title)}
      >
        {t.events.previewRegistration}
        <IconArrowRight className="btn__arrow" />
      </Link>
    </div>
  )
}

/** The title opens the event's page; the text keeps the section's own styling. */
function EventTitle({ event, i18n, className, part }: Props & { className: string; part?: string }) {
  return (
    <h3 id={`${event.id}-title`} className={className} data-part={part}>
      <Link href={routes.event(event.id)} className={styles.titleLink}>
        {i18n.l(event.title)}
      </Link>
    </h3>
  )
}

function FeaturedEvent({ event, i18n }: Props) {
  const { t, l, intl } = i18n
  const date = eventDateParts(event.start, intl)
  return (
    <article className={styles.featured} aria-labelledby={`${event.id}-title`} data-reveal="feature">
      <div className={styles.visual}>
        <div className={styles.media} data-part="media">
          <ItemMedia
            id={event.id}
            drawing={event.drawing}
            image={event.image && { ...event.image, alt: l(event.image.alt) }}
            tone="soft"
            sizes="(min-width: 64rem) 58vw, 100vw"
            className={styles.plate}
          />
          {event.sample && <span className={`chip chip--sample ${styles.sampleTag}`}>{t.common.sample}</span>}
        </div>
        {/* The date as a graphic element, straddling the drawing's edge. */}
        <p className={styles.date} data-part="date" aria-hidden="true">
          <span className={styles.day}>{date.day}</span>
          <span className={styles.dateMeta}>
            <span>
              {date.month} {date.year}
            </span>
            <span>{date.weekday}</span>
          </span>
        </p>
      </div>
      <div className={styles.featuredText}>
        <p className={styles.type} data-part="text">
          {t.events.featured} · {t.events.types[event.type]}
        </p>
        <EventTitle event={event} i18n={i18n} className={styles.featuredTitle} part="text" />
        <p className={styles.description} data-part="text">
          {l(event.description)}
        </p>
        <div data-part="text">
          <Meta event={event} i18n={i18n} />
        </div>
        <div data-part="text">
          <Register event={event} i18n={i18n} variant="primary" />
        </div>
      </div>
    </article>
  )
}

function EventRow({ event, i18n }: Props) {
  const { t, l, intl } = i18n
  const date = eventDateParts(event.start, intl)
  return (
    <article className={styles.row} aria-labelledby={`${event.id}-title`} data-part="row">
      <p className={styles.rowDate} aria-hidden="true">
        <span className={styles.rowDay}>{date.day}</span>
        <span className={styles.rowMonth}>{date.month}</span>
      </p>
      <div className={styles.rowMain}>
        <p className={styles.type}>
          {t.events.types[event.type]}
          {event.sample && <span className="chip chip--sample">{t.common.sample}</span>}
        </p>
        <EventTitle event={event} i18n={i18n} className={styles.rowTitle} />
        <p className={styles.description}>{l(event.description)}</p>
      </div>
      <Meta event={event} i18n={i18n} className={styles.rowMeta} />
      <div className={styles.rowAction}>
        <Register event={event} i18n={i18n} variant="secondary" />
      </div>
    </article>
  )
}
