'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Link from 'next/link'
import { useRef, useState, type CSSProperties } from 'react'
import { ChipGroup, FilterSheet, ResultBar, SearchField, Skeleton, StateMessage, previewState } from '@/components/discovery/Discovery'
import { matchesQuery, useQueryState } from '@/components/discovery/useQueryState'
import { useI18n } from '@/components/i18n/I18nProvider'
import { useDemoSession } from '@/components/platform/DemoSession'
import { StatusBadge } from '@/components/platform/Platform'
import { STATUS_TONE, eventStatus, isPast, myRegistration, seatsTaken } from '@/components/platform/registration'
import { ItemMedia } from '@/components/ui/Plate'
import { DISCIPLINES, DISCIPLINE_BY_ID, type DisciplineId } from '@/content/disciplines'
import type { EventView, PlatformEventType } from '@/content/platform/events'
import { DISCIPLINE_COLOR } from '@/content/platform/taxonomy'
import { DEMO_NOW } from '@/lib/data/clock'
import { eventDateParts, eventTimesIsolated, omanMonthKey } from '@/lib/format'
import styles from './Events.module.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const KEYS = ['q', 'type', 'discipline', 'when'] as const
const TYPES: PlatformEventType[] = ['workshop', 'talk', 'site-visit', 'competition', 'seminar', 'exhibition']
const monthKey = omanMonthKey

/** Past events shown before "Show earlier events" folds the rest away. */
const PAST_VISIBLE = 2

/**
 * The events timeline: one vertical line through the society's year. What has happened sits
 * above (the oldest folded away), a gold marker sets today on the line, and what comes next
 * runs below it, the nearest event marked. The line fills as the visitor reads down, a small
 * light riding its front, and each event's node lights as the line reaches it.
 *
 * `now` is the server's "today" (the prototype's fixed date for sample events, the real time for
 * events from the Core platform). Filters and card details an event list has no data for (Core
 * publishes no type, disciplines or seat counts) are left out rather than shown empty.
 */
export function EventsTimeline({ events, held, state, now = DEMO_NOW }: { events: EventView[]; held: string[]; state?: string; now?: string }) {
  const { t, l, intl } = useI18n()
  const c = t.platform.eventsPage
  const f = t.platform.filters
  const view = previewState(state)
  const session = useDemoSession()
  const { values, lists, set, toggle, clear, activeCount } = useQueryState(KEYS)
  const root = useRef<HTMLDivElement>(null)
  const [showAllPast, setShowAllPast] = useState(false)

  const data = view === 'empty' ? [] : events
  const passes = (e: EventView, skip?: (typeof KEYS)[number]) => {
    const past = isPast(e, now)
    return (
      (skip === 'q' || matchesQuery(values.q, l(e.title), l(e.summary), e.location ? l(e.location) : undefined)) &&
      (skip === 'type' || lists.type.length === 0 || (e.type !== undefined && lists.type.includes(e.type))) &&
      (skip === 'discipline' || lists.discipline.length === 0 || e.disciplines.some((d) => lists.discipline.includes(d))) &&
      (skip === 'when' ||
        lists.when.length === 0 ||
        (lists.when.includes('upcoming') && !past) ||
        (lists.when.includes('past') && past) ||
        (lists.when.includes('month') && monthKey(e.start) === monthKey(now)))
    )
  }
  const shown = data.filter((e) => passes(e))
  const upcoming = shown.filter((e) => !isPast(e, now)).sort((a, b) => a.start.localeCompare(b.start))
  const past = shown.filter((e) => isPast(e, now)).sort((a, b) => a.start.localeCompare(b.start))
  // The oldest past events fold away unless the visitor is looking for them.
  const foldable = !showAllPast && !values.q && !lists.when.includes('past') && past.length > PAST_VISIBLE + 1
  const pastShown = foldable ? past.slice(-PAST_VISIBLE) : past
  const folded = past.length - pastShown.length
  const nextSlug = upcoming[0]?.slug

  const count = (pred: (e: EventView) => boolean, skip: (typeof KEYS)[number]) => data.filter((e) => pred(e) && passes(e, skip)).length
  // Judged on the whole list (not the filtered or previewed one), so a filter never vanishes
  // while it is in use; only a list that carries no such data at all goes without the filter.
  const hasTypes = events.some((e) => e.type !== undefined)
  const hasDisciplines = events.some((e) => e.disciplines.length > 0)
  const typeOptions = TYPES.filter((ty) => data.some((e) => e.type === ty)).map((ty) => ({
    value: ty,
    label: t.platform.eventTypes[ty],
    count: count((e) => e.type === ty, 'type'),
  }))
  const disciplineOptions = DISCIPLINES.map((d) => ({
    value: d.id,
    label: l(d.shortName),
    color: DISCIPLINE_COLOR[d.id],
    count: count((e) => e.disciplines.includes(d.id), 'discipline'),
  }))
  const whenOptions = (['upcoming', 'month', 'past'] as const).map((w) => ({ value: w, label: c.whenOptions[w] }))

  const active = [
    ...lists.when.map((v) => ({ key: `w${v}`, label: c.whenOptions[v as keyof typeof c.whenOptions] ?? v, onRemove: () => toggle('when', v) })),
    ...lists.type.map((v) => ({ key: `t${v}`, label: t.platform.eventTypes[v as PlatformEventType] ?? v, onRemove: () => toggle('type', v) })),
    ...lists.discipline.map((v) => ({ key: `d${v}`, label: l(DISCIPLINE_BY_ID[v as DisciplineId]?.shortName ?? { en: v, ar: v }), onRemove: () => toggle('discipline', v) })),
    ...(values.q ? [{ key: 'q', label: `“${values.q}”`, onRemove: () => set({ q: null }) }] : []),
  ]

  // The line fills to the reading position (65% down the viewport) and nodes light as it
  // reaches them. Without motion the line is drawn and every node lit.
  useGSAP(
    () => {
      const el = root.current
      if (!el) return
      const nodes = gsap.utils.toArray<HTMLElement>(el.querySelectorAll('[data-node]'))
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const line = ScrollTrigger.create({
          trigger: el,
          start: 'top 65%',
          end: 'bottom 65%',
          onUpdate: (self) => {
            el.style.setProperty('--progress', self.progress.toFixed(4))
            el.style.setProperty('--head', self.progress > 0.002 && self.progress < 0.998 ? '1' : '0')
          },
        })
        const lights = nodes.map((node) =>
          ScrollTrigger.create({
            trigger: node,
            start: 'top 65%',
            onToggle: (self) => {
              if (self.isActive || self.progress === 1) node.dataset.lit = ''
              else delete node.dataset.lit
            },
          }),
        )
        return () => {
          line.kill()
          lights.forEach((s) => s.kill())
          el.style.removeProperty('--progress')
          el.style.removeProperty('--head')
          nodes.forEach((n) => delete n.dataset.lit)
        }
      })
      mm.add('(prefers-reduced-motion: reduce)', () => {
        el.style.setProperty('--progress', '1')
        nodes.forEach((n) => (n.dataset.lit = ''))
      })
      return () => mm.revert()
    },
    { scope: root, dependencies: [shown.length, pastShown.length, values.q], revertOnUpdate: true },
  )

  const monthLabel = (key: string) => new Intl.DateTimeFormat(intl, { month: 'long', year: 'numeric', timeZone: 'Asia/Muscat' }).format(new Date(`${key}-15T12:00:00+04:00`))

  const filters = (
    <>
      <ChipGroup label={c.when} options={whenOptions} selected={lists.when} onToggle={(v) => toggle('when', v)} allLabel={f.all} onAll={() => set({ when: null })} />
      {hasTypes && (
        <ChipGroup label={f.type} options={typeOptions} selected={lists.type} onToggle={(v) => toggle('type', v)} allLabel={f.all} onAll={() => set({ type: null })} />
      )}
      {hasDisciplines && (
        <ChipGroup
          label={f.discipline}
          options={disciplineOptions}
          selected={lists.discipline}
          onToggle={(v) => toggle('discipline', v)}
          allLabel={f.all}
          onAll={() => set({ discipline: null })}
        />
      )}
    </>
  )

  const row = (e: EventView) => {
    const d = eventDateParts(e.start, intl)
    const mine = myRegistration(e.slug, session.registrations, held)
    const status = eventStatus(e, mine, now)
    const taken = seatsTaken(e, session.registrations, held)
    const capacity = e.capacity ?? 0
    const left = Math.max(0, capacity - (taken ?? 0))
    return (
      <li key={e.slug} className={styles.row} data-past={isPast(e, now) || undefined} data-next={e.slug === nextSlug || undefined}>
        <span className={styles.node} data-node="" aria-hidden="true" />
        {e.slug === nextSlug && <p className={styles.nextLabel}>{c.nextUp}</p>}
        <Link href={`/events/${e.slug}`} className={styles.card}>
          <span className={styles.stamp}>
            <span className={styles.stampDay}>{d.day}</span>
            <span className={styles.stampMonth}>{d.month}</span>
            <span className={styles.stampWeekday}>{d.weekday}</span>
          </span>
          <span className={styles.cardBody}>
            <span className={styles.cardTop}>
              {e.type && <span className="chip">{t.platform.eventTypes[e.type]}</span>}
              <StatusBadge tone={STATUS_TONE[status]}>{t.platform.status[status]}</StatusBadge>
            </span>
            <span className={styles.cardTitle}>{l(e.title)}</span>
            <span className={styles.cardMeta}>
              {eventTimesIsolated(e.start, e.end, intl)}
              {e.location && ` · ${l(e.location)}`}
            </span>
            <span className={styles.cardFoot}>
              <span className={styles.cardKeys}>
                {e.disciplines.map((k) => (
                  <span key={k} className={styles.cardKey} style={{ '--key': DISCIPLINE_COLOR[k] } as CSSProperties}>
                    {l(DISCIPLINE_BY_ID[k].shortName)}
                  </span>
                ))}
              </span>
              {status === 'completed' ? (
                e.attended ? <span className={styles.seatText}>{c.attended(e.attended)}</span> : null
              ) : taken === null ? null : (
                <span className={styles.seats}>
                  <span className={styles.seatBar} style={{ '--fill': `${Math.min(100, (taken / capacity) * 100)}%` } as CSSProperties} aria-hidden="true" />
                  <span className={styles.seatText}>
                    {status === 'waitlist' || status === 'waitlisted' ? c.waitlistCount(e.waitlist ?? 0) : c.seats(left, capacity)}
                  </span>
                </span>
              )}
            </span>
          </span>
          <ItemMedia id={`tl-${e.slug}`} drawing={e.drawing} image={e.image ? { src: e.image.src, alt: '', focus: e.image.focus } : undefined} sizes="160px" className={styles.cardMedia} />
        </Link>
      </li>
    )
  }

  const groups = (list: EventView[]) => {
    const out: { key: string; items: EventView[] }[] = []
    for (const e of list) {
      const k = monthKey(e.start)
      const g = out.find((x) => x.key === k)
      if (g) g.items.push(e)
      else out.push({ key: k, items: [e] })
    }
    return out
  }

  return (
    <section className={styles.timelineSection} aria-label={c.timelineLabel}>
      <div className="container">
        <div className={styles.toolbar}>
          <SearchField value={values.q} onChange={(v) => set({ q: v || null })} placeholder={c.searchPlaceholder} label={c.searchLabel} />
          <FilterSheet active={activeCount} shown={shown.length}>
            {filters}
          </FilterSheet>
          <div className={styles.inlineFilters}>{filters}</div>
        </div>
        <ResultBar shown={shown.length} total={data.length} active={active} onClearAll={() => clear()} />

        {view === 'loading' ? (
          <ol className={styles.track} aria-busy="true" aria-label={t.platform.states.loading}>
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className={styles.row}>
                <div className={styles.card}>
                  <Skeleton style={{ width: 64, height: 72 }} />
                  <span className={styles.cardBody}>
                    <Skeleton style={{ width: '30%', height: 18 }} />
                    <Skeleton style={{ width: '70%', height: 24 }} />
                    <Skeleton style={{ width: '50%', height: 14 }} />
                  </span>
                </div>
              </li>
            ))}
          </ol>
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
          <StateMessage kind="empty" title={t.platform.states.emptyTitle} body={t.events.empty} />
        ) : shown.length === 0 ? (
          <StateMessage
            kind="filtered"
            title={t.platform.states.filteredTitle}
            body={t.platform.states.filteredBody}
            action={
              <button type="button" className="btn btn--secondary" onClick={() => clear()}>
                {f.clearAll}
              </button>
            }
          />
        ) : (
          <div ref={root} className={styles.timeline}>
            <div className={styles.spine} aria-hidden="true">
              <span className={styles.spineTrack} />
              <span className={styles.spineFill} />
              <span className={styles.spineHead} />
            </div>

            {past.length > 0 && (
              <section className={styles.run} aria-labelledby="run-past">
                <h2 id="run-past" className={styles.runTitle}>
                  {c.pastTitle}
                </h2>
                {(folded > 0 || showAllPast) && past.length > PAST_VISIBLE + 1 && !values.q && !lists.when.includes('past') && (
                  <button type="button" className={styles.earlier} aria-expanded={showAllPast} onClick={() => setShowAllPast((v) => !v)}>
                    {showAllPast ? c.showFewer : c.showEarlier(folded)}
                  </button>
                )}
                {groups(pastShown).map((g) => (
                  <div key={g.key} className={styles.month}>
                    <h3 className={styles.monthTitle}>{monthLabel(g.key)}</h3>
                    <ol className={styles.track}>{g.items.map(row)}</ol>
                  </div>
                ))}
              </section>
            )}

            <div className={styles.today}>
              <span className={styles.todayMark} aria-hidden="true" />
              <p className={styles.todayText}>
                <strong>{c.today}</strong> · {eventDateParts(now, intl).long}
                <span className={styles.todayNote}>{c.todayNote}</span>
              </p>
            </div>

            {!(lists.when.length === 1 && lists.when[0] === 'past') && (
              <section className={styles.run} aria-labelledby="run-upcoming">
                <h2 id="run-upcoming" className={styles.runTitle}>
                  {c.upcomingTitle}
                </h2>
                {upcoming.length === 0 ? (
                  <p className={styles.runEmpty}>{c.noUpcoming}</p>
                ) : (
                  groups(upcoming).map((g) => (
                    <div key={g.key} className={styles.month}>
                      <h3 className={styles.monthTitle}>{monthLabel(g.key)}</h3>
                      <ol className={styles.track}>{g.items.map(row)}</ol>
                    </div>
                  ))
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

