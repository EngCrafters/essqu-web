'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { DisciplineSymbol } from '@/components/ui/DisciplineSymbol'
import { DISCIPLINE_BY_ID } from '@/content/disciplines'
import { DISCIPLINE_COLOR, SKILLS } from '@/content/platform/taxonomy'
import { REDUCED_MOTION_QUERY } from '@/lib/motion'
import { useMediaQuery } from '@/lib/useMediaQuery'
import card from './Register.module.css'
import styles from './MemberCard.module.css'

/** The sample member on the card: demonstration values only, nothing personal. */
const SAMPLE = { discipline: 'mechanical', year: 3, since: '2024-09-01T12:00:00+04:00', interests: ['cad', 'simulation'] } as const

/** How long each side rests before the card turns by itself, and how long a turn takes. */
const REST = { front: 5200, back: 3800 }
const TURN_MS = 1600
/** After the visitor turns the card, it waits this long before turning by itself again. */
const RESUME_MS = 14000

/**
 * The membership card, both sides of it: Ahmed S. (a sample member) on the front, "Coming
 * soon" on the back. It turns about its vertical axis, in perspective, lifting slightly as it
 * goes edge-on while its shadow narrows. It turns by itself at a calm pace while in view, and
 * on a click, a tap or the button beneath it. Each face hides its back, so no text is ever seen
 * mirrored. With reduced motion it stays still and the button shows the other side at once.
 */
export function MemberCardFlip() {
  const { t, l, intl } = useI18n()
  const c = t.platform.comingSoon.register
  const reduce = useMediaQuery(REDUCED_MOTION_QUERY, false)
  const [back, setBack] = useState(false)
  const [turns, setTurns] = useState(0)
  const [inView, setInView] = useState(false)
  const [held, setHeld] = useState(false)
  const [pausedUntil, setPausedUntil] = useState(0)
  const stage = useRef<HTMLDivElement>(null)

  const turn = useCallback((manual: boolean) => {
    setBack((b) => !b)
    setTurns((n) => n + 1)
    if (manual) setPausedUntil(Date.now() + RESUME_MS)
  }, [])

  useEffect(() => {
    const el = stage.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(Boolean(e?.isIntersecting)), { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // The calm, automatic turn: only in view, never under the pointer, never with reduced motion.
  useEffect(() => {
    if (reduce || !inView || held) return
    const wait = Math.max(back ? REST.back : REST.front, pausedUntil - Date.now())
    const id = window.setTimeout(() => turn(false), wait)
    return () => window.clearTimeout(id)
  }, [back, reduce, inView, held, pausedUntil, turn])

  const discipline = DISCIPLINE_BY_ID[SAMPLE.discipline]
  const lift = turns === 0 ? undefined : turns % 2 ? 'a' : 'b'

  return (
    <figure className={styles.figure}>
      <div ref={stage} className={styles.stage} style={{ '--turn': `${TURN_MS}ms` } as CSSProperties}>
        <p className={styles.dimWidth} aria-hidden="true">
          <span>
            <bdi dir="ltr">85.60</bdi> {c.mm}
          </span>
        </p>
        <p className={styles.dimHeight} aria-hidden="true">
          <span>
            <bdi dir="ltr">53.98</bdi> {c.mm}
          </span>
        </p>
        {/* A pointer shortcut for the button below, which is the control for keyboards and readers. */}
        <div
          className={styles.lift}
          data-lift={lift}
          onClick={() => turn(true)}
          onPointerEnter={(e) => e.pointerType === 'mouse' && setHeld(true)}
          onPointerLeave={() => setHeld(false)}
        >
          <div className={styles.flip} data-back={back || undefined}>
            {/* Front: the card as members will carry it, filled with sample details. */}
            <div
              className={`${card.card} ${styles.face}`}
              style={{ '--key': DISCIPLINE_COLOR[SAMPLE.discipline] } as CSSProperties}
              aria-hidden={back || undefined}
              aria-label={c.front}
              role="group"
            >
              <div className={`${card.cardTop} ${styles.top}`}>
                <span>{c.card}</span>
                <span className={card.cardFlag}>{c.sample}</span>
              </div>
              <div className={card.cardMain}>
                <span className={`${card.cardSymbol} ${styles.symbol}`}>
                  <DisciplineSymbol id={SAMPLE.discipline} />
                </span>
                <div className={card.cardWho}>
                  <span className={`${card.cardName} ${styles.name}`}>{l(c.name)}</span>
                  <span className={`${card.cardDiscipline} ${styles.discipline}`}>{l(discipline.name)}</span>
                </div>
              </div>
              <dl className={`${card.cardFacts} ${styles.facts}`}>
                <div>
                  <dt>{c.number}</dt>
                  <dd dir="ltr" className={styles.number}>
                    {c.numberValue}
                  </dd>
                </div>
                <div>
                  <dt>{c.year}</dt>
                  <dd>{t.platform.common.yearN(SAMPLE.year)}</dd>
                </div>
                <div>
                  <dt>{c.since}</dt>
                  <dd>{new Intl.DateTimeFormat(intl, { month: 'short', year: 'numeric', timeZone: 'Asia/Muscat' }).format(new Date(SAMPLE.since))}</dd>
                </div>
              </dl>
              <div className={`${card.cardInterests} ${styles.interests}`}>
                {SAMPLE.interests.map((s) => (
                  <span key={s}>{l(SKILLS[s])}</span>
                ))}
              </div>
              <div className={card.cardStripe} />
            </div>

            {/* Back: the same card turned over, with the news. */}
            <div className={`${card.card} ${styles.face} ${styles.back}`} aria-hidden={!back || undefined} aria-label={c.back} role="group">
              <span className={styles.band} aria-hidden="true" />
              <div className={styles.backMain}>
                <p className={styles.soon}>{c.backTitle}</p>
                <p className={styles.soonBody}>{c.backBody}</p>
              </div>
              <div className={styles.backFoot}>
                <span className={styles.seal}>
                  <Image src="/brand/es-emblem.webp" alt="" width={40} height={40} />
                </span>
                <span className={styles.backWho}>
                  <span className={styles.backSociety}>{c.society}</span>
                  <span className={styles.backUniversity}>{c.university}</span>
                </span>
              </div>
              <span className={styles.corners} aria-hidden="true" />
              <div className={`${card.cardStripe} ${styles.goldStripe}`} />
            </div>
          </div>
        </div>
        <span className={styles.shadow} data-lift={lift} aria-hidden="true" />
      </div>

      <div className={styles.controls}>
        <button type="button" className="btn btn--secondary btn--compact" aria-pressed={back} onClick={() => turn(true)}>
          <svg className={styles.turnIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 12a8 8 0 0 1 13.66-5.66L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.66 5.66L4 15.5M4 20v-4.5h4.5" />
          </svg>
          {c.turn}
        </button>
        <figcaption className={styles.caption}>
          {c.dimensions} · {c.sampleNote}
        </figcaption>
      </div>
    </figure>
  )
}
