'use client'

import Link from 'next/link'
import { useState, type CSSProperties } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { DisciplineSymbol } from '@/components/ui/DisciplineSymbol'
import { DISCIPLINES, DISCIPLINE_BY_ID, type DisciplineId } from '@/content/disciplines'
import { DISCIPLINE_COLOR } from '@/content/platform/taxonomy'
import type { Localized } from '@/lib/i18n'
import styles from './Disciplines.module.css'

export interface DisciplineLink {
  a: DisciplineId
  b: DisciplineId
  projects: { slug: string; title: Localized }[]
}

const SIZE = 420
const C = SIZE / 2
const R = 150

const point = (i: number) => {
  const a = (i / 7) * Math.PI * 2 - Math.PI / 2
  // Rounded: trig differs in the last digits between server and browser.
  return { x: Math.round((C + Math.cos(a) * R) * 100) / 100, y: Math.round((C + Math.sin(a) * R) * 100) / 100 }
}

/**
 * A network of the seven disciplines, drawn from the sample projects they share. Choosing a
 * discipline traces its links and lists the projects behind each one.
 */
export function DisciplineLinks({ links }: { links: DisciplineLink[] }) {
  const { t, l } = useI18n()
  const c = t.platform.disciplinesPage
  const [selected, setSelected] = useState<DisciplineId | null>(null)
  const index = Object.fromEntries(DISCIPLINES.map((d, i) => [d.id, i])) as Record<DisciplineId, number>
  const mine = selected ? links.filter((k) => k.a === selected || k.b === selected) : []

  return (
    <section className={`section ${styles.meet}`} aria-labelledby="meet-title">
      <div className="container">
        <div className={styles.meetHead}>
          <h2 id="meet-title" className="section-title" data-reveal="heading">
            {c.meetTitle}
          </h2>
          <p className="section-lead" data-reveal="rise">
            {c.meetLead}
          </p>
        </div>
        <div className={styles.meetGrid}>
          <div className={styles.network} data-selected={selected ?? undefined}>
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={styles.networkSvg} aria-hidden="true" focusable="false">
              <circle cx={C} cy={C} r={R} className={styles.networkOrbit} />
              {links.map((k) => {
                const p = point(index[k.a])
                const q = point(index[k.b])
                const on = selected === k.a || selected === k.b
                const color = selected ? DISCIPLINE_COLOR[selected] : 'var(--text-secondary)'
                return (
                  <path
                    key={`${k.a}-${k.b}`}
                    d={`M${p.x} ${p.y}Q${C + (p.x + q.x - 2 * C) * 0.18} ${C + (p.y + q.y - 2 * C) * 0.18} ${q.x} ${q.y}`}
                    className={styles.networkLink}
                    data-on={on || undefined}
                    data-dim={(selected && !on) || undefined}
                    style={{ strokeWidth: 1 + k.projects.length * 1.4, '--link': color } as CSSProperties}
                  />
                )
              })}
            </svg>
            {DISCIPLINES.map((d, i) => {
              const p = point(i)
              return (
                <button
                  key={d.id}
                  type="button"
                  className={styles.node}
                  style={{ left: `${(p.x / SIZE) * 100}%`, top: `${(p.y / SIZE) * 100}%`, '--key': DISCIPLINE_COLOR[d.id] } as CSSProperties}
                  aria-pressed={selected === d.id}
                  onClick={() => setSelected((s) => (s === d.id ? null : d.id))}
                >
                  <DisciplineSymbol id={d.id} className={styles.nodeSymbol} />
                  <span className={styles.nodeName}>{l(d.shortName)}</span>
                </button>
              )
            })}
          </div>

          <div className={styles.meetPanel} aria-live="polite">
            {selected ? (
              <>
                <p className={styles.meetPanelEyebrow} style={{ '--key': DISCIPLINE_COLOR[selected] } as CSSProperties}>
                  <span className={styles.chapterKey} aria-hidden="true" />
                  {l(DISCIPLINE_BY_ID[selected].name)}
                </p>
                {mine.length === 0 ? (
                  <p className={styles.meetEmpty}>{c.meetEmpty}</p>
                ) : (
                  <ul className={styles.meetList}>
                    {mine.map((k) => {
                      const other = k.a === selected ? k.b : k.a
                      return (
                        <li key={other} style={{ '--key': DISCIPLINE_COLOR[other] } as CSSProperties}>
                          <p className={styles.meetWith}>
                            <span className={styles.chapterKey} aria-hidden="true" />
                            {l(DISCIPLINE_BY_ID[other].shortName)}
                            <span className={styles.meetCount}>{c.meetShared(k.projects.length)}</span>
                          </p>
                          <ul className={styles.meetProjects}>
                            {k.projects.map((p) => (
                              <li key={p.slug}>
                                <Link href={`/projects/${p.slug}`} className={styles.meetProject}>
                                  {l(p.title)}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </li>
                      )
                    })}
                  </ul>
                )}
                <button type="button" className={styles.meetReset} onClick={() => setSelected(null)}>
                  {c.meetAll}
                </button>
              </>
            ) : (
              <ul className={styles.meetSummary}>
                {[...links]
                  .sort((x, y) => y.projects.length - x.projects.length)
                  .map((k) => (
                    <li key={`${k.a}-${k.b}`}>
                      <span className={styles.meetPair}>
                        <span className={styles.chapterKey} style={{ '--key': DISCIPLINE_COLOR[k.a] } as CSSProperties} aria-hidden="true" />
                        {l(DISCIPLINE_BY_ID[k.a].shortName)}
                        <span aria-hidden="true">×</span>
                        <span className={styles.chapterKey} style={{ '--key': DISCIPLINE_COLOR[k.b] } as CSSProperties} aria-hidden="true" />
                        {l(DISCIPLINE_BY_ID[k.b].shortName)}
                      </span>
                      <span className={styles.meetCount}>{c.meetShared(k.projects.length)}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
