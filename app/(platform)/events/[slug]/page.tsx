import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { ScrollReveals } from '@/components/motion/ScrollReveals'
import { RegistrationPanel } from '@/components/pages/events/RegistrationPanel'
import styles from '@/components/pages/events/Events.module.css'
import { Breadcrumbs } from '@/components/platform/Breadcrumbs'
import { SampleNotice } from '@/components/platform/Platform'
import { DisciplineLink } from '@/components/ui/DisciplineLink'
import { ItemMedia } from '@/components/ui/Plate'
import { ACTIVITIES } from '@/content/activities'
import { DISCIPLINE_BY_ID } from '@/content/disciplines'
import { DISCIPLINE_COLOR } from '@/content/platform/taxonomy'
import { COMMITTEES } from '@/content/structure'
import { getCurrentMember, getEvent, getRelatedEvents } from '@/lib/data'
import { eventDateParts, timeRangeIsolated } from '@/lib/format'
import { getI18n } from '@/lib/i18n/server'
import { routes } from '@/lib/routes'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const [{ t, l }, event] = await Promise.all([getI18n(), getEvent(slug)])
  if (!event) return { title: t.platform.eventsPage.metaTitle }
  return { title: `${l(event.title)} · ${t.platform.eventsPage.eyebrow}`, description: l(event.summary) }
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [{ t, l, intl, locale }, event, me] = await Promise.all([getI18n(), getEvent(slug), getCurrentMember()])
  if (!event) notFound()
  const c = t.platform.eventsPage
  const related = await getRelatedEvents(event)
  const held = me.attendance.filter((a) => a.status === 'registered').map((a) => a.event.slug)
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
              <span className="chip">{t.platform.eventTypes[event.type]}</span>
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
                    {timeRangeIsolated(event.start, event.end, intl)}
                    <br />
                    <span className={styles.factNote}>{c.timezone}</span>
                  </dd>
                </div>
                <div>
                  <dt>{c.location}</dt>
                  <dd>{l(event.location)}</dd>
                </div>
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
          <section aria-labelledby="about-event">
            <h2 id="about-event" className={styles.blockTitle}>
              {c.about}
            </h2>
            <div className={styles.prose} data-reveal="stagger">
              {event.about.map((p, i) => (
                <p key={i}>{l(p)}</p>
              ))}
            </div>
          </section>

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

          <section aria-labelledby="event-details">
            <h2 id="event-details" className={styles.blockTitle}>
              {c.details}
            </h2>
            <dl className={styles.meta}>
              {committee && (
                <div>
                  <dt>{c.organiser}</dt>
                  <dd>
                    <Link href={routes.leadership}>{l(committee.name)}</Link>
                  </dd>
                </div>
              )}
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
          <SampleNotice />
        </div>

        <aside id="register" className={styles.aside} aria-label={c.registration}>
          <RegistrationPanel event={event} held={held} />
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
                      <span className={styles.cardMeta}>{t.platform.eventTypes[r.type]}</span>
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
