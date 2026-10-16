import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import { ScrollReveals } from '@/components/motion/ScrollReveals'
import { Convergence } from '@/components/pages/about/Convergence'
import styles from '@/components/pages/about/About.module.css'
import { RecordChart } from '@/components/pages/about/RecordChart'
import { trussGeometry } from '@/components/pages/leadership/truss'
import { CtaBand } from '@/components/platform/Platform'
import { IconArrowRight } from '@/components/ui/icons'
import { Portrait } from '@/components/ui/Portrait'
import { ACTIVITIES } from '@/content/activities'
import { OVERVIEW } from '@/content/overview'
import { SOCIETY_FACTS } from '@/content/stats'
import { COMMITTEES, LEADERSHIP } from '@/content/structure'
import { getYearlyRecord } from '@/lib/data'
import { getI18n } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.platform.aboutPage.metaTitle, description: t.platform.aboutPage.metaDescription }
}

/** The leadership drawing's frame, in truss units: room above the apex and below the deck. */
const FRAME = { x: -20, y: -330, w: 1240, h: 810 }
/** The President sits above the apex, joined to it by a stem, so the hierarchy reads top-down. */
const PRESIDENT_SEAT = -220
const at = (x: number, y: number) =>
  ({ left: `${((x - FRAME.x) / FRAME.w) * 100}%`, top: `${((y - FRAME.y) / FRAME.h) * 100}%` }) as CSSProperties

export default async function AboutPage() {
  const { t, l, locale } = await getI18n()
  const c = t.platform.aboutPage
  const records = SOCIETY_FACTS.filter((f) => f.id === 'exhibitions' || f.id === 'gatherings')
  const truss = trussGeometry(COMMITTEES.length, LEADERSHIP.vicePresidents.length)
  const record = await getYearlyRecord()
  const seats = [
    { position: LEADERSHIP.president, joint: { x: truss.apex.x, y: PRESIDENT_SEAT }, rank: 'president' as const },
    ...LEADERSHIP.vicePresidents.map((position, i) => ({ position, joint: truss.upper[truss.vpIndex[i]!]!, rank: 'vp' as const })),
  ]

  return (
    <>
      <Convergence>
        <p className={`${styles.eyebrow} intro-item`} style={{ '--i': 0 } as CSSProperties}>
          {c.eyebrow}
        </p>
        <h1 id="about-title" className={`${styles.title} intro-item`} style={{ '--i': 1 } as CSSProperties}>
          {c.title}
        </h1>
        <p className={`${styles.lead} intro-item`} style={{ '--i': 2 } as CSSProperties}>
          {c.lead}
        </p>
        <p className={styles.cue} aria-hidden="true">
          {c.scrollCue}
        </p>
      </Convergence>

      {/* Purpose: the society's own overview, set as a specification. */}
      <section className={`section ${styles.purpose}`} aria-labelledby="purpose-title">
        <div className="container">
          <div className={styles.purposeGrid}>
            <div>
              <p className={styles.eyebrow}>{c.purposeEyebrow}</p>
              <h2 id="purpose-title" className="section-title" data-reveal="heading">
                {l(OVERVIEW.heading)}
              </h2>
            </div>
            <p className={styles.purposeBody} data-reveal="rise">
              {l(OVERVIEW.paragraphs[1]!)}
            </p>
          </div>
          <ol className={styles.spec} data-reveal="points">
            {OVERVIEW.points.map((p) => (
              <li key={p.id} className={styles.specItem}>
                <span className={styles.specRule} data-part="rule" aria-hidden="true" />
                <h3 className={styles.specTitle} data-part="text">
                  {l(p.title)}
                </h3>
                <p className={styles.specBody} data-part="text">
                  {l(p.body)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* The six activities as a programme board. */}
      <section className={`section ${styles.activities}`} aria-labelledby="activities-title">
        <div className="container">
          <div className="section-head">
            <div>
              <p className={styles.eyebrow}>{c.activitiesEyebrow}</p>
              <h2 id="activities-title" className="section-title" data-reveal="heading">
                {c.activitiesTitle}
              </h2>
            </div>
            <p className="section-lead" data-reveal="rise">
              {c.activitiesLead}
            </p>
          </div>
          <ol className={styles.board} data-reveal="rows">
            {ACTIVITIES.map((a, i) => {
              const photo = a.events[0]?.image
              const main = locale === 'ar' ? a.nameAr : a.nameEn
              const other = locale === 'ar' ? a.nameEn : a.nameAr
              return (
                <li key={a.id} className={styles.boardRow}>
                  <span data-part="rule" />
                  <Link href={`/activities?category=${a.id}`} className={styles.boardLink} data-part="row" aria-label={c.openArchive(main)}>
                    <span className={styles.boardIndex}>{String(i + 1).padStart(2, '0')}</span>
                    <span className={styles.boardNames}>
                      <span className={styles.boardName}>{main}</span>
                      <span className={styles.boardOfficial} lang={locale === 'ar' ? 'en' : 'ar'}>
                        {other}
                      </span>
                    </span>
                    <span className={styles.boardDesc} data-pending={a.descriptionStatus === 'needs-input' || undefined}>
                      {l(a.description)}
                    </span>
                    {photo && (
                      <span className={styles.boardThumb}>
                        <Image src={photo.src} alt="" fill sizes="144px" />
                      </span>
                    )}
                    <IconArrowRight className={styles.boardArrow} />
                  </Link>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      {/* The record: activities and projects each year from the founding to today, read left
          to right (right to left in Arabic), with the verified facts beneath. */}
      <section className={`section ${styles.milestones}`} aria-labelledby="milestones-title">
        <div className="container">
          <div className="section-head">
            <div>
              <p className={styles.eyebrow}>{c.milestonesEyebrow}</p>
              <h2 id="milestones-title" className="section-title" data-reveal="heading">
                {c.milestonesTitle}
              </h2>
            </div>
            <p className="section-lead" data-reveal="rise">
              {c.recordLead}
            </p>
          </div>
          <RecordChart years={record.years} sample={record.sample} />
          <dl className={styles.verified}>
            <div>
              <dt>{c.founded}</dt>
              <dd className={styles.markerYear}>{c.foundedYear}</dd>
            </div>
            {records.map((r) => (
              <div key={r.id}>
                <dt>
                  {l(r.label)} <span className={styles.recordTag}>· {c.onRecord}</span>
                </dt>
                <dd>{r.stat.kind === 'count' ? r.stat.value : null}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.recordsNote}>{c.recordsNote}</p>
        </div>
      </section>

      {/* How the society is led, in miniature. */}
      <section id="structure" className="section" style={{ borderTop: '1px solid var(--border)', scrollMarginTop: 'var(--nav-height)' }} aria-labelledby="structure-title">
        <div className={`container ${styles.teaser}`}>
          <div>
            <p className={styles.eyebrow}>{c.structureEyebrow}</p>
            <h2 id="structure-title" className="section-title" data-reveal="heading">
              {c.structureTitle}
            </h2>
            <p className="section-lead" style={{ marginTop: 'var(--space-5)' }} data-reveal="rise">
              {c.structureLead}
            </p>
            <Link href="/leadership" className={`btn btn--secondary ${styles.teaserLink}`}>
              {c.structureLink}
              <IconArrowRight className="btn__arrow" />
            </Link>
          </div>
          <figure className={styles.leaders} aria-label={c.leadersLabel}>
            <svg className={styles.teaserDrawing} viewBox={`${FRAME.x} ${FRAME.y} ${FRAME.w} ${FRAME.h}`} aria-hidden="true" focusable="false">
              {truss.members.map((m, i) => (
                <line
                  key={i}
                  x1={m.a.x}
                  y1={m.a.y}
                  x2={m.b.x}
                  y2={m.b.y}
                  data-kind={m.kind}
                  strokeWidth={m.kind === 'web' ? 3 : m.kind === 'rafter' ? 5 : 7}
                />
              ))}
              <line x1={truss.apex.x} y1={PRESIDENT_SEAT} x2={truss.apex.x} y2={truss.apex.y} data-kind="rafter" strokeWidth={5} />
              <circle cx={truss.apex.x} cy={truss.apex.y} r="12" />
              {truss.upper.map((j, i) => (truss.vpIndex.includes(i) ? null : <circle key={`u${i}`} cx={j.x} cy={j.y} r="8" />))}
              {truss.deck.map((j, i) => (
                <circle key={`d${i}`} cx={j.x} cy={j.y} r="12" />
              ))}
            </svg>
            <ul className={styles.seats} data-reveal="stagger">
              {seats.map(({ position, joint, rank }) => (
                <li key={position.id} className={styles.seat} data-rank={rank} style={at(joint.x, joint.y)}>
                  <Portrait
                    person={position.holder}
                    size="sm"
                    alt={position.holder ? l(position.holder.name) : ''}
                    className={styles.seatPortrait}
                  />
                  <span className={styles.seatRole}>{l(position.title)}</span>
                  <span className={styles.seatName}>{position.holder ? l(position.holder.name) : t.leadership.nameToBeAnnounced}</span>
                </li>
              ))}
            </ul>
            <figcaption className={styles.deckLabel} style={at(600, truss.deck[0]!.y + 46)}>
              {c.committeesLabel(COMMITTEES.length)}
            </figcaption>
          </figure>
        </div>
      </section>

      <CtaBand title={c.closingTitle} body={c.closingBody}>
        <Link href="/register" className="btn btn--on-dark">
          {c.closingJoin}
          <IconArrowRight className="btn__arrow" />
        </Link>
        <Link href="/events" className="btn btn--outline-dark">
          {c.closingEvents}
        </Link>
      </CtaBand>
      <ScrollReveals />
    </>
  )
}
