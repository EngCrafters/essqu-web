'use client'

import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { IconClose } from '@/components/ui/icons'
import type { DisciplineId } from '@/content/disciplines'
import { DISCIPLINE_COLOR } from '@/content/platform/taxonomy'
import type { Localized } from '@/lib/i18n'
import styles from './Platform.module.css'

const order = (i: number) => ({ '--i': i }) as CSSProperties

// ---------------------------------------------------------------- page hero

/**
 * The opening of a platform page. Every page brings its own centrepiece in `visual`; the
 * hero only sets the shared rhythm: eyebrow, title, lead, then the room's signature object.
 */
export function PlatformHero({
  eyebrow,
  title,
  lead,
  visual,
  layout = 'split',
  tone = 'paper',
  trail,
  children,
}: {
  /** Breadcrumbs, on pages below another page of the platform. */
  trail?: ReactNode
  eyebrow: string
  title: ReactNode
  lead?: ReactNode
  visual?: ReactNode
  layout?: 'split' | 'stack'
  tone?: 'paper' | 'surface' | 'blueprint'
  children?: ReactNode
}) {
  return (
    <header className={styles.hero} data-layout={layout} data-tone={tone}>
      <div className={`container ${styles.heroGrid}`}>
        <div className={styles.heroCopy}>
          {trail}
          <p className={`${styles.eyebrow} intro-item`} style={order(0)}>
            <span className={styles.eyebrowMark} aria-hidden="true" />
            {eyebrow}
          </p>
          <h1 className={`${styles.title} intro-item`} style={order(1)}>
            {title}
          </h1>
          {lead && (
            <div className={`${styles.lead} intro-item`} style={order(2)}>
              {lead}
            </div>
          )}
          {children && (
            <div className={`${styles.heroExtra} intro-item`} style={order(3)}>
              {children}
            </div>
          )}
        </div>
        {visual && <div className={styles.heroVisual}>{visual}</div>}
      </div>
    </header>
  )
}

// ---------------------------------------------------------------- sample notice

/** One quiet, honest notice per page instead of a "demo" tag on every card. */
export function SampleNotice({ className }: { className?: string }) {
  const { t } = useI18n()
  return (
    <p className={[styles.sample, className].filter(Boolean).join(' ')}>
      <span className="status-dot" aria-hidden="true" />
      <span>
        <strong>{t.platform.sample.strong}</strong> {t.platform.sample.body}
      </span>
    </p>
  )
}

// ---------------------------------------------------------------- modal

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  eyebrow?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg'
}) {
  const { t } = useI18n()
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      data-size={size}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {open && (
        <div className={styles.dialogPanel}>
          <div className={styles.dialogHead}>
            {eyebrow ?? <span />}
            <button type="button" className={styles.dialogClose} onClick={onClose}>
              <IconClose width={20} height={20} />
              <span className="visually-hidden">{t.common.close}</span>
            </button>
          </div>
          <h2 id={titleId} className={styles.dialogTitle}>
            {title}
          </h2>
          <div className={styles.dialogBody}>{children}</div>
          {footer && <div className={styles.dialogFoot}>{footer}</div>}
        </div>
      )}
    </dialog>
  )
}

// ---------------------------------------------------------------- status

export type StatusTone = 'open' | 'positive' | 'waiting' | 'neutral' | 'negative' | 'done'

export function StatusBadge({ tone, children, className }: { tone: StatusTone; children: ReactNode; className?: string }) {
  return (
    <span className={[styles.status, className].filter(Boolean).join(' ')} data-tone={tone}>
      <span className={styles.statusDot} aria-hidden="true" />
      {children}
    </span>
  )
}

// ---------------------------------------------------------------- monogram

/** A person without a photograph: their initials in the society's leaf frame, keyed by discipline. */
export function Monogram({
  name,
  discipline,
  size = 48,
  className,
}: {
  name: Localized
  discipline: DisciplineId
  size?: number
  className?: string
}) {
  const { locale } = useI18n()
  const parts = name[locale].replace(/\./g, '').split(/\s+/).filter(Boolean)
  const initials = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
  return (
    <span
      className={[styles.monogram, className].filter(Boolean).join(' ')}
      style={{ '--size': `${size}px`, '--key': DISCIPLINE_COLOR[discipline] } as CSSProperties}
      aria-hidden="true"
    >
      <span className={styles.monogramText}>{initials}</span>
    </span>
  )
}

// ---------------------------------------------------------------- gauge

/** Capacity as an instrument dial: the needle sweeps to the share of seats taken. */
export function Gauge({ value, max, label, sublabel }: { value: number; max: number; label: string; sublabel?: string }) {
  const ratio = Math.max(0, Math.min(1, max ? value / max : 0))
  const start = -210
  const sweep = 240
  const angle = start + sweep * ratio
  const arc = (from: number, to: number, r: number) => {
    const p = (a: number) => [60 + r * Math.cos((a * Math.PI) / 180), 60 + r * Math.sin((a * Math.PI) / 180)]
    const [x1, y1] = p(from)
    const [x2, y2] = p(to)
    return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
  }
  const ticks = Array.from({ length: 13 }, (_, i) => start + (sweep / 12) * i)
  return (
    <figure className={styles.gauge}>
      <svg viewBox="0 0 120 100" aria-hidden="true" focusable="false">
        <path d={arc(start, start + sweep, 46)} className={styles.gaugeTrack} />
        {ratio > 0 && <path d={arc(start, angle, 46)} className={styles.gaugeFill} data-full={ratio >= 1 || undefined} />}
        {ticks.map((a, i) => {
          const r1 = i % 3 === 0 ? 36 : 39
          const c = Math.cos((a * Math.PI) / 180)
          const s = Math.sin((a * Math.PI) / 180)
          const f = (n: number) => (60 + n).toFixed(2)
          return <line key={i} x1={f(r1 * c)} y1={f(r1 * s)} x2={f(42 * c)} y2={f(42 * s)} className={styles.gaugeTick} />
        })}
        <g className={styles.gaugeNeedle} style={{ '--angle': `${angle + 90}deg` } as CSSProperties}>
          <path d="M60 60L58.6 30h2.8z" />
          <circle cx="60" cy="60" r="4" />
        </g>
      </svg>
      <figcaption className={styles.gaugeCaption}>
        <span className={styles.gaugeValue}>{label}</span>
        {sublabel && <span className={styles.gaugeSub}>{sublabel}</span>}
      </figcaption>
    </figure>
  )
}

// ---------------------------------------------------------------- CAD title block

/** The title block of an engineering drawing sheet, used as metadata for exhibits. */
export function TitleBlock({ rows, className }: { rows: { label: string; value: ReactNode }[]; className?: string }) {
  return (
    <dl className={[styles.titleBlock, className].filter(Boolean).join(' ')}>
      {rows.map((r) => (
        <div key={r.label}>
          <dt>{r.label}</dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}

// ---------------------------------------------------------------- closing band

/** The closing invitation on platform pages: ink-blue drafting paper, one line, one or two actions. */
export function CtaBand({ title, body, children }: { title: string; body?: string; children: ReactNode }) {
  return (
    <section className={styles.cta} aria-label={title}>
      <div className={`container ${styles.ctaInner}`}>
        <div>
          <h2 className={styles.ctaTitle} data-reveal="heading">
            {title}
          </h2>
          {body && (
            <p className={styles.ctaBody} data-reveal="rise">
              {body}
            </p>
          )}
        </div>
        <div className={styles.ctaActions}>{children}</div>
      </div>
    </section>
  )
}
