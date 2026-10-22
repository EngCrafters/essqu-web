'use client'

import { useMemo } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import styles from './CheckInPass.module.css'

/** A deterministic 32-bit hash, so the same pass always draws the same pattern. */
function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const N = 21

/** The module cells of the pattern, skipping the three finder corners. */
function pattern(code: string) {
  let seed = hash(code)
  const next = () => {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return (seed >>> 0) / 4294967296
  }
  const out: [number, number][] = []
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const nearFinder = (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9)
      if (!nearFinder && next() > 0.52) out.push([x, y])
    }
  return out
}

/**
 * A check-in pass preview. The square is a QR-style pattern drawn from the pass code; it is
 * deliberately not an encoded QR code, and the pass says so, because no real ticket exists.
 */
export function CheckInPass({ code, title, when }: { code: string; title: string; when: string }) {
  const { t } = useI18n()
  const c = t.platform.eventsPage
  const cells = useMemo(() => pattern(code), [code])

  const finderAt = (ox: number, oy: number) => (
    <g key={`${ox}${oy}`}>
      <rect x={ox} y={oy} width="7" height="7" className={styles.ink} />
      <rect x={ox + 1} y={oy + 1} width="5" height="5" className={styles.paper} />
      <rect x={ox + 2} y={oy + 2} width="3" height="3" className={styles.ink} />
    </g>
  )

  return (
    <figure className={styles.pass}>
      <div className={styles.passHead}>
        <span className={styles.passTitle}>{c.passTitle}</span>
        <span className={styles.passFlag}>{c.passPreview}</span>
      </div>
      <div className={styles.passBody}>
        <svg viewBox={`-2 -2 ${N + 4} ${N + 4}`} className={styles.code} role="img" aria-label={c.passPreview}>
          <rect x="-2" y="-2" width={N + 4} height={N + 4} className={styles.paper} />
          {finderAt(0, 0)}
          {finderAt(N - 7, 0)}
          {finderAt(0, N - 7)}
          {cells.map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" className={styles.ink} />
          ))}
        </svg>
        <dl className={styles.passFacts}>
          <div>
            <dt>{c.passEvent}</dt>
            <dd>{title}</dd>
          </div>
          <div>
            <dt>{c.date}</dt>
            <dd>{when}</dd>
          </div>
          <div>
            <dt>{c.passCode}</dt>
            <dd className={styles.passCode}>{code}</dd>
          </div>
        </dl>
      </div>
      <figcaption className={styles.passHint}>{c.passHint}</figcaption>
    </figure>
  )
}
