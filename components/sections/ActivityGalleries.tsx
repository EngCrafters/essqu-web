'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useRef } from 'react'
import { slidesOf, type Activity } from '@/content/activities'
import { useI18n } from '@/components/i18n/I18nProvider'
import { DESKTOP_QUERY, FINE_POINTER_QUERY, MOTION } from '@/lib/motion'
import { SLIDE_MS, Slideshow } from './Slideshow'
import styles from './Activities.module.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

type Layout = 'wide' | 'wide-reverse' | 'pair'

const RATIO: Record<Layout, string> = { wide: '3 / 2', 'wide-reverse': '3 / 2', pair: '4 / 3' }
const SIZES: Record<Layout, string> = {
  wide: '(min-width: 64rem) 58vw, 100vw',
  'wide-reverse': '(min-width: 64rem) 58vw, 100vw',
  pair: '(min-width: 48rem) 46vw, 100vw',
}

/** Where each frame unmasks from: its outer edge (mirrored with the layout on the Arabic site). */
const FROM_START = 'inset(0% 100% 0% 0%)'
const FROM_END = 'inset(0% 0% 0% 100%)'
const MASK_FROM: Record<'ltr' | 'rtl', Record<Layout, string>> = {
  ltr: { wide: FROM_START, 'wide-reverse': FROM_END, pair: 'inset(100% 0% 0% 0%)' },
  rtl: { wide: FROM_END, 'wide-reverse': FROM_START, pair: 'inset(100% 0% 0% 0%)' },
}

const TILT_MAX = 2

/** The section's rhythm, unchanged: wide · pair · mirrored wide · pair. */
function toRows(galleries: Activity[]) {
  const rows: { layout: Layout; items: Activity[] }[] = []
  let i = 0
  let wide = 0
  while (i < galleries.length) {
    if (rows.length % 2 === 1 && i + 1 < galleries.length) {
      rows.push({ layout: 'pair', items: galleries.slice(i, i + 2) })
      i += 2
    } else {
      rows.push({ layout: wide % 2 === 0 ? 'wide' : 'wide-reverse', items: [galleries[i]] })
      wide += 1
      i += 1
    }
  }
  return rows
}

/**
 * The society's six activities, each an independent slideshow of its previous events,
 * staggered so no two change at once. On arrival each frame unmasks from its outer
 * edge with its accent line and text; the photographs carry a light scroll parallax (phones
 * included, at reduced travel) and, on fine-pointer desktops, a tilt of at most 2°.
 */
export function ActivityGalleries({ galleries }: { galleries: Activity[] }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const { dir, locale } = useI18n()
  const stagger = SLIDE_MS / galleries.length

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return
      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const threshold = window.innerHeight * 0.85
        gsap.utils.toArray<HTMLElement>('[data-activity]', root).forEach((item) => {
          if (item.getBoundingClientRect().top < threshold) return
          const mask = item.querySelector<HTMLElement>('[data-mask]')
          const tl = gsap.timeline({
            defaults: { ease: MOTION.ease },
            scrollTrigger: { trigger: item, start: 'top 82%', once: true },
          })
          if (mask) {
            tl.fromTo(
              mask,
              { clipPath: MASK_FROM[dir][(item.dataset.layout as Layout) ?? 'pair'] },
              { clipPath: 'inset(0% 0% 0% 0%)', duration: MOTION.mask.duration, clearProps: 'clipPath' },
              0,
            )
          }
          tl.from(item.querySelectorAll('[data-part="accent"]'), { scaleX: 0, duration: 0.6, clearProps: 'transform' }, 0.25).from(
            item.querySelectorAll('[data-part="text"]'),
            { opacity: 0, y: 14, duration: 0.6, stagger: MOTION.rise.stagger, clearProps: 'opacity,transform' },
            0.3,
          )
        })
      })

      // Depth inside each frame as it passes: full travel on desktop, a little less on phones.
      mm.add({ desktop: DESKTOP_QUERY, motion: '(prefers-reduced-motion: no-preference)' }, (ctx) => {
        const { desktop, motion } = ctx.conditions as Record<string, boolean>
        if (!motion) return
        const travel = desktop ? 14 : 9
        gsap.utils.toArray<HTMLElement>('[data-mask]', root).forEach((frame) => {
          gsap.fromTo(
            frame.querySelectorAll('[data-parallax]'),
            { y: -travel },
            { y: travel, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true } },
          )
        })
      })

      mm.add(`${DESKTOP_QUERY} and ${FINE_POINTER_QUERY} and (prefers-reduced-motion: no-preference)`, () => {
        const cleanups: (() => void)[] = []
        gsap.utils.toArray<HTMLElement>('[data-tilt]', root).forEach((host) => {
          const frame = host.querySelector<HTMLElement>('[data-mask]')
          if (!frame) return
          gsap.set(frame, { transformPerspective: 1000 })
          const rx = gsap.quickTo(frame, 'rotationX', { duration: 0.5, ease: MOTION.ease })
          const ry = gsap.quickTo(frame, 'rotationY', { duration: 0.5, ease: MOTION.ease })
          const onMove = (e: PointerEvent) => {
            const r = host.getBoundingClientRect()
            ry(((e.clientX - r.left) / r.width - 0.5) * TILT_MAX * 2)
            rx(-((e.clientY - r.top) / r.height - 0.5) * TILT_MAX * 2)
          }
          const onLeave = () => {
            rx(0)
            ry(0)
          }
          host.addEventListener('pointermove', onMove)
          host.addEventListener('pointerleave', onLeave)
          cleanups.push(() => {
            host.removeEventListener('pointermove', onMove)
            host.removeEventListener('pointerleave', onLeave)
            gsap.set(frame, { clearProps: 'transform' })
          })
        })
        return () => cleanups.forEach((fn) => fn())
      })

      return () => mm.revert()
    },
    { scope: rootRef, dependencies: [dir], revertOnUpdate: true },
  )

  let order = 0
  const feature = (gallery: Activity, layout: Layout) => {
    const delay = Math.round(order++ * stagger)
    const titleId = `activity-${gallery.id}-title`
    const name = locale === 'ar' ? gallery.nameAr : gallery.nameEn
    return (
      <article
        key={gallery.id}
        id={`activity-${gallery.id}`}
        className={styles.activity}
        data-layout={layout}
        data-activity=""
        aria-labelledby={titleId}
      >
        <div className={styles.media} data-tilt="">
          {/* The mask is the unmasking target and the tilting frame; the slideshow sits inside. */}
          <div className={styles.mask} data-mask="">
            <Slideshow
              id={gallery.id}
              label={name}
              events={slidesOf(gallery)}
              ratio={RATIO[layout]}
              sizes={SIZES[layout]}
              delay={delay}
            />
          </div>
        </div>
        <div className={styles.body}>
          <span className={styles.accent} data-part="accent" aria-hidden="true" />
          <h3 id={titleId} className={styles.categoryTitle} data-part="text">
            {name}
          </h3>
          {/* The English site also gives each activity's official Arabic name. */}
          {locale === 'en' && (
            <p className={styles.altName} lang="ar" dir="rtl" data-part="text">
              {gallery.nameAr}
            </p>
          )}
          <p className={styles.description} data-part="text">
            {gallery.description[locale]}
          </p>
        </div>
      </article>
    )
  }

  return (
    <div ref={rootRef} className={styles.list}>
      {toRows(galleries).map((row) =>
        row.layout === 'pair' ? (
          <div key={row.items[0].id} className={styles.pair}>
            {row.items.map((g) => feature(g, 'pair'))}
          </div>
        ) : (
          feature(row.items[0], row.layout)
        ),
      )}
    </div>
  )
}
