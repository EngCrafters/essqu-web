import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import type { UpcomingModule } from '@/content/site'
import { IconArrowRight } from '@/components/ui/icons'
import { getI18n } from '@/lib/i18n/server'
import { routes } from '@/lib/routes'
import styles from './ComingSoon.module.css'

/** Trig differs in the last digits between server and browser; rounded values hydrate cleanly. */
const r2 = (n: number) => Math.round(n * 100) / 100

const SHEET_CODE: Record<UpcomingModule, string> = {
  projects: 'ES-PRJ-01',
  members: 'ES-MBR-01',
  network: 'ES-GRD-01',
  certificates: 'ES-CRT-01',
  register: 'ES-MEM-01',
}

/**
 * A module that is not open yet, presented as part of the platform rather than a gap in it:
 * the module's name, a plain "coming soon", what it will hold, and two ways onward. Beside it
 * sits the module's drawing sheet, still on the board: a line drawing with a little slow motion
 * (gears turning, nodes lighting, a dimension line ticking), a title block marked
 * "in preparation". `visual` replaces the sheet (the membership card on /register).
 */
export async function ComingSoon({
  module,
  eyebrow,
  title,
  lead,
  visual,
}: {
  module: UpcomingModule
  eyebrow?: string
  title?: string
  lead?: string
  visual?: ReactNode
}) {
  const { t } = await getI18n()
  const c = t.platform.comingSoon
  const m = c.modules[module]

  return (
    <section className={styles.page} data-module={module} aria-labelledby="soon-title">
      <div className={`container ${styles.grid}`}>
        <div className={styles.copy}>
          <p className={`${styles.eyebrow} intro-item`}>
            <span className={styles.eyebrowMark} aria-hidden="true" />
            {eyebrow ?? m.name}
          </p>
          <h1 id="soon-title" className={`${styles.title} intro-item`} style={{ '--i': 1 } as CSSProperties}>
            {title ?? c.title}
          </h1>
          <p className={`${styles.lead} intro-item`} style={{ '--i': 2 } as CSSProperties}>
            {lead ?? c.body}
          </p>
          {!lead && (
            <p className={`${styles.note} intro-item`} style={{ '--i': 2 } as CSSProperties}>
              {m.note}
            </p>
          )}
          <p className={`${styles.status} intro-item`} style={{ '--i': 3 } as CSSProperties}>
            <span className={styles.statusDot} aria-hidden="true" />
            {c.status}
          </p>
          <div className={`${styles.actions} intro-item`} style={{ '--i': 3 } as CSSProperties}>
            <Link href={routes.events} className="btn btn--primary">
              {c.explore}
              <IconArrowRight className="btn__arrow" />
            </Link>
            <Link href={routes.activities} className="btn btn--secondary">
              {c.archive}
            </Link>
          </div>
        </div>

        <div className={styles.visual}>
          {visual ?? (
            <figure className={styles.sheet} aria-label={c.sheetLabel(m.name)}>
              <svg className={styles.drawing} viewBox="0 0 400 300" aria-hidden="true" focusable="false">
                <defs>
                  <pattern id={`soon-grid-${module}`} width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M20 0H0V20" className={styles.gridLine} />
                  </pattern>
                </defs>
                <rect x="0" y="0" width="400" height="300" fill={`url(#soon-grid-${module})`} />
                <rect x="12" y="12" width="376" height="276" className={styles.frame} />
                {/* Registration marks in the corners. */}
                <path d="M24 34V24h10M366 24h10v10M376 266v10h-10M34 276H24v-10" className={styles.marks} />
                <Glyph module={module} />
              </svg>
              <span className={styles.scan} aria-hidden="true" />
              <dl className={styles.titleBlock}>
                <div>
                  <dt>{c.titleBlock.module}</dt>
                  <dd>{m.name}</dd>
                </div>
                <div>
                  <dt>{c.titleBlock.status}</dt>
                  <dd className={styles.blockStatus}>{c.status}</dd>
                </div>
                <div>
                  <dt>{c.titleBlock.sheet}</dt>
                  <dd dir="ltr">{SHEET_CODE[module]}</dd>
                </div>
              </dl>
            </figure>
          )}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- the module drawings

/** A spur gear as one outline: trapezoid teeth on a root circle. */
function gear(cx: number, cy: number, outer: number, root: number, teeth: number, phase = 0) {
  const step = (Math.PI * 2) / teeth
  const at = (r: number, a: number) => `${r2(cx + Math.cos(a) * r)} ${r2(cy + Math.sin(a) * r)}`
  const pts: string[] = []
  for (let i = 0; i < teeth; i++) {
    const a = phase + i * step
    pts.push(at(root, a - step * 0.3), at(outer, a - step * 0.16), at(outer, a + step * 0.16), at(root, a + step * 0.3))
  }
  return `M${pts.join('L')}Z`
}

/** The society's leaf frame (the monogram's shape): round on three corners, sharp at one. */
const leaf = (x: number, y: number, s: number) => `M${x - s} ${y + s}V${y}A${s} ${s} 0 0 1 ${x} ${y - s}A${s} ${s} 0 0 1 ${x + s} ${y}A${s} ${s} 0 0 1 ${x} ${y + s}Z`

const BIG = { cx: 168, cy: 142, outer: 66, root: 56, teeth: 14 }
const SMALL = { cx: 266, cy: 142, outer: 38, root: 29, teeth: 8 }
const NODES = [
  { x: 116, y: 96, s: 15 },
  { x: 198, y: 70, s: 13 },
  { x: 288, y: 104, s: 15 },
  { x: 140, y: 196, s: 13 },
  { x: 262, y: 198, s: 14 },
  { x: 204, y: 140, s: 19 },
]
const EDGES: [number, number][] = [
  [0, 5],
  [1, 5],
  [2, 5],
  [3, 5],
  [4, 5],
  [0, 1],
  [2, 4],
  [3, 4],
]
const DOTS = [
  [104, 186],
  [132, 150],
  [150, 186],
  [178, 112],
  [204, 150],
  [226, 112],
  [252, 186],
  [276, 150],
  [302, 112],
] as const
const STAR = Array.from({ length: 10 }, (_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 5
  const r = i % 2 ? 6 : 13
  return `${r2(200 + Math.cos(a) * r)} ${r2(178 + Math.sin(a) * r)}`
}).join('L')

function Glyph({ module }: { module: UpcomingModule }) {
  if (module === 'projects') {
    return (
      <g>
        <path d={`M${BIG.cx - 96} ${BIG.cy}H${SMALL.cx + 60}M${BIG.cx} ${BIG.cy - 90}V${BIG.cy + 90}M${SMALL.cx} ${SMALL.cy - 60}V${SMALL.cy + 60}`} className={styles.centre} />
        <g className={`${styles.spin} ${styles.slow}`} style={{ transformOrigin: `${BIG.cx}px ${BIG.cy}px` }}>
          <path d={gear(BIG.cx, BIG.cy, BIG.outer, BIG.root, BIG.teeth)} className={styles.ink} />
          <circle cx={BIG.cx} cy={BIG.cy} r="20" className={styles.ink} />
          <circle cx={BIG.cx} cy={BIG.cy} r="7" className={styles.accent} />
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} cx={r2(BIG.cx + Math.cos((i * Math.PI) / 2 + 0.6) * 37)} cy={r2(BIG.cy + Math.sin((i * Math.PI) / 2 + 0.6) * 37)} r="8" className={styles.thin} />
          ))}
        </g>
        <g className={`${styles.spin} ${styles.reverse}`} style={{ transformOrigin: `${SMALL.cx}px ${SMALL.cy}px` }}>
          <path d={gear(SMALL.cx, SMALL.cy, SMALL.outer, SMALL.root, SMALL.teeth, Math.PI / SMALL.teeth)} className={styles.ink} />
          <circle cx={SMALL.cx} cy={SMALL.cy} r="11" className={styles.ink} />
          <circle cx={SMALL.cx} cy={SMALL.cy} r="4" className={styles.accent} />
        </g>
        <path d={`M${BIG.cx} 50H${SMALL.cx}M${BIG.cx} 44v12M${SMALL.cx} 44v12`} className={styles.dimension} />
      </g>
    )
  }
  if (module === 'members') {
    return (
      <g>
        {EDGES.map(([a, b]) => (
          <line key={`${a}-${b}`} x1={NODES[a]!.x} y1={NODES[a]!.y} x2={NODES[b]!.x} y2={NODES[b]!.y} className={styles.link} />
        ))}
        {NODES.map((n, i) => (
          <path key={i} d={leaf(n.x, n.y, n.s)} className={`${i === 5 ? styles.inkFill : styles.ink} ${styles.node}`} style={{ '--n': i } as CSSProperties} />
        ))}
        <circle cx="204" cy="140" r="34" className={`${styles.construction} ${styles.spin} ${styles.slow}`} style={{ transformOrigin: '204px 140px' }} />
      </g>
    )
  }
  if (module === 'network') {
    return (
      <g>
        <path d="M80 70V222H330" className={styles.ink} />
        {[112, 150, 186].map((y) => (
          <line key={y} x1="80" x2="330" y1={y} y2={y} className={styles.thin} />
        ))}
        {[120, 170, 220, 270, 320].map((x) => (
          <line key={x} x1={x} x2={x} y1="222" y2="229" className={styles.ink} />
        ))}
        <path d="M104 186L132 150L178 112L226 112L276 150L302 112" className={styles.dimension} />
        {DOTS.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="6" className={`${styles.inkFill} ${styles.node}`} style={{ '--n': i } as CSSProperties} />
        ))}
        <circle cx="302" cy="112" r="15" className={`${styles.ring} ${styles.pulse}`} />
        <circle cx="302" cy="112" r="6" className={styles.accentFill} />
      </g>
    )
  }
  // certificates
  return (
    <g>
      <rect x="104" y="58" width="192" height="150" className={styles.ink} />
      <rect x="114" y="68" width="172" height="130" className={styles.thin} />
      <rect x="164" y="84" width="72" height="5" className={styles.accentFill} />
      <rect x="138" y="104" width="124" height="10" className={styles.inkFill} />
      <rect x="152" y="124" width="96" height="4" className={styles.soft} />
      <rect x="160" y="134" width="80" height="4" className={styles.soft} />
      <path d="M190 194l-8 30 10-6 8 9M210 194l8 30-10-6-8 9" className={styles.accent} />
      <circle cx="200" cy="178" r="20" className={styles.paperFill} />
      <circle cx="200" cy="178" r="20" className={styles.accent} />
      <g className={`${styles.spin} ${styles.slow}`} style={{ transformOrigin: '200px 178px' }}>
        <path d={`M${STAR}Z`} className={styles.accent} />
      </g>
      <path d="M104 236H296M104 230v12M296 230v12" className={styles.dimension} />
    </g>
  )
}
