'use client'

import Image from 'next/image'
import { useMemo, useState, type CSSProperties } from 'react'
import {
  ChipGroup,
  FilterSheet,
  ResultBar,
  SearchField,
  SelectField,
  Skeleton,
  StateMessage,
  previewState,
} from '@/components/discovery/Discovery'
import { matchesQuery, useQueryState } from '@/components/discovery/useQueryState'
import { useI18n } from '@/components/i18n/I18nProvider'
import { Modal } from '@/components/platform/Platform'
import { IconArrowRight } from '@/components/ui/icons'
import type { ActivityId } from '@/content/activities'
import { DISCIPLINES, DISCIPLINE_BY_ID, type DisciplineId } from '@/content/disciplines'
import { DISCIPLINE_COLOR } from '@/content/platform/taxonomy'
import type { ArchiveEntry } from '@/lib/data'
import { formatCount, formatMonthYear } from '@/lib/format'
import styles from './Activities.module.css'

const KEYS = ['q', 'category', 'year', 'discipline'] as const

export interface ActivityName {
  id: ActivityId
  nameEn: string
  nameAr: string
}

export function ArchiveExplorer({ entries, activities, state }: { entries: ArchiveEntry[]; activities: ActivityName[]; state?: string }) {
  const { t, l, locale, intl } = useI18n()
  const c = t.platform.activitiesPage
  const f = t.platform.filters
  const view = previewState(state)
  const { values, lists, set, toggle, clear, activeCount } = useQueryState(KEYS)
  const [openId, setOpenId] = useState<string | null>(null)
  const [photo, setPhoto] = useState(0)

  const actName = (id: ActivityId) => {
    const a = activities.find((x) => x.id === id)!
    return locale === 'ar' ? a.nameAr : a.nameEn
  }

  const data = view === 'empty' ? [] : entries
  const passes = (e: ArchiveEntry, skip?: (typeof KEYS)[number]) =>
    (skip === 'q' || matchesQuery(values.q, l(e.title), l(e.summary), actName(e.activity))) &&
    (skip === 'category' || lists.category.length === 0 || lists.category.includes(e.activity)) &&
    (skip === 'year' || lists.year.length === 0 || lists.year.includes(String(e.year))) &&
    (skip === 'discipline' || !values.discipline || e.disciplines.includes(values.discipline as DisciplineId))

  const shown = data.filter((e) => passes(e))
  const years = [...new Set(data.map((e) => e.year))].sort((a, b) => b - a)
  const byYear = years.map((y) => ({ year: y, items: shown.filter((e) => e.year === y) })).filter((g) => g.items.length)

  const categoryOptions = activities.map((a) => ({
    value: a.id,
    label: locale === 'ar' ? a.nameAr : a.nameEn,
    count: data.filter((e) => e.activity === a.id && passes(e, 'category')).length,
  }))
  const yearOptions = years.map((y) => ({ value: String(y), label: String(y), count: data.filter((e) => e.year === y && passes(e, 'year')).length }))
  const disciplineOptions = [{ value: '', label: f.any }, ...DISCIPLINES.map((d) => ({ value: d.id, label: l(d.shortName) }))]

  const active = [
    ...lists.category.map((v) => ({ key: `c${v}`, label: actName(v as ActivityId), onRemove: () => toggle('category', v) })),
    ...lists.year.map((v) => ({ key: `y${v}`, label: v, onRemove: () => toggle('year', v) })),
    ...(values.discipline
      ? [{ key: 'd', label: l(DISCIPLINE_BY_ID[values.discipline as DisciplineId]?.shortName ?? { en: '', ar: '' }), onRemove: () => set({ discipline: null }) }]
      : []),
    ...(values.q ? [{ key: 'q', label: `“${values.q}”`, onRemove: () => set({ q: null }) }] : []),
  ]

  const current = useMemo(() => entries.find((e) => e.id === openId) ?? null, [entries, openId])

  const filters = (layout: 'scroll' | 'wrap') => (
    <>
      <ChipGroup
        label={f.category}
        options={categoryOptions}
        selected={lists.category}
        onToggle={(v) => toggle('category', v)}
        allLabel={f.all}
        onAll={() => set({ category: null })}
        layout={layout}
      />
      <ChipGroup label={f.year} options={yearOptions} selected={lists.year} onToggle={(v) => toggle('year', v)} allLabel={f.all} onAll={() => set({ year: null })} layout={layout} />
      <SelectField label={f.discipline} value={values.discipline} onChange={(v) => set({ discipline: v || null })} options={disciplineOptions} />
    </>
  )

  return (
    <section id="archive" className={styles.archive} aria-label={c.archiveLabel}>
      <div className="container">
        <div className={styles.toolbar}>
          <SearchField value={values.q} onChange={(v) => set({ q: v || null })} placeholder={c.searchPlaceholder} label={c.searchLabel} className={styles.search} />
          <FilterSheet active={activeCount} shown={shown.length}>
            {filters('wrap')}
          </FilterSheet>
          <div className={styles.inlineFilters}>{filters('wrap')}</div>
        </div>
        <ResultBar shown={shown.length} total={data.length} active={active} onClearAll={() => clear()} />

        {view === 'loading' ? (
          <div className={styles.prints} aria-busy="true" aria-label={t.platform.states.loading}>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className={styles.print}>
                <Skeleton style={{ aspectRatio: i % 2 ? '4 / 3' : '3 / 4', width: '100%' }} />
                <Skeleton style={{ height: 14, width: '40%', marginTop: 12 }} />
                <Skeleton style={{ height: 20, width: '80%', marginTop: 8 }} />
              </div>
            ))}
          </div>
        ) : view === 'error' ? (
          <StateMessage
            kind="error"
            title={t.platform.states.errorTitle}
            body={t.platform.states.errorBody}
            action={
              <a href="?" className="btn btn--secondary">
                {t.platform.states.retry}
              </a>
            }
          />
        ) : data.length === 0 ? (
          <StateMessage kind="empty" title={c.emptyTitle} body={c.emptyBody} />
        ) : shown.length === 0 ? (
          <StateMessage
            kind="filtered"
            title={t.platform.states.filteredTitle}
            body={lists.category.length === 1 && data.every((e) => e.activity !== lists.category[0]) ? c.emptyActivity : t.platform.states.filteredBody}
            action={
              <button type="button" className="btn btn--secondary" onClick={() => clear()}>
                {f.clearAll}
              </button>
            }
          />
        ) : (
          byYear.map((g) => (
            <div key={g.year} className={styles.year}>
              <h2 className={styles.yearMark} data-reveal="heading">
                <span aria-hidden="true">{g.year}</span>
                <span className="visually-hidden">{g.year}</span>
              </h2>
              <ul className={styles.prints}>
                {g.items.map((e, i) => (
                  <li key={e.id} className={styles.print} style={{ '--tilt': `${((i * 37) % 5) - 2}deg` } as CSSProperties}>
                    <button
                      type="button"
                      className={styles.printButton}
                      onClick={() => {
                        setOpenId(e.id)
                        setPhoto(0)
                      }}
                    >
                      <span className={styles.printPhoto} style={{ aspectRatio: e.image.height > e.image.width ? '4 / 5' : `${e.image.width} / ${e.image.height}` }}>
                        <Image src={e.image.src} alt={l(e.image.alt)} fill sizes="(min-width: 64rem) 30vw, (min-width: 40rem) 45vw, 90vw" />
                        {e.gallery.length > 1 && <span className={styles.printCount}>{c.photos(e.gallery.length)}</span>}
                      </span>
                      <span className={styles.printCaption}>
                        <span className={styles.printMeta}>
                          <span>{formatMonthYear(e.date, intl)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{actName(e.activity)}</span>
                        </span>
                        <span className={styles.printTitle}>{l(e.title)}</span>
                        <span className={styles.printFoot}>
                          <span className={styles.keys} aria-hidden="true">
                            {e.disciplines.slice(0, 7).map((d) => (
                              <span key={d} style={{ '--key': DISCIPLINE_COLOR[d] } as CSSProperties} />
                            ))}
                          </span>
                          <span>
                            {e.attendance.kind === 'visitors'
                              ? c.visitors(formatCount(e.attendance.count, intl))
                              : c.attendees(formatCount(e.attendance.count, intl))}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      <Modal
        open={Boolean(current)}
        onClose={() => setOpenId(null)}
        title={current ? l(current.title) : ''}
        size="lg"
        eyebrow={current ? <span className="chip chip--sample">{t.platform.sample.tag}</span> : undefined}
      >
        {current && (
          <div className={styles.lightbox}>
            <div className={styles.lightboxStage}>
              <Image
                key={current.gallery[photo]!.src}
                src={current.gallery[photo]!.src}
                alt={l(current.gallery[photo]!.alt)}
                fill
                sizes="(min-width: 48rem) 42rem, 92vw"
                className={styles.lightboxImage}
              />
              {current.gallery.length > 1 && (
                <>
                  <button
                    type="button"
                    className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
                    onClick={() => setPhoto((p) => (p - 1 + current.gallery.length) % current.gallery.length)}
                    aria-label={c.previous}
                  >
                    <IconArrowRight />
                  </button>
                  <button
                    type="button"
                    className={`${styles.lightboxNav} ${styles.lightboxNext}`}
                    onClick={() => setPhoto((p) => (p + 1) % current.gallery.length)}
                    aria-label={c.next}
                  >
                    <IconArrowRight />
                  </button>
                  <span className={styles.lightboxCounter} aria-live="polite">
                    {c.photoOf(photo + 1, current.gallery.length)}
                  </span>
                </>
              )}
            </div>
            {current.gallery.length > 1 && (
              <ul className={styles.thumbs} aria-label={c.thumbs}>
                {current.gallery.map((g, i) => (
                  <li key={g.src}>
                    <button type="button" className={styles.thumb} aria-pressed={i === photo} onClick={() => setPhoto(i)} aria-label={c.photoOf(i + 1, current.gallery.length)}>
                      <Image src={g.src} alt="" fill sizes="80px" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <dl className={styles.lightboxFacts}>
              <div>
                <dt>{f.date}</dt>
                <dd>{formatMonthYear(current.date, intl)}</dd>
              </div>
              <div>
                <dt>{c.inActivity}</dt>
                <dd>{actName(current.activity)}</dd>
              </div>
              <div>
                <dt>{f.discipline}</dt>
                <dd className={styles.lightboxKeys}>
                  {current.disciplines.length === DISCIPLINES.length
                    ? t.platform.common.allDisciplines
                    : current.disciplines.map((d) => l(DISCIPLINE_BY_ID[d].shortName)).join(' · ')}
                </dd>
              </div>
            </dl>
            <p className={styles.lightboxSummary}>{l(current.summary)}</p>
            <p className="preview-note">
              <span className="status-dot" aria-hidden="true" />
              <span>{c.demoRecord}</span>
            </p>
          </div>
        )}
      </Modal>
    </section>
  )
}
