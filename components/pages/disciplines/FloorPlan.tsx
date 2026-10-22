import Link from 'next/link'
import type { CSSProperties } from 'react'
import { DISCIPLINES } from '@/content/disciplines'
import { DISCIPLINE_COLOR } from '@/content/platform/taxonomy'
import { getI18n } from '@/lib/i18n/server'
import styles from './Disciplines.module.css'

const CX = 280
const CY = 206
const R = 118

/**
 * The hall as an architect would draw it: walls in section, the entrance and its door swing,
 * and the turntable with its seven plinths. Each plinth is a link to its exhibit below; the
 * legend carries the names so the drawing never has to fit long labels.
 */
export async function FloorPlan() {
  const { t, l } = await getI18n()
  const c = t.platform.disciplinesPage
  const bays = DISCIPLINES.map((d, i) => {
    const a = (i / 7) * Math.PI * 2
    return { d, i, x: CX + Math.sin(a) * R, y: CY + Math.cos(a) * R }
  })
  return (
    <figure className={`${styles.plan} intro-item`} style={{ '--i': 2 } as CSSProperties}>
      <svg viewBox="0 0 560 420" className={styles.planSvg} role="group" aria-label={c.planLabel}>
        <defs>
          <pattern id="plan-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 0V6" className={styles.planHatchLine} />
          </pattern>
        </defs>
        {/* Walls in section, broken by the entrance. */}
        <path d="M40 30H520V390H330V378H508V42H52V378H230V390H40Z" className={styles.planWallFill} />
        <path d="M40 30H520V390H330M230 390H40V30" className={styles.planWall} />
        <path d="M52 42H508V378H330M230 378H52V42" className={styles.planWallInner} />
        <path d="M330 378V390M230 378V390" className={styles.planWallInner} />
        <path d="M230 390a100 100 0 0 1 100-100" className={styles.planDoor} />
        <path d="M230 390V290" className={styles.planDoorLeaf} />
        {/* Dimension line across the hall. */}
        <path d="M40 14H520M40 8V20M520 8V20" className={styles.planDim} />
        {/* The turntable and its plinths. */}
        <circle cx={CX} cy={CY} r={R + 34} className={styles.planTable} />
        <circle cx={CX} cy={CY} r={R - 40} className={styles.planCore} />
        <path d={`M${CX - 8} ${CY}h16M${CX} ${CY - 8}v16`} className={styles.planDim} />
        <path d={`M${CX} ${CY + R + 50}v28`} className={styles.planAxis} />
        {bays.map(({ d, i, x, y }) => (
          <Link key={d.id} href={`#${d.id}`} className={styles.planBay} style={{ '--key': DISCIPLINE_COLOR[d.id] } as CSSProperties}>
            <title>{`${c.exhibit(i + 1)} · ${l(d.shortName)}`}</title>
            <circle cx={x} cy={y} r="27" className={styles.planPlinth} />
            <circle cx={x} cy={y} r="27" className={styles.planRing} />
            <text x={x} y={y} className={styles.planNumber} dominantBaseline="central" textAnchor="middle">
              {String(i + 1).padStart(2, '0')}
            </text>
          </Link>
        ))}
        {/* North point and scale. */}
        <g transform="translate(486 70)" className={styles.planNorth}>
          <circle r="14" />
          <path d="M0 -10L5 6L0 2L-5 6Z" />
        </g>
        <path d="M70 360h80M70 355v10M110 357v6M150 355v10" className={styles.planDim} />
      </svg>
      <figcaption className={styles.planLegend}>
        <span className="visually-hidden">{c.planHint}</span>
        <ol>
          {DISCIPLINES.map((d, i) => (
            <li key={d.id} style={{ '--key': DISCIPLINE_COLOR[d.id] } as CSSProperties}>
              <Link href={`#${d.id}`} className={styles.planLegendLink}>
                <span className={styles.planLegendNo}>{String(i + 1).padStart(2, '0')}</span>
                {l(d.shortName)}
              </Link>
            </li>
          ))}
        </ol>
      </figcaption>
    </figure>
  )
}
