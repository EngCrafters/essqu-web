import type { Metadata } from 'next'
import Link from 'next/link'
import { ScrollReveals } from '@/components/motion/ScrollReveals'
import { StructureTruss } from '@/components/pages/leadership/StructureTruss'
import styles from '@/components/pages/leadership/Leadership.module.css'
import { CtaBand, PlatformHero } from '@/components/platform/Platform'
import { IconArrowRight } from '@/components/ui/icons'
import { COMMITTEES, LEADERSHIP } from '@/content/structure'
import { getI18n } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.platform.leadershipPage.metaTitle, description: t.platform.leadershipPage.metaDescription }
}

export default async function LeadershipPage() {
  const { t, l } = await getI18n()
  const c = t.platform.leadershipPage
  const senior = [LEADERSHIP.president, ...LEADERSHIP.vicePresidents]
  const teams = COMMITTEES.reduce((n, cm) => n + cm.teams.length, 0)
  const filled =
    senior.filter((p) => p.holder).length + COMMITTEES.reduce((n, cm) => n + cm.roles.filter((r) => r.holder).length, 0)

  return (
    <>
      <PlatformHero
        eyebrow={c.eyebrow}
        title={c.title}
        lead={<p>{c.lead}</p>}
        layout="stack"
        tone="paper"
      >
        <p className={`preview-note ${styles.rosterNote}`}>
          <span className="status-dot" aria-hidden="true" />
          <span>
            {senior.some((p) => p.holder) ? (
              <>
                <strong>{c.rosterPartialStrong}</strong> {c.rosterPartialBody}
              </>
            ) : (
              <>
                <strong>{c.rosterStrong}</strong> {c.rosterBody}
              </>
            )}
          </span>
        </p>
        {LEADERSHIP.term && <p className="chip">{l(LEADERSHIP.term)}</p>}
      </PlatformHero>

      <StructureTruss />

      <section className="section" aria-labelledby="reading-title">
        <div className={`container ${styles.reading}`}>
          <div>
            <h2 id="reading-title" className="section-title" data-reveal="heading">
              {c.readingTitle}
            </h2>
            <ul className={styles.readingList} data-reveal="stagger" style={{ marginTop: 'var(--space-6)' }}>
              <li>
                <span className={styles.readingSwatch} data-kind="apex" aria-hidden="true" />
                {c.readingApex}
              </li>
              <li>
                <span className={styles.readingSwatch} aria-hidden="true" />
                {c.readingChord}
              </li>
              <li>
                <span className={styles.readingSwatch} data-kind="deck" aria-hidden="true" />
                {c.readingDeck}
              </li>
            </ul>
            <p className={styles.readingNote}>{c.readingNote}</p>
          </div>
          <div>
            <h2 className="section-title" data-reveal="heading">
              {c.seatsTitle}
            </h2>
            <dl className={styles.seats} style={{ marginTop: 'var(--space-6)' }}>
              <div>
                <dt>{c.seats.senior}</dt>
                <dd>{senior.length}</dd>
              </div>
              <div>
                <dt>{c.seats.committees}</dt>
                <dd>{COMMITTEES.length}</dd>
              </div>
              <div>
                <dt>{c.seats.teams}</dt>
                <dd>{teams}</dd>
              </div>
              <div>
                <dt>{c.seats.filled}</dt>
                <dd data-zero={filled === 0 || undefined}>{filled}</dd>
              </div>
            </dl>
            <p className={styles.seatsNote}>{c.seatsNote}</p>
          </div>
        </div>
      </section>

      <CtaBand title={c.closingTitle} body={c.closingBody}>
        <Link href="/register" className="btn btn--on-dark">
          {c.closingJoin}
          <IconArrowRight className="btn__arrow" />
        </Link>
        <Link href="/about" className="btn btn--outline-dark">
          {c.closingAbout}
        </Link>
      </CtaBand>
      <ScrollReveals />
    </>
  )
}
