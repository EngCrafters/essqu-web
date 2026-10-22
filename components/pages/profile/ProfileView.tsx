import Link from 'next/link'
import type { CSSProperties } from 'react'
import { Breadcrumbs } from '@/components/platform/Breadcrumbs'
import { Monogram, SampleNotice } from '@/components/platform/Platform'
import { DisciplineLink } from '@/components/ui/DisciplineLink'
import { IconArrowRight } from '@/components/ui/icons'
import { Plate } from '@/components/ui/Plate'
import { DISCIPLINE_BY_ID } from '@/content/disciplines'
import { DISCIPLINE_COLOR, SKILLS } from '@/content/platform/taxonomy'
import type { MemberProfile } from '@/lib/data'
import { formatMonthYear } from '@/lib/format'
import { getI18n } from '@/lib/i18n/server'
import { routes } from '@/lib/routes'
import { SessionMemberNote } from './SessionMemberNote'
import styles from './Profile.module.css'

/**
 * A member's profile around their engineering journey: Joined → Participated → Attended →
 * Built → Earned → Graduated. The public view shows what a member has done; the member's own
 * view adds the private parts (attendance, certificate status) and the links to manage them.
 */
export async function ProfileView({ profile, own }: { profile: MemberProfile; own: boolean }) {
  const { t, l, intl } = await getI18n()
  const c = t.platform.membersPage
  const m = profile.member
  const key = DISCIPLINE_COLOR[m.discipline]
  const attended = profile.attendance.filter((a) => a.status === 'attended').length
  const certificates = profile.certificates.filter((x) => own || x.status === 'valid')
  const validCount = profile.certificates.filter((x) => x.status === 'valid').length
  const dateOf = (d: string | null) => (d ? (d.length === 4 ? d : formatMonthYear(d.slice(0, 10), intl)) : null)

  return (
    <>
      <header className={styles.hero} style={{ '--key': key } as CSSProperties}>
        <div className="container">
          {own ? (
            <p className={styles.badge}>{c.you}</p>
          ) : (
            <Breadcrumbs trail={[{ href: routes.members, label: t.platform.nav.members }]} current={l(m.name)} />
          )}
          <div className={styles.heroGrid}>
            <Monogram name={m.name} discipline={m.discipline} size={112} className={styles.monogram} />
            <div className={styles.who}>
              <h1 className={`${styles.name} intro-item`}>{l(m.name)}</h1>
              <p className={`${styles.headline} intro-item`} style={{ '--i': 1 } as CSSProperties}>
                {l(m.headline)}
              </p>
              <p className={`${styles.facts} intro-item`} style={{ '--i': 2 } as CSSProperties}>
                <span className={styles.key} aria-hidden="true" />
                <DisciplineLink id={m.discipline}>{l(DISCIPLINE_BY_ID[m.discipline].name)}</DisciplineLink> · {t.platform.common.yearN(m.year)} · {c.joined(formatMonthYear(`${m.joined}-01`, intl))}
              </p>
              <ul className={styles.interests} aria-label={c.interestsTitle}>
                {m.interests.map((s) => (
                  <li key={s} className="chip">
                    {l(SKILLS[s])}
                  </li>
                ))}
              </ul>
            </div>
            {own && (
              <div className={styles.ownActions}>
                <Link href={routes.profileEvents} className="btn btn--primary btn--compact">
                  {c.attendanceLink}
                  <IconArrowRight className="btn__arrow" />
                </Link>
                <Link href={routes.certificates} className="btn btn--secondary btn--compact">
                  {c.certificatesLink}
                </Link>
                <Link href={routes.member(m.id)} className="btn btn--secondary btn--compact">
                  {c.publicProfile}
                </Link>
                <button type="button" className="btn btn--secondary btn--compact" disabled aria-describedby="edit-soon">
                  {c.editProfile}
                </button>
                <p id="edit-soon" className={styles.small}>
                  {c.editSoon}
                </p>
              </div>
            )}
          </div>
          <p className={styles.privacyNote}>{own ? c.ownNote : c.publicNote}</p>
          {own && <SessionMemberNote />}
        </div>
      </header>

      {/* The journey: a route of six stations, solid where reached. */}
      <section className={styles.journey} aria-labelledby="journey-title" style={{ '--key': key } as CSSProperties}>
        <div className="container">
          <h2 id="journey-title" className="section-title" data-reveal="heading">
            {c.journey}
          </h2>
          <ol className={styles.route} aria-label={c.journeyLabel} data-reveal="points">
            {profile.journey.map((s, i) => {
              const date = dateOf(s.date)
              return (
                <li key={s.stage} className={styles.station} data-reached={s.reached || undefined} data-last={i === profile.journey.length - 1 || undefined}>
                  <span className={styles.trace} data-part="rule" aria-hidden="true" />
                  <span className={styles.pad} aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className={styles.stationText} data-part="text">
                    <span className={styles.stationName}>{c.stages[s.stage]}</span>
                    <span className={styles.stationNote}>{c.stageNotes[s.stage]}</span>
                    <span className={styles.stationDate}>
                      {s.stage === 'graduated' && date ? c.expected(date) : s.reached ? date : c.notYet}
                    </span>
                    {s.reached &&
                      s.label &&
                      (s.href ? (
                        <Link href={s.href} className={styles.stationLabel}>
                          {l(s.label)}
                        </Link>
                      ) : (
                        <span className={styles.stationLabel}>{l(s.label)}</span>
                      ))}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      <section className={styles.glance} aria-label={c.statsLabel}>
        <div className="container">
          <dl className={styles.stats}>
            <div>
              <dt>{c.stats.events}</dt>
              <dd>{attended}</dd>
            </div>
            <div>
              <dt>{c.stats.projects}</dt>
              <dd>{profile.projects.length}</dd>
            </div>
            <div>
              <dt>{c.stats.certificates}</dt>
              <dd>{validCount}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className={styles.block} aria-labelledby="profile-projects">
        <div className={`container ${styles.blockGrid}`}>
          <div>
            <h2 id="profile-projects" className={styles.blockTitle}>
              {c.projectsTitle}
            </h2>
            {profile.projects.length === 0 ? (
              <p className={styles.empty}>{c.noProjects}</p>
            ) : (
              <ul className={styles.projects}>
                {profile.projects.map((p) => (
                  <li key={p.slug}>
                    <Link href={routes.project(p.slug)} className={styles.project}>
                      <span className={styles.projectMedia}>
                        <Plate id={`pf-${m.id}-${p.slug}`} drawing={p.drawing} tone="ivory" />
                      </span>
                      <span className={styles.projectText}>
                        <span className={styles.projectTitle}>{l(p.title)}</span>
                        <span className={styles.small}>
                          {l(DISCIPLINE_BY_ID[p.discipline].shortName)} · {p.year}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h2 className={styles.blockTitle}>{c.certificatesTitle}</h2>
            {certificates.length === 0 ? (
              <p className={styles.empty}>{c.noCertificates}</p>
            ) : (
              <ul className={styles.certs}>
                {certificates.map((x) => (
                  <li key={x.id}>
                    <Link href={routes.certificate(x.id)} className={styles.cert} data-status={x.status}>
                      <span className={styles.certSeal} aria-hidden="true" />
                      <span className={styles.projectText}>
                        <span className={styles.projectTitle}>{l(x.event)}</span>
                        <span className={styles.small}>
                          {formatMonthYear(x.issued, intl)}
                          {own && x.status !== 'valid' ? ` · ${t.platform.certificatesPage.status[x.status]}` : ''}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="container">
          <SampleNotice className={styles.sample} />
        </div>
      </section>
    </>
  )
}
