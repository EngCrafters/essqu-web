import Link from 'next/link'
import { getI18n } from '@/lib/i18n/server'
import { IconArrowRight } from '@/components/ui/icons'
import { routes } from '@/lib/routes'
import styles from './JoinInvitation.module.css'

export async function JoinInvitation() {
  const { t } = await getI18n()
  return (
    <section id="join" className={styles.join} aria-labelledby="join-title">
      {/* The logo's four quadrant colours as a key: the page's closing signature. */}
      <div className={styles.key} aria-hidden="true" data-reveal="key">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className={`container ${styles.inner}`}>
        <h2 id="join-title" className={styles.title} data-reveal="heading">
          {t.join.title}
          <span className={styles.stop}>.</span>
        </h2>
        <div className={styles.aside} data-reveal="rise">
          <p className={styles.body}>{t.join.body}</p>
          <div className={styles.actions}>
            <Link href={routes.register} className="btn btn--on-dark">
              {t.join.join}
              <IconArrowRight className="btn__arrow" />
            </Link>
            <Link href={routes.events} className="btn btn--outline-dark">
              {t.join.exploreEvents}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
