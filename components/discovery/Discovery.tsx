'use client'

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { IconClose } from '@/components/ui/icons'
import styles from './Discovery.module.css'

/* Shared discovery controls. Pages compose these into their own layouts (a console beside a
   laboratory, a rail above a timeline...), so the behaviour is shared but the rooms differ. */

// ---------------------------------------------------------------- search

export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
  className?: string
}) {
  const id = useId()
  const [draft, setDraft] = useState(value)
  const timer = useRef(0)
  // Typing stays instant; the URL is updated once the visitor pauses.
  useEffect(() => {
    // The URL can change from outside (Clear all); mirror it into the input.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(value)
  }, [value])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return (
    <div className={[styles.search, className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <svg className={styles.searchIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="M15.5 15.5L20 20" />
      </svg>
      <input
        id={id}
        type="search"
        className={styles.searchInput}
        value={draft}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
        onChange={(e) => {
          const next = e.target.value
          setDraft(next)
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => onChange(next), 180)
        }}
      />
      {draft && (
        <button
          type="button"
          className={styles.searchClear}
          aria-label={label}
          onClick={() => {
            setDraft('')
            onChange('')
          }}
        >
          <IconClose />
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- chips

export interface ChipOption {
  value: string
  label: string
  count?: number
  /** A colour key (discipline colours). */
  color?: string
  lang?: string
}

export function ChipGroup({
  label,
  options,
  selected,
  onToggle,
  allLabel,
  onAll,
  layout = 'wrap',
}: {
  label: string
  options: ChipOption[]
  selected: string[]
  onToggle: (value: string) => void
  /** When given, an "All" chip clears this group. */
  allLabel?: string
  onAll?: () => void
  layout?: 'wrap' | 'scroll' | 'stack'
}) {
  return (
    <div className={styles.group} role="group" aria-label={label}>
      <span className={styles.groupLabel} aria-hidden="true">
        {label}
      </span>
      <div className={styles.chips} data-layout={layout}>
        {allLabel && onAll && (
          <button type="button" className={styles.chip} aria-pressed={selected.length === 0} onClick={onAll}>
            {allLabel}
          </button>
        )}
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={styles.chip}
            aria-pressed={selected.includes(o.value)}
            onClick={() => onToggle(o.value)}
            lang={o.lang}
            style={o.color ? ({ '--key': o.color } as CSSProperties) : undefined}
            data-keyed={o.color ? '' : undefined}
          >
            {o.color && <span className={styles.key} aria-hidden="true" />}
            {o.label}
            {typeof o.count === 'number' && (
              <span className={styles.count} aria-hidden="true">
                {o.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- select

export function SelectField({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  className?: string
}) {
  const id = useId()
  return (
    <div className={[styles.select, className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className={styles.selectLabel}>
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// ---------------------------------------------------------------- active filters + count

export function ResultBar({
  shown,
  total,
  active,
  onClearAll,
  children,
}: {
  shown: number
  total: number
  active: { key: string; label: string; onRemove: () => void }[]
  onClearAll: () => void
  children?: ReactNode
}) {
  const { t } = useI18n()
  const f = t.platform.filters
  return (
    <div className={styles.resultBar}>
      <p className={styles.resultCount} aria-live="polite">
        <span className={styles.resultNumber}>{f.results(shown, total)}</span>
      </p>
      {active.length > 0 && (
        <ul className={styles.activeList}>
          {active.map((a) => (
            <li key={a.key}>
              <button type="button" className={styles.activeChip} onClick={a.onRemove} aria-label={f.remove(a.label)}>
                {a.label}
                <IconClose aria-hidden="true" />
              </button>
            </li>
          ))}
          <li>
            <button type="button" className={styles.clearAll} onClick={onClearAll}>
              {f.clearAll}
            </button>
          </li>
        </ul>
      )}
      {children}
    </div>
  )
}

// ---------------------------------------------------------------- mobile sheet

/**
 * The filters as a bottom sheet on small screens. The trigger shows how many filters are on;
 * the sheet's button shows how many results they leave. Desktop pages show the controls inline
 * and hide this trigger.
 */
export function FilterSheet({ active, shown, children }: { active: number; shown: number; children: ReactNode }) {
  const { t } = useI18n()
  const f = t.platform.filters
  const ref = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <>
      <button type="button" className={styles.sheetTrigger} onClick={() => setOpen(true)} aria-haspopup="dialog">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="10" cy="17" r="2" />
        </svg>
        {f.filters}
        {active > 0 && <span className={styles.sheetBadge}>{active}</span>}
      </button>
      <dialog
        ref={ref}
        className={styles.sheet}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === e.currentTarget && setOpen(false)}
      >
        {open && (
          <div className={styles.sheetPanel}>
            <div className={styles.sheetHead}>
              <span className={styles.sheetGrip} aria-hidden="true" />
              <h2 id={titleId} className={styles.sheetTitle}>
                {f.filters}
              </h2>
              <button type="button" className={styles.sheetClose} onClick={() => setOpen(false)} aria-label={f.close}>
                <IconClose />
              </button>
            </div>
            <div className={styles.sheetBody}>{children}</div>
            <div className={styles.sheetFoot}>
              <button type="button" className="btn btn--primary" onClick={() => setOpen(false)}>
                {f.apply(shown)}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  )
}

// ---------------------------------------------------------------- states

export type ViewState = 'ready' | 'loading' | 'error' | 'empty'

/** `?state=loading|error|empty` previews each data state, for design review and API work. */
export function previewState(value: string | string[] | undefined): ViewState {
  return value === 'loading' || value === 'error' || value === 'empty' ? value : 'ready'
}

export function StateMessage({
  kind,
  title,
  body,
  action,
}: {
  kind: 'empty' | 'filtered' | 'error'
  title: string
  body?: string
  action?: ReactNode
}) {
  return (
    <div className={styles.state} data-kind={kind} role={kind === 'error' ? 'alert' : 'status'}>
      <svg className={styles.stateArt} viewBox="0 0 160 110" aria-hidden="true" focusable="false">
        <defs>
          <pattern id={`grid-${kind}`} width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M10 0H0V10" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="160" height="110" fill={`url(#grid-${kind})`} className={styles.stateGrid} />
        {kind === 'filtered' && (
          <>
            <rect x="34" y="26" width="64" height="50" rx="4" className={styles.stateSheet} />
            <path d="M44 40h44M44 50h30M44 60h36" className={styles.stateLine} />
            <circle cx="102" cy="70" r="16" className={styles.stateLens} />
            <path d="M113 81l14 14" className={styles.stateHandle} />
          </>
        )}
        {kind === 'empty' && (
          <>
            <path d="M40 46h80v40H40z" className={styles.stateSheet} />
            <path d="M40 46l12-16h56l12 16" className={styles.stateLine} />
            <path d="M68 60h24" className={styles.stateHandle} />
          </>
        )}
        {kind === 'error' && (
          <>
            <path d="M24 55h38l8-12 10 24 8-12h48" className={styles.stateLine} />
            <circle cx="96" cy="55" r="5" className={styles.stateBreak} />
            <path d="M108 44l8 8M116 44l-8 8" className={styles.stateHandle} />
          </>
        )}
      </svg>
      <h2 className={styles.stateTitle}>{title}</h2>
      {body && <p className={styles.stateBody}>{body}</p>}
      {action}
    </div>
  )
}

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <span className={[styles.skeleton, className].filter(Boolean).join(' ')} style={style} aria-hidden="true" />
}
