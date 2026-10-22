import type { Metadata } from 'next'
import { ComingSoon } from '@/components/platform/ComingSoon'
import { isComingSoon } from '@/content/site'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { StateMessage } from '@/components/discovery/Discovery'
import { ScrollReveals } from '@/components/motion/ScrollReveals'
import { RegistrationPanel } from '@/components/pages/events/RegistrationPanel'
import { EventDescription } from '@/components/pages/events/EventDescription'
import { getMemberAuthConfig } from '@/lib/member-auth/config.server'
import styles from '@/components/pages/events/Events.module.css'
import { Breadcrumbs } from '@/components/platform/Breadcrumbs'
import { SampleNotice } from '@/components/platform/Platform'
import { DisciplineLink } from '@/components/ui/DisciplineLink'
import { ItemMedia } from '@/components/ui/Plate'
import { ACTIVITIES } from '@/content/activities'
import { DISCIPLINE_BY_ID } from '@/content/disciplines'
import { DISCIPLINE_COLOR } from '@/content/platform/taxonomy'
import { COMMITTEES } from '@/content/structure'
import { getCurrentMember, getEventPage } from '@/lib/data'
import { eventDateParts, eventTimesIsolated } from '@/lib/format'
import { getI18n } from '@/lib/i18n/server'
import { routes } from '@/lib/routes'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  // Memoised per request: the page below reuses this same read.
  const [{ t, l }, page] = await Promise.all([getI18n(), getEventPage(slug)])
  if (page.status !== 'ok') return { title: t.platform.eventsPage.metaTitle }
  return { title: `${l(page.event.title)} · ${t.platform.eventsPage.eyebrow}`, description: l(page.event.summary) }
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  // Developer switch (config/site-features.json): the preserved Coming Soon page stands in.
  if (isComingSoon('events')) return <ComingSoon module="events" />
  const { slug } = await params
  const [{ t, l, intl, locale }, page] = await Promise.all([getI18n(), getEventPage(slug)])
  if (page.status === 'not-found') notFound()
  const c = t.platform.eventsPage

  // Core couldn't be reached: the page says so honestly and offers a retry; the site around it stands.
  if (page.status === 'unavailable') {
    return (
      <>
        <header className={styles.detailHero}>
          <div className="container">
            <Breadcrumbs trail={[{ href: routes.events, label: t.nav.links.events }]} current={c.eyebrow} />
          </div>
        </header>
        <div className={`container ${styles.detailBody}`}>
          <StateMessage
            kind="error"
            title={t.platform.states.errorTitle}
            body={t.platform.states.errorBody}
            action={
              <a href={routes.event(slug)} className="btn btn--secondary">
                {t.platform.states.retry}
              </a>
            }
          />
        </div>
      </>
    )
  }

  const { event, related, registration, now } = page
  // The sample member's registrations exist only for sample events, which public pages no longer
  // receive; nobody is signed in to Core.
  const held = event.sample ? (await getCurrentMember()).attendance.filter((a) => a.status === 'registered').map((a) => a.event.slug) : []
  const d = eventDateParts(event.start, intl)
  const committee = COMMITTEES.find((x) => x.id === event.organizer)
  const activity = ACTIVITIES.find((a) => a.id === event.activity)

  return (
    <>
      <header className={styles.detailHero}>
        <div className="container">
          <Breadcrumbs trail={[{ href: routes.events, label: t.nav.links.events }]} current={l(event.title)} />
          <div className={styles.detailGrid}>
            <div>
              {event.type && <span className="chip">{t.platform.eventTypes[event.type]}</span>}
              <h1 className={`${styles.detailTitle} intro-item`}>{l(event.title)}</h1>
              <p className={`${styles.detailSummary} intro-item`} style={{ '--i': 1 } as CSSProperties}>
                {l(event.summary)}
              </p>
              <dl className={`${styles.facts} intro-item`} style={{ '--i': 2 } as CSSProperties}>
                <div>
                  <dt>{c.date}</dt>
                  <dd>{d.long}</dd>
                </div>
                <div>
                  <dt>{c.time}</dt>
                  <dd>
                    {eventTimesIsolated(event.start, event.end, intl)}
                    <br />
                    <span className={styles.factNote}>{c.timezone}</span>
                  </dd>
                </div>
                {event.location && (
                  <div>
                    <dt>{c.location}</dt>
                    <dd>{l(event.location)}</dd>
                  </div>
                )}
              </dl>
            </div>
            <ItemMedia
              id={`detail-${event.slug}`}
              drawing={event.drawing}
              image={event.image ? { src: event.image.src, alt: l(event.image.alt), focus: event.image.focus } : undefined}
              tone="ivory"
              sizes="(min-width: 64rem) 40vw, 92vw"
              className={styles.detailMedia}
            />
          </div>
        </div>
      </header>

      <div className={`container ${styles.detailBody}`}>
        <div className={styles.main}>
          {event.about.length > 0 && (
            <section aria-labelledby="about-event">
              <h2 id="about-event" className={styles.blockTitle}>
                {c.about}
              </h2>
              <div className={styles.prose} data-reveal="stagger">
                {event.about.map((p, i) => (
                  <p key={i}>
                    <EventDescription text={l(p)} />
                  </p>
                ))}
              </div>
            </section>
          )}

          {event.schedule.length > 0 && (
            <section aria-labelledby="programme">
              <h2 id="programme" className={styles.blockTitle}>
                {c.programme}
              </h2>
              <ol className={styles.programme} data-reveal="stagger">
                {event.schedule.map((s) => (
                  <li key={s.time} className={styles.slot}>
                    <span className={styles.slotTime}>{s.time}</span>
                    <span className={styles.slotTitle}>{l(s.title)}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section aria-labelledby="event-details">
            <h2 id="event-details" className={styles.blockTitle}>
              {c.details}
            </h2>
            <dl className={styles.meta}>
              {committee ? (
                <div>
                  <dt>{c.organiser}</dt>
                  <dd>
                    <Link href={routes.leadership}>{l(committee.name)}</Link>
                  </dd>
                </div>
              ) : (
                event.organizerName && (
                  <div>
                    <dt>{c.organiser}</dt>
                    <dd>{l(event.organizerName)}</dd>
                  </div>
                )
              )}
              {event.disciplines.length > 0 && (
                <div>
                  <dt>{c.disciplines}</dt>
                  <dd>
                    {event.disciplines.map((k) => (
                      <DisciplineLink
                        key={k}
                        id={k}
                        className="chip"
                        style={{ '--key': DISCIPLINE_COLOR[k], borderColor: DISCIPLINE_COLOR[k] } as CSSProperties}
                      >
                        {l(DISCIPLINE_BY_ID[k].shortName)}
                      </DisciplineLink>
                    ))}
                  </dd>
                </div>
              )}
              {activity && (
                <div>
                  <dt>{c.activity}</dt>
                  <dd>
                    <Link href={routes.activity(activity.id)} className="chip chip--brand">
                      {locale === 'ar' ? activity.nameAr : activity.nameEn}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </section>
          {event.sample && <SampleNotice />}
        </div>

        <aside id="register" className={styles.aside} aria-label={c.registration}>
          <RegistrationPanel event={event} held={held} now={now} registration={registration} authSettings={getMemberAuthConfig()} />
        </aside>
      </div>

      {related.length > 0 && (
        <section className={styles.related} aria-labelledby="related-title">
          <div className="container">
            <h2 id="related-title" className="section-title" data-reveal="heading" style={{ marginBottom: 'var(--space-7)' }}>
              {c.related}
            </h2>
            <ul className={styles.relatedList} data-reveal="stagger">
              {related.map((r) => {
                const rd = eventDateParts(r.start, intl)
                // Sample events are labelled by type; Core events (which have none) by their committee.
                const organiser = COMMITTEES.find((x) => x.id === r.organizer)?.name ?? r.organizerName
                return (
                  <li key={r.slug}>
                    <Link href={routes.event(r.slug)} className={styles.mini}>
                      <ItemMedia
                        id={`rel-${r.slug}`}
                        drawing={r.drawing}
                        image={r.image ? { src: r.image.src, alt: '', focus: r.image.focus } : undefined}
                        sizes="(min-width: 48rem) 30vw, 92vw"
                        className={styles.miniMedia}
                      />
                      <span className={styles.miniDate}>
                        {rd.day} {rd.month} {rd.year}
                      </span>
                      <span className={styles.cardTitle}>{l(r.title)}</span>
                      <span className={styles.cardMeta}>{r.type ? t.platform.eventTypes[r.type] : organiser ? l(organiser) : null}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}
      <ScrollReveals />
    </>
  )
}
