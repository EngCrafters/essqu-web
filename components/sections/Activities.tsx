import Link from 'next/link'
import { ACTIVITIES } from '@/content/activities'
import { IconArrowRight } from '@/components/ui/icons'
import { getI18n } from '@/lib/i18n/server'
import { ActivityGalleries } from './ActivityGalleries'
import styles from './Activities.module.css'

/**
 * The society's six activities, each an automatic slideshow of its photographs. Dated,
 * upcoming events stay in the Events section.
 */
export async function Activities() {
  const { t } = await getI18n()

  return (
    <section id="activities" className={`section ${styles.section}`} aria-labelledby="activities-title">
      <div className="container">
        <header className="section-head">
          <h2 id="activities-title" className="section-title" data-reveal="heading">
            {t.activities.title}
          </h2>
          <div className={styles.headAside} data-reveal="rise">
            <p className="section-lead">{t.activities.lead}</p>
          </div>
        </header>

        <ActivityGalleries galleries={ACTIVITIES} />

        <div className={styles.cta} data-reveal="rise">
          <Link href="/activities" className="btn btn--primary">
            {t.activities.explorePrevious}
            <IconArrowRight className="btn__arrow" />
          </Link>
        </div>
      </div>
    </section>
  )
}
