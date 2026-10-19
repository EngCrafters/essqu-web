'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import type { YearRecord } from '@/content/platform/record'
import { MOTION } from '@/lib/motion'
import styles from './About.module.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const KINDS = ['activities', 'projects'] as const
/** The axis names every fifth year; the readout names any year. */
const TICK_EVERY = 5
const GRID_STEP = 10

/**
 * The record as one time axis, from the founding year to today: a pair of columns per year
 * (activities, projects) on a shared scale. The readout above names the selected year; pointing,
 * dragging or the arrow keys move the selection. A table carries the same figures for screen
 * readers. Columns rise along the axis the first time the chart comes into view.
 */
export function RecordChart({ years, sample }: { years: YearRecord[]; sample: boolean }) {
  const { t, dir } = useI18n()
  const c = t.platform.aboutPage
  const root = useRef<HTMLElement>(null)
  const plot = useRef<HTMLDivElement>(null)
  const pressed = useRef(false)
  const last = years.length - 1
  const [index, setIndex] = useState(last)
  const selected = years[Math.min(index, last)]!

  const peak = Math.max(...years.map((y) => Math.max(y.activities, y.projects)))
  const max = Math.max(GRID_STEP, Math.ceil(peak / GRID_STEP) * GRID_STEP)
  const grid = Array.from({ length: max / GRID_STEP }, (_, i) => (i + 1) * GRID_STEP)
  const describe = (y: YearRecord) => `${c.recordLabel(y.year, y.activities, y.projects)}${y.toDate ? ` (${c.toDate})` : ''}`
  const select = (i: number) => setIndex(Math.min(last, Math.max(0, i)))

  const pick = (clientX: number) => {
    const el = plot.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const f = (clientX - r.left) / r.width
    select(Math.floor((dir === 'rtl' ? 1 - f : f) * years.length))
  }
  const onDown = (e: PointerEvent) => {
    pressed.current = true
    pick(e.clientX)
  }
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' || pressed.current) pick(e.clientX)
  }
  const onKey = (e: KeyboardEvent) => {
    // Later years lie towards the reading end: right in English, left in Arabic.
    const later = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
    const earlier = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
    const step: Record<string, number> = { [later]: 1, ArrowUp: 1, [earlier]: -1, ArrowDown: -1, PageUp: TICK_EVERY, PageDown: -TICK_EVERY }
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? last : e.key in step ? index + step[e.key]! : null
    if (to === null) return
    e.preventDefault()
    select(to)
  }

  useGSAP(
    () => {
      const el = root.current
      if (!el) return
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Like the page's other reveals: only what starts below the fold waits to be revealed.
        if (el.getBoundingClientRect().top < window.innerHeight * 0.85) return
        const q = gsap.utils.selector(el)
        gsap
          .timeline({ scrollTrigger: { trigger: el, start: MOTION.start, once: true }, defaults: { ease: MOTION.ease } })
          .from(q('[data-grid]'), { scaleX: 0, duration: MOTION.rule.duration, stagger: 0.08, clearProps: 'transform' }, 0)
          .from(q('[data-bar]'), { scaleY: 0, duration: 0.7, stagger: 0.012, clearProps: 'transform' }, 0.15)
          .from(q('[data-read]'), { opacity: 0, y: 10, duration: 0.55, clearProps: 'opacity,transform' }, 0.2)
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <figure ref={root} className={styles.record}>
      <div className={styles.recordHead}>
        <p className={styles.readout} data-read="" aria-hidden="true">
          <span className={styles.readYear}>
            {selected.year}
            <span className={styles.readNote}>{selected.toDate ? c.toDate : selected.founded ? c.founded : ''}</span>
          </span>
          {KINDS.map((k) => (
            <span key={k} className={styles.readItem} data-kind={k}>
              <span className={styles.readName}>{c[k]}</span>
              <span className={styles.readValue}>{selected[k]}</span>
            </span>
          ))}
        </p>
        <div className={styles.recordAside}>
          {sample && <span className="chip chip--sample">{c.sampleFigures}</span>}
          <span className={styles.recordHint}>{c.recordHint}</span>
        </div>
      </div>

      <div
        ref={plot}
        className={styles.plot}
        role="slider"
        tabIndex={0}
        aria-label={c.recordYear}
        aria-orientation="horizontal"
        aria-valuemin={years[0]!.year}
        aria-valuemax={years[last]!.year}
        aria-valuenow={selected.year}
        aria-valuetext={describe(selected)}
        onKeyDown={onKey}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={() => (pressed.current = false)}
        onPointerCancel={() => (pressed.current = false)}
        style={{ '--count': years.length } as CSSProperties}
      >
        {grid.map((v) => (
          <span key={v} className={styles.gridLine} data-grid="" style={{ '--at': v / max } as CSSProperties} aria-hidden="true">
            <span className={styles.gridValue}>{v}</span>
          </span>
        ))}
        <ol className={styles.cols} aria-hidden="true">
          {years.map((y, i) => (
            <li key={y.year} className={styles.col} data-selected={i === index || undefined} data-current={y.toDate || undefined}>
              {KINDS.map((k) => (
                <span key={k} className={styles.colBar} data-kind={k} data-bar="" style={{ '--h': y[k] / max } as CSSProperties} />
              ))}
              {(y.year % TICK_EVERY === 0 || y.founded) && (
                <>
                  <span className={styles.colTick} />
                  <span className={styles.colYear} data-edge={i === 0 ? 'start' : i === last ? 'end' : undefined}>
                    {y.year}
                    {y.founded && <span className={styles.colNote}>{c.founded}</span>}
                  </span>
                </>
              )}
            </li>
          ))}
        </ol>
      </div>

      {sample && <figcaption className={styles.recordsNote}>{c.sampleNote}</figcaption>}

      <table className="visually-hidden">
        <caption>{c.recordTable}</caption>
        <thead>
          <tr>
            <th scope="col">{c.recordYear}</th>
            <th scope="col">{c.activities}</th>
            <th scope="col">{c.projects}</th>
          </tr>
        </thead>
        <tbody>
          {years.map((y) => (
            <tr key={y.year}>
              <th scope="row">
                {y.year}
                {y.toDate ? ` (${c.toDate})` : ''}
              </th>
              <td>{y.activities}</td>
              <td>{y.projects}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
