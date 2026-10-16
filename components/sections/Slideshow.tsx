'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import type { GallerySlide } from '@/content/activities'
import { useI18n } from '@/components/i18n/I18nProvider'
import { IconCalendar, IconPause, IconPlay, IconTeam } from '@/components/ui/icons'
import { formatCount, formatPartialDate } from '@/lib/format'
import { REDUCED_MOTION_QUERY } from '@/lib/motion'
import styles from './Slideshow.module.css'

/** How long each event stays on screen, and how long the crossfade between two takes. */
export const SLIDE_MS = 6000
const SWIPE_MIN = 44
const TOUCH_RESUME_MS = 1800

const noop = () => () => {}
const subscribeReduced = (cb: () => void) => {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

type Holds = { hover: boolean; focus: boolean; touch: boolean; offscreen: boolean }

/**
 * One activity's previous events as an automatic slideshow.
 *
 * - Timing lives in CSS: a progress line fills over SLIDE_MS and its `animationend` advances
 *   the slide, so pausing is simply `animation-play-state: paused` and the line, the slow zoom
 *   and the timer always agree.
 * - No blank frames: the outgoing slide stays opaque underneath while the next fades in on top.
 * - Pauses while it is deliberately being used (pointer over it, keyboard focus inside, a finger
 *   on it) and while it is off screen; resumes afterwards. The play/pause button holds it.
 * - Touch: a horizontal swipe changes slide; `touch-action: pan-y` keeps vertical scrolling
 *   native, so the page never feels stuck.
 * - Reduced motion: no autoplay and no zoom; the dots and arrow keys still work.
 */
export function Slideshow({
  id,
  label,
  events,
  ratio,
  sizes,
  delay,
}: {
  id: string
  /** The activity's name, for the carousel's accessible label. */
  label: string
  events: GallerySlide[]
  /** CSS aspect-ratio of the frame, e.g. '3 / 2'. */
  ratio: string
  sizes: string
  /** Start offset (ms) so neighbouring slideshows never change at the same moment. */
  delay: number
}) {
  const { t, l, intl, dir } = useI18n()
  const count = events.length
  const rootRef = useRef<HTMLDivElement>(null)
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null)
  const touchTimer = useRef(0)

  const client = useSyncExternalStore(noop, () => true, () => false)
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED_MOTION_QUERY).matches, () => false)
  const [state, setState] = useState({ index: 0, prev: -1, turn: 0 })
  const [holds, setHolds] = useState<Holds>({ hover: false, focus: false, touch: false, offscreen: true })
  const [held, setHeld] = useState(false)

  const autoplay = client && !reduced && count > 1
  const paused = !autoplay || held || holds.hover || holds.focus || holds.touch || holds.offscreen
  const hold = (key: keyof Holds, value: boolean) => setHolds((h) => (h[key] === value ? h : { ...h, [key]: value }))

  const go = useCallback(
    (target: number) =>
      setState((s) => {
        const index = ((target % count) + count) % count
        return index === s.index ? s : { index, prev: s.index, turn: s.turn + 1 }
      }),
    [count],
  )
  const step = useCallback((delta: number) => setState((s) => {
    const index = (((s.index + delta) % count) + count) % count
    return { index, prev: s.index, turn: s.turn + 1 }
  }), [count])

  // Off screen, nothing runs.
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => hold('offscreen', !entry?.isIntersecting), { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => () => window.clearTimeout(touchTimer.current), [])

  // Safety net: the progress line's `animationend` drives the clock, but if that event is ever
  // missed (throttled tabs, starved frames) a running slideshow must not get stuck. The timer
  // restarts on every slide change and every pause, so in normal use the line always wins.
  const { turn: currentTurn } = state
  useEffect(() => {
    if (paused) return
    const id = window.setTimeout(() => step(1), SLIDE_MS + (currentTurn === 0 ? delay : 0) + 2000)
    return () => window.clearTimeout(id)
  }, [paused, currentTurn, delay, step])

  // The swipe direction follows the reading direction.
  const forward = dir === 'rtl' ? 1 : -1
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return
    window.clearTimeout(touchTimer.current)
    hold('touch', true)
    swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
  }
  const endTouch = (e: React.PointerEvent, cancelled: boolean) => {
    if (e.pointerType === 'mouse') return
    const start = swipe.current
    swipe.current = null
    if (start && !cancelled && start.id === e.pointerId) {
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.3) step(Math.sign(dx) === forward ? 1 : -1)
    }
    touchTimer.current = window.setTimeout(() => hold('touch', false), TOUCH_RESUME_MS)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const toEnd = (e.key === 'ArrowRight') === (dir === 'ltr')
    step(toEnd ? 1 : -1)
  }

  const pad = (n: number) => String(n).padStart(2, '0')
  const { index, prev, turn } = state

  return (
    <div
      ref={rootRef}
      className={styles.slideshow}
      data-gallery={id}
      data-index={index}
      data-paused={paused || undefined}
      data-autoplay={autoplay || undefined}
      onPointerEnter={(e) => e.pointerType === 'mouse' && hold('hover', true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && hold('hover', false)}
      onFocus={(e) => (e.target as HTMLElement).matches(':focus-visible') && hold('focus', true)}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node | null)) hold('focus', false)
      }}
    >
      <div
        className={styles.frame}
        style={{ aspectRatio: ratio } as CSSProperties}
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerUp={(e) => endTouch(e, false)}
        onPointerCancel={(e) => endTouch(e, true)}
      >
        <div className={styles.slides} aria-live={paused ? 'polite' : 'off'}>
          {events.map((event, i) => {
            const active = i === index
            const shown = event.attendance ? formatCount(event.attendance.count, intl) : ''
            return (
              <figure
                key={event.id}
                className={styles.slide}
                data-state={active ? 'active' : i === prev ? 'leaving' : undefined}
                data-kb={i % 3}
                role="group"
                aria-roledescription="slide"
                aria-label={t.activities.slideOf(i + 1, count)}
                aria-hidden={!active}
              >
                <div className={styles.media} data-parallax="">
                  <div className={styles.zoom}>
                    <Image
                      src={event.image.src}
                      alt={l(event.image.alt)}
                      fill
                      sizes={sizes}
                      quality={90}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      className={styles.photo}
                      style={event.image.focus ? { objectPosition: event.image.focus } : undefined}
                    />
                  </div>
                </div>
                <figcaption className={styles.caption}>
                  <h4 className={styles.title}>{l(event.title)}</h4>
                  {(event.date || event.attendance) && (
                    <div className={styles.meta}>
                      {event.date && (
                        <span className={styles.metaItem}>
                          <IconCalendar className={styles.metaIcon} />
                          <span className="visually-hidden">{t.activities.date}: </span>
                          <time dateTime={event.date}>{formatPartialDate(event.date, intl)}</time>
                        </span>
                      )}
                      {event.attendance && (
                        <span className={styles.metaItem}>
                          <IconTeam className={styles.metaIcon} />
                          <span className="visually-hidden">{t.activities.attendance}: </span>
                          {event.attendance.kind === 'visitors'
                            ? t.activities.visitors(event.attendance.count, shown)
                            : t.activities.attendees(event.attendance.count, shown)}
                        </span>
                      )}
                    </div>
                  )}
                </figcaption>
              </figure>
            )
          })}
        </div>
        {autoplay && (
          <span className={styles.progress} aria-hidden="true">
            <span
              key={turn}
              className={styles.progressFill}
              style={{ animationDuration: `${SLIDE_MS}ms`, animationDelay: turn === 0 ? `${delay}ms` : '0ms' }}
              onAnimationEnd={() => step(1)}
            />
          </span>
        )}
      </div>

      <div className={styles.controls}>
        <div className={styles.dots}>
          {events.map((event, i) => (
            <button
              key={event.id}
              type="button"
              className={styles.dot}
              aria-label={t.activities.showSlide(i + 1, l(event.title))}
              aria-current={i === index || undefined}
              onClick={() => go(i)}
            >
              <span aria-hidden="true" />
            </button>
          ))}
        </div>
        <span className={styles.counter} aria-hidden="true" dir="ltr">
          {pad(index + 1)} / {pad(count)}
        </span>
        {autoplay || held ? (
          <button
            type="button"
            className={styles.toggle}
            aria-label={held ? t.activities.play : t.activities.pause}
            onClick={() => setHeld((h) => !h)}
          >
            {held ? <IconPlay /> : <IconPause />}
          </button>
        ) : null}
      </div>
    </div>
  )
}
