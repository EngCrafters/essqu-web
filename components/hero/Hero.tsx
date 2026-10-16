import Link from 'next/link'
import type { CSSProperties } from 'react'
import { IconArrowRight } from '@/components/ui/icons'
import { getI18n } from '@/lib/i18n/server'
import { routes } from '@/lib/routes'
import { HeroArt } from './HeroArt'
import styles from './Hero.module.css'

const order = (i: number) => ({ '--i': i }) as CSSProperties

/**
 * On desktop the hero is one viewport taller than its sticky stage: the copy holds still
 * while the sculpture assembles, then native scrolling carries the whole stage away as
 * Events arrives. No scroll interception, and the actions stay usable throughout.
 */
export async function Hero() {
  const { t } = await getI18n()
  return (
    <section id="top" className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.stage}>
        <div className={`container ${styles.grid}`}>
          <div className={styles.copy}>
            <p className={`${styles.eyebrow} intro-item`} style={order(0)}>
              <span className={styles.eyebrowMark} aria-hidden="true" />
              {t.site.eyebrow}
            </p>
            <h1 id="hero-title" className={`${styles.title} intro-item`} style={order(1)}>
              <span className={styles.line}>{t.hero.titleStart}</span>{' '}
              <span className={styles.line}>
                {t.hero.titleEnd}
                <span className={styles.stop}>.</span>
              </span>
            </h1>
            <p className={`${styles.lead} intro-item`} style={order(2)}>
              {t.hero.lead}
            </p>
            <div className={`${styles.actions} intro-item`} style={order(3)}>
              <Link href={routes.events} className="btn btn--primary">
                {t.hero.exploreEvents}
                <IconArrowRight className="btn__arrow" />
              </Link>
              <Link href={routes.projects} className="btn btn--secondary">
                {t.hero.discoverProjects}
              </Link>
            </div>
          </div>
          <div className={styles.artColumn}>
            <HeroArt />
          </div>
        </div>
      </div>
    </section>
  )
}
