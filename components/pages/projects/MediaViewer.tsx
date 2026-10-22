'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { SceneMount } from '@/components/three/SceneMount'
import { IconArrowRight } from '@/components/ui/icons'
import { Plate } from '@/components/ui/Plate'
import type { Project, ProjectMedia } from '@/content/platform/projects'
import { DISCIPLINE_COLOR } from '@/content/platform/taxonomy'
import { DESKTOP_QUERY } from '@/lib/motion'
import { useMediaQuery } from '@/lib/useMediaQuery'
import styles from './MediaViewer.module.css'

const BenchScene = dynamic(() => import('./BenchScene'), { ssr: false })

const subscribeNever = () => () => {}

/**
 * A project's media in one compact viewer: a primary viewport and a strip of thumbnails.
 * Photos, renders, drawings, videos and the interactive 3D model share it; the exploded-view
 * control appears only for models that genuinely have one. Arrow keys, swipes and the strip
 * move between items; full screen where the browser allows it.
 */
export function MediaViewer({
  project,
  items,
  tone = 'light',
  className,
}: {
  project: Project
  items: ProjectMedia[]
  tone?: 'light' | 'dark'
  className?: string
}) {
  const { t, l, dir } = useI18n()
  const c = t.platform.projectsPage
  const desktop = useMediaQuery(DESKTOP_QUERY, true)
  const canFullscreen = useSyncExternalStore(
    subscribeNever,
    () => Boolean(document.fullscreenEnabled),
    () => false,
  )
  const root = useRef<HTMLElement>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false)
  const [full, setFull] = useState(false)
  const [explode, setExplode] = useState(0)
  const explodeRef = useRef(0)
  const invalidateRef = useRef<(() => void) | null>(null)

  // A new project starts at its first item, assembled.
  const [lastSlug, setLastSlug] = useState(project.slug)
  if (lastSlug !== project.slug) {
    setLastSlug(project.slug)
    setIndex(0)
    setExplode(0)
    setStarted(false)
    setPlaying(false)
  }
  useEffect(() => {
    explodeRef.current = explode
    invalidateRef.current?.()
  }, [explode])

  const item = items[Math.min(index, items.length - 1)]
  const go = useCallback(
    (to: number) => {
      if (items.length === 0) return
      video.current?.pause()
      setStarted(false)
      setPlaying(false)
      setIndex((to + items.length) % items.length)
    },
    [items.length],
  )

  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === root.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const onKey = (e: KeyboardEvent) => {
    const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
    const back = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
    if (e.key === forward) go(index + 1)
    else if (e.key === back) go(index - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(items.length - 1)
    else return
    e.preventDefault()
  }

  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return
    swipe.current = { x: e.clientX, y: e.clientY }
  }
  const onUp = (e: PointerEvent) => {
    const s = swipe.current
    swipe.current = null
    if (!s) return
    const dx = e.clientX - s.x
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(e.clientY - s.y)) return
    // Swiping towards the reading start brings the next item.
    const next = dir === 'rtl' ? dx > 0 : dx < 0
    go(index + (next ? 1 : -1))
  }

  const toggleFull = () => {
    if (!root.current) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void root.current.requestFullscreen?.()
  }

  const accent = DISCIPLINE_COLOR[project.discipline]
  const model = project.model
  const kindLabel = (m: ProjectMedia) => c.mediaKinds[m.kind]

  if (!item) {
    return (
      <section className={[styles.viewer, className].filter(Boolean).join(' ')} data-tone={tone} aria-label={c.mediaLabel(l(project.title))}>
        <div className={styles.viewport}>
          <Plate id={`empty-${project.slug}`} drawing={project.drawing} tone="ivory" className={styles.sheet} />
        </div>
        <p className={styles.caption}>{l({ en: 'Project images have not been added yet.', ar: 'لم تُضَف صور المشروع بعد.' })}</p>
      </section>
    )
  }

  return (
    <section
      ref={root}
      className={[styles.viewer, className].filter(Boolean).join(' ')}
      data-tone={tone}
      data-full={full || undefined}
      aria-label={c.mediaLabel(l(project.title))}
      style={{ '--key': accent } as CSSProperties}
    >
      <div
        ref={viewport}
        className={styles.viewport}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label={`${kindLabel(item)}: ${l(item.caption)} (${c.mediaOf(index + 1, items.length)})`}
        onKeyDown={onKey}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={() => (swipe.current = null)}
      >
        {item.kind === 'model' && model ? (
          <SceneMount
            className={styles.fill}
            quality={desktop ? 'high' : 'low'}
            label={c.benchLabel(l(project.title))}
            fallback={<Plate id={`mv-${project.slug}`} drawing={project.drawing} tone="ivory" className={styles.sheet} />}
            render={(props) => <BenchScene {...props} model={model} accent={accent} explodeRef={explodeRef} invalidateRef={invalidateRef} surface={tone} />}
          />
        ) : item.kind === 'diagram' && item.drawing ? (
          <div className={styles.fill}>
            <Plate id={`mvd-${project.slug}-${index}`} drawing={item.drawing} tone="ivory" className={styles.sheet} />
          </div>
        ) : item.kind === 'video' && item.src ? (
          <div className={styles.fill}>
            <video
              key={item.src}
              ref={video}
              className={styles.video}
              src={item.src}
              poster={item.poster}
              playsInline
              preload="metadata"
              controls={started}
              onPlay={() => {
                setStarted(true)
                setPlaying(true)
              }}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
            />
            {!playing && !started && (
              <button
                type="button"
                className={styles.play}
                onClick={() => {
                  void video.current?.play()
                  // The button leaves once playing; keep keyboard navigation on the viewer.
                  viewport.current?.focus({ preventScroll: true })
                }}
                aria-label={c.play}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M8 5.5v13l11-6.5z" />
                </svg>
              </button>
            )}
          </div>
        ) : item.src ? (
          <div className={styles.fill}>
            <Image
              key={item.src}
              src={item.src}
              alt={item.alt ? l(item.alt) : ''}
              fill
              unoptimized={!project.sample}
              sizes="(min-width: 64rem) 50vw, 100vw"
              className={styles.photo}
            />
          </div>
        ) : null}

        {item.kind === 'model' && model && item.exploded && (
          <div className={styles.explode}>
            <label htmlFor={`explode-${project.slug}`} className="visually-hidden">
              {c.explodeLabel}
            </label>
            <span aria-hidden="true">{c.assembled}</span>
            <input
              id={`explode-${project.slug}`}
              type="range"
              min={0}
              max={100}
              value={Math.round(explode * 100)}
              onChange={(e) => setExplode(Number(e.target.value) / 100)}
              onPointerDown={(e) => e.stopPropagation()}
              aria-valuetext={`${c.explodeLabel}: ${Math.round(explode * 100)}%`}
              style={{ '--fill': `${explode * 100}%` } as CSSProperties}
            />
            <span aria-hidden="true">{c.exploded}</span>
          </div>
        )}

        {items.length > 1 && (
          <>
            <button type="button" className={`${styles.nav} ${styles.prev}`} onClick={() => go(index - 1)} aria-label={c.previousMedia}>
              <IconArrowRight />
            </button>
            <button type="button" className={`${styles.nav} ${styles.next}`} onClick={() => go(index + 1)} aria-label={c.nextMedia}>
              <IconArrowRight />
            </button>
          </>
        )}
        {canFullscreen && (
          <button type="button" className={styles.fullButton} onClick={toggleFull} aria-label={full ? c.exitFullscreen : c.fullscreen}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              {full ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
            </svg>
          </button>
        )}
      </div>

      <div className={styles.bar}>
        <p className={styles.caption} aria-live="polite">
          <span className={styles.kind}>{kindLabel(item)}</span>
          <span className={styles.captionText}>{l(item.caption)}</span>
          {item.illustrative && <span className={styles.illustrative}>{c.illustrative}</span>}
        </p>
        <span className={styles.counter}>{c.mediaOf(index + 1, items.length)}</span>
      </div>

      {items.length > 1 && (
        <ul className={styles.thumbs}>
          {items.map((m, i) => (
            <li key={i}>
              <button
                type="button"
                className={styles.thumb}
                aria-current={i === index || undefined}
                aria-label={`${kindLabel(m)}: ${l(m.caption)}`}
                onClick={() => go(i)}
              >
                {m.kind === 'photo' && m.src ? (
                  <Image src={m.src} alt="" fill unoptimized={!project.sample} sizes="96px" className={styles.photo} />
                ) : m.kind === 'video' && m.poster ? (
                  <Image src={m.poster} alt="" fill unoptimized={!project.sample} sizes="96px" className={styles.photo} />
                ) : (
                  <Plate id={`th-${project.slug}-${i}`} drawing={m.drawing ?? project.drawing} tone="ivory" className={styles.sheet} />
                )}
                <span className={styles.thumbKind} data-kind={m.kind} aria-hidden="true">
                  {m.kind === 'model' ? '3D' : m.kind === 'video' ? '▶' : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
