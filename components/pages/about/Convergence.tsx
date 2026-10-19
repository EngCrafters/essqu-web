'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Image from 'next/image'
import { useRef, type CSSProperties, type ReactNode } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { DisciplineSymbol } from '@/components/ui/DisciplineSymbol'
import { DISCIPLINES, type DisciplineId } from '@/content/disciplines'
import { DISCIPLINE_COLOR } from '@/content/platform/taxonomy'
import { DESKTOP_QUERY } from '@/lib/motion'
import styles from './About.module.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/*
 * The assembled composition. The stage is W units wide and H tall (one unit is 1% of its
 * width, in both directions), and the emblem, the primary object, sits at its centre. Around it
 * the disciplines settle on one orbit seen in perspective: the four drawn in the emblem itself
 * come to the front at full size, in the emblem's own left/right order, and the other three sit
 * behind it, smaller. The open upper corners are the composition's breathing room, so the
 * figure reads as arranged, not distributed.
 */
const W = 100
const H = 80
const CX = W / 2
const CY = H / 2
const ORBIT = { rx: 39, ry: 30 }
/** Emblem radius plus clear space: where each spoke stops. */
const EMBLEM_EDGE = 21
const PLACE: Record<DisciplineId, { angle: number; depth: number }> = {
  petroleum: { angle: 162, depth: 1 },
  electrical: { angle: 118, depth: 1 },
  mechanical: { angle: 62, depth: 1 },
  civil: { angle: 18, depth: 1 },
  chemical: { angle: 229, depth: 0.76 },
  mechatronics: { angle: 270, depth: 0.76 },
  industrial: { angle: 311, depth: 0.76 },
}
/** The scattered start: each discipline apart, roughly where it will land, on a wider orbit. */
const START = { rx: 45, ry: 35 }
const JITTER = [-16, 11, -9, 15, -13, 9, -15]
/** Real stroke lengths (no pathLength: Chrome scales a dash array by it but not a CSS dash offset). */
const RING_LENGTH = Math.PI * (3 * (ORBIT.rx + ORBIT.ry) - Math.sqrt((3 * ORBIT.rx + ORBIT.ry) * (ORBIT.rx + 3 * ORBIT.ry)))

/** Trig differs in the last digits between server and browser; rounded values hydrate cleanly. */
const r2 = (n: number) => Math.round(n * 100) / 100
const rad = (deg: number) => (deg * Math.PI) / 180

const TILES = DISCIPLINES.map((d, i) => {
  const { angle, depth } = PLACE[d.id]
  const x = CX + Math.cos(rad(angle)) * ORBIT.rx
  const y = CY + Math.sin(rad(angle)) * ORBIT.ry
  const s = rad(angle + JITTER[i]!)
  // The spoke runs from the tile's edge towards the emblem and stops short of it.
  const dx = CX - x
  const dy = CY - y
  const dist = Math.hypot(dx, dy)
  const ux = dx / dist
  const uy = dy / dist
  const from = 7.5 * depth
  const to = dist - EMBLEM_EDGE
  return {
    d,
    depth,
    x: r2(x),
    y: r2(y),
    sx: r2(CX + Math.cos(s) * START.rx),
    sy: r2(CY + Math.sin(s) * START.ry),
    spoke: { x1: r2(x + ux * from), y1: r2(y + uy * from), x2: r2(x + ux * to), y2: r2(y + uy * to) },
    spokeLength: r2(Math.max(0, to - from)),
  }
})

/**
 * The About page opening: the seven disciplines start apart, each its own system, and converge
 * on the society's emblem as the visitor scrolls. On desktop the stage holds still (sticky)
 * while the sequence plays; on phones it plays as the figure crosses the screen. Without
 * JavaScript or with reduced motion, the assembled composition is simply shown.
 */
export function Convergence({ children }: { children: ReactNode }) {
  const { t, l } = useI18n()
  const c = t.platform.aboutPage
  const root = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const el = root.current
      const st = stage.current
      if (!el || !st) return
      const mm = gsap.matchMedia()
      mm.add({ motion: '(prefers-reduced-motion: no-preference)', desktop: DESKTOP_QUERY }, (ctx) => {
        const { motion, desktop } = ctx.conditions as { motion: boolean; desktop: boolean }
        if (!motion) return
        el.dataset.sequence = desktop ? 'pinned' : 'inline'
        const q = gsap.utils.selector(st)
        // One unit is 1% of the stage's width, across and down.
        const size = () => st.offsetWidth
        // A staggered from() leaves later targets unrendered until they start, so the spokes'
        // starting state is set up front and the timeline draws them in with to().
        gsap.set(q('[data-spoke]'), { strokeDashoffset: (i: number) => TILES[i]!.spokeLength })
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: desktop
            ? { trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true }
            : { trigger: st, start: 'top 82%', end: 'bottom 62%', scrub: 0.6, invalidateOnRefresh: true },
        })
        q('[data-tile]').forEach((tile, i) => {
          const p = TILES[i]!
          tl.from(
            tile,
            {
              x: () => ((p.sx - p.x) / 100) * size(),
              y: () => ((p.sy - p.y) / 100) * size(),
              scale: 0.86,
              ease: 'power2.inOut',
              duration: 0.55,
            },
            i * 0.012,
          )
        })
        // Labels and the wide orbit belong to the scattered start; the assembled emblem drops them.
        tl.fromTo(q('[data-label]'), { opacity: 1 }, { opacity: 0, duration: 0.25 }, 0.12)
          .fromTo(q('[data-orbit]'), { opacity: 1 }, { opacity: 0, duration: 0.35 }, 0.05)
          .from(q('[data-ring]'), { strokeDashoffset: RING_LENGTH, duration: 0.4 }, 0.32)
          .to(q('[data-spoke]'), { strokeDashoffset: 0, duration: 0.25, stagger: 0.02 }, 0.45)
          .from(q('[data-emblem]'), { opacity: 0, scale: 0.55, duration: 0.3, ease: 'power2.out' }, 0.55)
          // The caption sits under the stage, outside its selector's scope.
          .from(el.querySelector('[data-caption]'), { opacity: 0, y: 14, duration: 0.15 }, 0.82)
          .to({}, { duration: 0.08 })
        requestAnimationFrame(() => ScrollTrigger.refresh())
        return () => {
          delete el.dataset.sequence
        }
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <section ref={root} className={styles.convergence} aria-labelledby="about-title">
      <div className={styles.convergenceSticky}>
        <div className={`container ${styles.convergenceGrid}`}>
          <div className={styles.convergenceCopy}>{children}</div>
          <figure className={styles.stageFigure}>
            <div ref={stage} className={styles.stage} role="img" aria-label={c.convergenceLabel}>
              <svg className={styles.geometry} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
                <ellipse cx={CX} cy={CY} rx={START.rx} ry={START.ry} className={styles.orbit} data-orbit="" />
                <ellipse cx={CX} cy={CY} rx={ORBIT.rx} ry={ORBIT.ry} className={styles.ring} data-ring="" strokeDasharray={RING_LENGTH} />
                {TILES.map((p) => (
                  <line key={p.d.id} {...p.spoke} className={styles.spoke} data-spoke="" strokeDasharray={p.spokeLength} />
                ))}
                <path d={`M${CX - 3} ${CY}h6M${CX} ${CY - 3}v6`} className={styles.cross} />
              </svg>
              <div className={styles.emblem} data-emblem="">
                <Image src="/brand/es-emblem.webp" alt="" width={240} height={240} sizes="(min-width: 64rem) 180px, 30vw" />
              </div>
              {TILES.map((p) => (
                <div
                  key={p.d.id}
                  className={styles.tile}
                  style={{ left: `${r2((p.x / W) * 100)}%`, top: `${r2((p.y / H) * 100)}%`, '--key': DISCIPLINE_COLOR[p.d.id], '--depth': p.depth } as CSSProperties}
                  data-tile=""
                  data-back={p.depth < 1 || undefined}
                >
                  <DisciplineSymbol id={p.d.id} className={styles.tileSymbol} />
                  <span className={styles.tileLabel} data-label="">
                    {l(p.d.shortName)}
                  </span>
                </div>
              ))}
            </div>
            <figcaption className={styles.stageCaption} data-caption="">
              <span className={styles.stageCaptionMark} aria-hidden="true" />
              {c.emblemCaption}
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}
