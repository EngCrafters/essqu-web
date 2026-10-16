'use client'

import { Component, useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from 'react'
import { REDUCED_MOTION_QUERY } from '@/lib/motion'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { hasWebGL, prefersSaveData } from '@/lib/webgl'
import styles from './SceneMount.module.css'

/*
 * The platform's one rule for 3D: a page's centrepiece is a designed drawing first. The WebGL
 * scene loads only when the frame nears the viewport and the main thread is idle, renders on
 * demand, pauses offscreen or in a hidden tab, and crossfades over the drawing once its first
 * frame is ready. No WebGL, Save-Data or a failed context leave the drawing in place.
 * Reduced motion keeps the scene but stills it: poses change, nothing travels.
 */

const subscribeNever = () => () => {}

class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

function whenIdle(cb: () => void) {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(cb, { timeout: 900 })
    return () => window.cancelIdleCallback(id)
  }
  const id = window.setTimeout(cb, 120)
  return () => window.clearTimeout(id)
}

export interface SceneProps {
  /** Whether the canvas is on screen and the tab is visible; scenes stop requesting frames otherwise. */
  activeRef: RefObject<boolean>
  /** Reduced motion: the scene shows poses without travelling between them. */
  still: boolean
  /** Lighter geometry, no shadows and a lower pixel ratio on phones and tablets. */
  quality: 'high' | 'low'
  onReady: () => void
  onError: () => void
}

export function SceneMount({
  fallback,
  render,
  className,
  quality,
  label,
}: {
  /** The designed drawing shown before, beneath and instead of the live scene. */
  fallback: ReactNode
  render: (props: SceneProps) => ReactNode
  className?: string
  quality: 'high' | 'low'
  /** Accessible description of what the scene shows (the canvas itself is decorative). */
  label?: string
}) {
  const [el, setEl] = useState<HTMLDivElement | null>(null)
  const [near, setNear] = useState(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  // One failure (a lost context, a chunk that didn't load) earns one fresh attempt before the
  // drawing takes over for good.
  const [attempt, setAttempt] = useState(0)
  const activeRef = useRef(false)
  const still = useMediaQuery(REDUCED_MOTION_QUERY, false)
  const capable = useSyncExternalStore(subscribeNever, () => hasWebGL() && !prefersSaveData(), () => true)
  const enabled = capable && !failed

  useEffect(() => {
    if (!el || !enabled) return
    let cancelIdle: (() => void) | null = null
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        io.disconnect()
        cancelIdle = whenIdle(() => setNear(true))
      },
      { rootMargin: '320px 0px' },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelIdle?.()
    }
  }, [el, enabled])

  useEffect(() => {
    if (!el) return
    let inView = false
    const update = () => {
      activeRef.current = inView && document.visibilityState === 'visible'
    }
    const io = new IntersectionObserver(([entry]) => {
      inView = Boolean(entry?.isIntersecting)
      update()
    })
    io.observe(el)
    document.addEventListener('visibilitychange', update)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', update)
    }
  }, [el])

  const onReady = useCallback(() => setReady(true), [])
  const onError = useCallback(() => {
    setReady(false)
    setAttempt((a) => {
      if (a >= 1) setFailed(true)
      return a + 1
    })
  }, [])
  const state = !enabled ? 'fallback' : ready ? 'live' : 'loading'

  return (
    <div ref={setEl} className={[styles.mount, className].filter(Boolean).join(' ')} data-state={state} role={label ? 'img' : undefined} aria-label={label}>
      <div className={styles.fallback} aria-hidden={label ? true : undefined}>
        {fallback}
      </div>
      {enabled && near && (
        <div key={attempt} className={styles.canvas} aria-hidden="true">
          <SceneBoundary onError={onError}>{render({ activeRef, still, quality, onReady, onError })}</SceneBoundary>
        </div>
      )}
    </div>
  )
}
