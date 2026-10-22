import Image from 'next/image'
import { DRAWINGS, type DrawingId } from './drawings'
import styles from './Plate.module.css'

export type { DrawingId }

/** A photograph with its alt text already in the page's language. */
export interface ResolvedImage {
  src: string
  alt: string
  focus?: string
}

type PlateTone = 'soft' | 'brand' | 'ivory'

interface PlateProps {
  /** Stable, unique id — used for the SVG grid pattern reference. */
  id: string
  drawing: DrawingId
  tone?: PlateTone
  className?: string
}

/**
 * A drawing sheet: one subject-specific technical drawing on a quiet grid. Illustrative only,
 * so it is hidden from assistive tech; the surrounding card carries all the information.
 * Motion hooks are layered so they never compete: the plate scales on hover (CSS), and the
 * inner drawing group takes scroll parallax (GSAP, `data-parallax`).
 */
export function Plate({ id, drawing, tone = 'soft', className }: PlateProps) {
  const patternId = `plate-grid-${id}`
  return (
    <div className={[styles.plate, styles[tone], className].filter(Boolean).join(' ')} aria-hidden="true">
      <svg className={styles.svg} viewBox="0 0 480 300" preserveAspectRatio="xMidYMid slice" focusable="false">
        <defs>
          <pattern id={patternId} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M24 0H0V24" className={styles.grid} />
          </pattern>
        </defs>
        <rect x="-40" y="-40" width="560" height="380" fill={`url(#${patternId})`} />
        <g className={styles.drawing} data-parallax="">
          {DRAWINGS[drawing]}
        </g>
      </svg>
    </div>
  )
}

/** Event and project imagery: an authentic photograph when supplied, otherwise its drawing. */
export function ItemMedia({
  id,
  drawing,
  image,
  tone,
  sizes,
  className,
  unoptimized,
}: PlateProps & { image?: ResolvedImage; sizes: string; unoptimized?: boolean }) {
  if (image) {
    return (
      <div className={[styles.plate, styles.photo, className].filter(Boolean).join(' ')}>
        <Image
          src={image.src}
          alt={image.alt}
          fill
          unoptimized={unoptimized}
          sizes={sizes}
          className={styles.photoImg}
          style={image.focus ? { objectPosition: image.focus } : undefined}
          data-parallax=""
        />
      </div>
    )
  }
  return <Plate id={id} drawing={drawing} tone={tone} className={className} />
}
