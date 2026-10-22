import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { MentorshipPanel } from '@/components/pages/network/Mentorship'
import netStyles from '@/components/pages/network/Network.module.css'
import styles from '@/components/pages/profile/Profile.module.css'
import { Breadcrumbs } from '@/components/platform/Breadcrumbs'
import { ComingSoon } from '@/components/platform/ComingSoon'
import { isComingSoon } from '@/content/site'
import { Monogram, SampleNotice } from '@/components/platform/Platform'
import { DisciplineLink } from '@/components/ui/DisciplineLink'
import { DISCIPLINE_BY_ID } from '@/content/disciplines'
import { DISCIPLINE_COLOR, INDUSTRIES, SKILLS } from '@/content/platform/taxonomy'
import { getGraduate, getRelatedGraduates } from '@/lib/data'
import { getI18n } from '@/lib/i18n/server'
import { routes } from '@/lib/routes'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  if (isComingSoon('network')) {
    const { t } = await getI18n()
    return { title: t.platform.comingSoon.metaTitle(t.platform.comingSoon.modules.network.name) }
  }
  const { id } = await params
  const [{ t, l }, graduate] = await Promise.all([getI18n(), getGraduate(id)])
  const c = t.platform.networkPage
  if (!graduate) return { title: c.metaTitle }
  return { title: `${l(graduate.name)} · ${c.eyebrow}`, robots: { index: false } }
}

/**
 * A graduate's profile in the network: who they are now, what they can help with, and the
 * mentorship request, whose state is shared with the network page in this tab.
 */
export default async function GraduatePage({ params }: { params: Promise<{ id: string }> }) {
  if (isComingSoon('network')) return <ComingSoon module="network" />
  const { id } = await params
  const [{ t, l }, graduate] = await Promise.all([getI18n(), getGraduate(id)])
  if (!graduate) notFound()
  const c = t.platform.networkPage
  const g = graduate
  const peers = await getRelatedGraduates(g)

  return (
    <>
      <header className={styles.hero} style={{ '--key': DISCIPLINE_COLOR[g.discipline] } as CSSProperties} aria-label={c.profileOf(l(g.name))}>
        <div className="container">
          <Breadcrumbs trail={[{ href: routes.network, label: t.platform.nav.network }]} current={l(g.name)} />
          <div className={styles.heroGrid}>
            <Monogram name={g.name} discipline={g.discipline} size={112} className={styles.monogram} />
            <div className={styles.who}>
              <h1 className={`${styles.name} intro-item`}>{l(g.name)}</h1>
              <p className={`${styles.headline} intro-item`} style={{ '--i': 1 } as CSSProperties}>
                {l(g.role)}
              </p>
              <p className={`${styles.facts} intro-item`} style={{ '--i': 2 } as CSSProperties}>
                <span className={styles.key} aria-hidden="true" />
                <DisciplineLink id={g.discipline}>{l(DISCIPLINE_BY_ID[g.discipline].name)}</DisciplineLink> · {t.platform.common.classOf(g.graduated)}
              </p>
              <ul className={styles.interests} aria-label={c.skillsTitle}>
                {g.skills.map((s) => (
                  <li key={s} className="chip">
                    {l(SKILLS[s])}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className={styles.privacyNote}>{c.profileNote}</p>
        </div>
      </header>

      <section className={styles.block} aria-labelledby="graduate-offer">
        <div className={`container ${styles.blockGrid}`}>
          <div>
            <h2 id="graduate-offer" className={styles.blockTitle}>
              {c.offers}
            </h2>
            <p className={netStyles.offerLead}>{l(g.offer)}</p>
            <dl className={netStyles.profileFacts}>
              <div>
                <dt>{c.organisation}</dt>
                <dd>{l(g.employer)}</dd>
              </div>
              <div>
                <dt>{c.industry}</dt>
                <dd>{l(INDUSTRIES[g.industry])}</dd>
              </div>
              <div>
                <dt>{c.basedIn}</dt>
                <dd>{l(g.location)}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h2 className={styles.blockTitle}>{c.mentorshipTitle}</h2>
            <MentorshipPanel graduate={g} />
          </div>
        </div>
        <div className="container">
          <SampleNotice className={styles.sample} />
        </div>
      </section>

      {peers.length > 0 && (
        <section className={styles.block} aria-labelledby="graduate-peers">
          <div className="container">
            <h2 id="graduate-peers" className={styles.blockTitle}>
              {c.more}
            </h2>
            <ul className={netStyles.peers}>
              {peers.map((p) => (
                <li key={p.id}>
                  <Link href={routes.graduate(p.id)} className={netStyles.peer}>
                    <Monogram name={p.name} discipline={p.discipline} size={44} />
                    <span className={netStyles.peerText}>
                      <span className={netStyles.peerName}>{l(p.name)}</span>
                      <span className={netStyles.peerRole}>
                        {l(p.role)} · {t.platform.common.classOf(p.graduated)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  )
}
