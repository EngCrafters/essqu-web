'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { SceneMount } from '@/components/three/SceneMount'
import type { ModelId } from '@/components/three/models'
import { DisciplineSymbol } from '@/components/ui/DisciplineSymbol'
import { IconArrowRight } from '@/components/ui/icons'
import { DISCIPLINES, DISCIPLINE_BY_ID, type DisciplineId } from '@/content/disciplines'
import { DISCIPLINE_COLOR } from '@/content/platform/taxonomy'
import { DESKTOP_QUERY } from '@/lib/motion'
import { useMediaQuery } from '@/lib/useMediaQuery'
import styles from './Disciplines.module.css'

const ExhibitScene = dynamic(() => import('./ExhibitScene'), { ssr: false })

const desktopNow = () => window.matchMedia(DESKTOP_QUERY).matches

export const EXHIBIT_MODEL: Record<DisciplineId, ModelId> = {
  mechanical: 'gears',
  electrical: 'pcb',
  civil: 'frame',
  petroleum: 'derrick',
  chemical: 'reactor',
  mechatronics: 'arm',
  industrial: 'conveyor',
}

const MODELS = DISCIPLINES.map((d) => EXHIBIT_MODEL[d.id])
const ACCENTS = DISCIPLINES.map((d) => DISCIPLINE_COLOR[d.id])

export interface DisciplineCounts {
  projects: number
  /** Absent until Core publishes an event's disciplines; the line is left out meanwhile. */
  events?: number
  members: number
}

/** The drawing beneath the scene: the exhibit's symbol on a sheet, with its plinth in section. */
function ExhibitDrawing({ id, index }: { id: DisciplineId; index: number }) {
  const { t, l } = useI18n()
  const c = t.platform.disciplinesPage
  return (
    <div className={styles.drawing} style={{ '--key': DISCIPLINE_COLOR[id] } as CSSProperties}>
      <svg className={styles.drawingGrid} viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <pattern id="exhibit-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" />
          </pattern>
        </defs>
        <rect width="400" height="400" fill="url(#exhibit-grid)" />
        <ellipse cx="200" cy="318" rx="128" ry="22" className={styles.drawingPlinth} />
        <path d="M72 318v22h256v-22" className={styles.drawingPlinth} />
        <path d="M60 360h280M60 354v12M340 354v12" className={styles.drawingDim} />
      </svg>
      <DisciplineSymbol id={id} className={styles.drawingSymbol} />
      <p className={styles.drawingCaption}>
        <span>{c.exhibit(index + 1)}</span>
        <span>{l(DISCIPLINE_BY_ID[id].shortName)}</span>
      </p>
    </div>
  )
}

export function DisciplinesExhibit({ counts }: { counts: Record<DisciplineId, DisciplineCounts> }) {
  const { t, l } = useI18n()
  const c = t.platform.disciplinesPage
  const desktop = useMediaQuery(DESKTOP_QUERY, true)
  const [active, setActive] = useState(0)
  const chapters = useRef<(HTMLElement | null)[]>([])

  // The exhibit in the reading line is the one on the turntable. On phones the stage sits on
  // top, so the reading line is lower, in the middle of the text below it.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index))
        })
      },
      { rootMargin: desktop ? '-48% 0px -48% 0px' : '-60% 0px -38% 0px' },
    )
    chapters.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [desktop])

  // A discipline in the address (/disciplines#civil, from a label anywhere on the site, or the
  // floor plan above) turns its exhibit at once, and its chapter is brought to the reading
  // line once the page's layout has settled.
  useEffect(() => {
    const target = () => DISCIPLINES.findIndex((d) => d.id === decodeURIComponent(window.location.hash.slice(1)))
    const settle = (i: number) => {
      const el = chapters.current[i]
      if (!el) return
      const r = el.getBoundingClientRect()
      const line = window.innerHeight * (desktopNow() ? 0.5 : 0.62)
      if (r.top > line || r.bottom < line) el.scrollIntoView({ behavior: 'auto', block: 'center' })
    }
    const arrive = () => {
      const i = target()
      if (i < 0) return
      setActive(i)
      // Fonts, images and the scroll-linked sections above can still move things on arrival.
      const timers = [120, 600].map((ms) => window.setTimeout(() => settle(i), ms))
      return () => timers.forEach(clearTimeout)
    }
    const undo = arrive()
    const onHash = () => {
      const i = target()
      if (i >= 0) setActive(i)
    }
    window.addEventListener('hashchange', onHash)
    return () => {
      undo?.()
      window.removeEventListener('hashchange', onHash)
    }
  }, [])

  const go = useCallback((i: number) => {
    const el = chapters.current[(i + 7) % 7]
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
  }, [])

  const current = DISCIPLINES[active]!

  return (
    <section className={styles.hall} aria-label={c.exhibitsLabel}>
      <div className={`container ${styles.hallGrid}`}>
        <div className={styles.stageCol}>
          <div className={styles.stage} style={{ '--key': DISCIPLINE_COLOR[current.id] } as CSSProperties}>
            <SceneMount
              className={styles.scene}
              quality={desktop ? 'high' : 'low'}
              label={c.stageLabel(l(current.name))}
              fallback={<ExhibitDrawing id={current.id} index={active} />}
              render={(props) => <ExhibitScene {...props} active={active} models={MODELS} accents={ACCENTS} />}
            />
            <div className={styles.hud}>
              <p className={styles.hudLabel} aria-live="polite">
                <span className={styles.hudKey} aria-hidden="true" />
                <span className={styles.hudIndex}>
                  {c.exhibit(active + 1)} <span className={styles.hudOf}>{c.ofSeven}</span>
                </span>
                <span className={styles.hudName}>{l(current.shortName)}</span>
              </p>
              <div className={styles.hudNav}>
                <button type="button" className={styles.hudButton} onClick={() => go(active - 1)} aria-label={c.previous}>
                  <IconArrowRight className={styles.flip} />
                </button>
                <button type="button" className={styles.hudButton} onClick={() => go(active + 1)} aria-label={c.next}>
                  <IconArrowRight />
                </button>
              </div>
            </div>
            <p className={styles.dragHint} aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M4 12h16M7 9l-3 3 3 3M17 9l3 3-3 3" />
              </svg>
              {c.dragHint}
            </p>
          </div>
        </div>

        <ol className={styles.chapters}>
          {DISCIPLINES.map((d, i) => {
            const n = counts[d.id]
            return (
              <li
                key={d.id}
                id={d.id}
                ref={(el) => {
                  chapters.current[i] = el
                }}
                data-index={i}
                data-active={i === active || undefined}
                className={styles.chapter}
                style={{ '--key': DISCIPLINE_COLOR[d.id] } as CSSProperties}
              >
                <p className={styles.chapterIndex}>
                  <span className={styles.chapterKey} aria-hidden="true" />
                  {c.exhibit(i + 1)}
                </p>
                <h2 className={styles.chapterTitle}>{l(d.name)}</h2>
                <p className={styles.chapterFocus}>{l(d.focus)}</p>
                <p className={styles.chapterBody}>{l(d.description)}</p>
                <div className={styles.label}>
                  <DisciplineSymbol id={d.id} className={styles.labelSymbol} />
                  <div className={styles.areas}>
                    <p className={styles.labelName}>{c.areasTitle}</p>
                    <ul className={styles.areaList}>
                      {c.areas[d.id].map((area) => (
                        <li key={area}>{area}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <ul className={styles.ledger} aria-label={c.inSociety}>
                  <li>
                    <Link href={`/projects?discipline=${d.id}`} className={styles.ledgerLink}>
                      {c.projects(n.projects)}
                      <IconArrowRight className="btn__arrow" />
                    </Link>
                  </li>
                  {n.events !== undefined && (
                    <li>
                      <Link href={`/events?discipline=${d.id}`} className={styles.ledgerLink}>
                        {c.events(n.events)}
                        <IconArrowRight className="btn__arrow" />
                      </Link>
                    </li>
                  )}
                  <li>
                    <Link href={`/members?discipline=${d.id}`} className={styles.ledgerLink}>
                      {c.members(n.members)}
                      <IconArrowRight className="btn__arrow" />
                    </Link>
                  </li>
                </ul>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
