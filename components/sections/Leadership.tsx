import Link from 'next/link'
import { LEADERSHIP } from '@/content/structure'
import { IconArrowRight } from '@/components/ui/icons'
import { getI18n } from '@/lib/i18n/server'
import { LeadershipTree } from './LeadershipTree'
import styles from './Leadership.module.css'
import { routes } from '@/lib/routes'

export async function Leadership() {
  const { t, l } = await getI18n()
  const positions = [LEADERSHIP.president, ...LEADERSHIP.vicePresidents]
  const allVacant = positions.every((p) => !p.holder)

  return (
    <section id="leadership" className={`section ${styles.section}`} aria-labelledby="leadership-title">
      <div className="container">
        <header className={styles.head}>
          {LEADERSHIP.term && (
            <p className={styles.term} data-reveal="rise">
              {l(LEADERSHIP.term)}
            </p>
          )}
          <h2 id="leadership-title" className="section-title" data-reveal="heading">
            {t.leadership.title}
          </h2>
          <p className={`section-lead ${styles.lead}`} data-reveal="rise">
          </p>
          {allVacant && (
            <p className={`preview-note ${styles.note}`} data-reveal="rise">
              <span className="status-dot" aria-hidden="true" />
              <span>
                <strong>{t.leadership.rosterStrong}</strong> {t.leadership.rosterBody}
              </span>
            </p>
          )}
        </header>

        <LeadershipTree />

        <div className={styles.cta} data-reveal="rise">
          <Link href={routes.leadership} className="btn btn--secondary">
            {t.leadership.viewStructure}
            <IconArrowRight className="btn__arrow" />
          </Link>
        </div>
      </div>
    </section>
  )
}
