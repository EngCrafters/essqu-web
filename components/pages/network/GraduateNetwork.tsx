'use client'

import Link from 'next/link'
import { useState, type CSSProperties } from 'react'
import { ChipGroup, FilterSheet, ResultBar, SearchField, Skeleton, StateMessage, previewState } from '@/components/discovery/Discovery'
import { matchesQuery, useQueryState } from '@/components/discovery/useQueryState'
import { useI18n } from '@/components/i18n/I18nProvider'
import { useDemoSession } from '@/components/platform/DemoSession'
import { Monogram, StatusBadge } from '@/components/platform/Platform'
import { DisciplineLink } from '@/components/ui/DisciplineLink'
import { DISCIPLINES, DISCIPLINE_BY_ID, type DisciplineId } from '@/content/disciplines'
import type { Graduate, MentorshipAvailability } from '@/content/platform/graduates'
import { DISCIPLINE_COLOR, INDUSTRIES, SKILLS, type IndustryId, type SkillId } from '@/content/platform/taxonomy'
import { routes } from '@/lib/routes'
import { MentorshipDialog, MentorshipStatus } from './Mentorship'
import styles from './Network.module.css'

const KEYS = ['q', 'discipline', 'band', 'skill', 'mentorship'] as const
const BANDS = [
  { id: '2011', from: 2011, to: 2015 },
  { id: '2016', from: 2016, to: 2020 },
  { id: '2021', from: 2021, to: 2025 },
] as const
const W = 1000
const H = 420
const PAD = { start: 150, end: 30, top: 24, bottom: 46 }
const r2 = (n: number) => Math.round(n * 100) / 100

/**
 * The graduate network: a career map (graduation year across, industry down) above the
 * graduates themselves. Filters dim the map and narrow the list; a mentorship request runs
 * request → sent → accepted in this tab only.
 */
export function GraduateNetwork({ graduates, state }: { graduates: Graduate[]; state?: string }) {
  const { t, l, dir } = useI18n()
  const c = t.platform.networkPage
  const f = t.platform.filters
  const view = previewState(state)
  const session = useDemoSession()
  const { values, lists, set, toggle, clear, activeCount } = useQueryState(KEYS)
  const [asking, setAsking] = useState<Graduate | null>(null)
  const [hover, setHover] = useState<string | null>(null)

  const data = view === 'empty' ? [] : graduates
  const band = (g: Graduate) => BANDS.find((b) => g.graduated >= b.from && g.graduated <= b.to)?.id ?? ''
  const passes = (g: Graduate, skip?: (typeof KEYS)[number]) =>
    (skip === 'q' || matchesQuery(values.q, l(g.name), l(g.role), l(g.offer), l(g.employer), ...g.skills.map((s) => l(SKILLS[s])))) &&
    (skip === 'discipline' || lists.discipline.length === 0 || lists.discipline.includes(g.discipline)) &&
    (skip === 'band' || lists.band.length === 0 || lists.band.includes(band(g))) &&
    (skip === 'skill' || lists.skill.length === 0 || g.skills.some((s) => lists.skill.includes(s))) &&
    (skip === 'mentorship' || lists.mentorship.length === 0 || lists.mentorship.includes(g.mentorship))
  const shown = data.filter((g) => passes(g))
  const shownIds = new Set(shown.map((g) => g.id))
  const filtering = activeCount > 0 || Boolean(values.q)
  const count = (pred: (g: Graduate) => boolean, skip: (typeof KEYS)[number]) => data.filter((g) => pred(g) && passes(g, skip)).length
  const skills = (Object.keys(SKILLS) as SkillId[]).filter((s) => data.some((g) => g.skills.includes(s)))

  const active = [
    ...lists.discipline.map((v) => ({ key: `d${v}`, label: l(DISCIPLINE_BY_ID[v as DisciplineId]?.shortName ?? { en: v, ar: v }), onRemove: () => toggle('discipline', v) })),
    ...lists.band.map((v) => {
      const b = BANDS.find((x) => x.id === v)
      return { key: `b${v}`, label: b ? c.yearsBand(b.from, b.to) : v, onRemove: () => toggle('band', v) }
    }),
    ...lists.skill.map((v) => ({ key: `s${v}`, label: l(SKILLS[v as SkillId] ?? { en: v, ar: v }), onRemove: () => toggle('skill', v) })),
    ...lists.mentorship.map((v) => ({ key: `m${v}`, label: c.availability[v as MentorshipAvailability] ?? v, onRemove: () => toggle('mentorship', v) })),
    ...(values.q ? [{ key: 'q', label: `“${values.q}”`, onRemove: () => set({ q: null }) }] : []),
  ]

  const filters = (
    <>
      <ChipGroup
        label={f.mentorship}
        options={(['open', 'limited', 'closed'] as const).map((m) => ({ value: m, label: c.availability[m], count: count((g) => g.mentorship === m, 'mentorship') }))}
        selected={lists.mentorship}
        onToggle={(v) => toggle('mentorship', v)}
      />
      <ChipGroup
        label={f.discipline}
        options={DISCIPLINES.map((d) => ({ value: d.id, label: l(d.shortName), color: DISCIPLINE_COLOR[d.id], count: count((g) => g.discipline === d.id, 'discipline') }))}
        selected={lists.discipline}
        onToggle={(v) => toggle('discipline', v)}
      />
      <ChipGroup
        label={f.graduation}
        options={BANDS.map((b) => ({ value: b.id, label: c.yearsBand(b.from, b.to), count: count((g) => band(g) === b.id, 'band') }))}
        selected={lists.band}
        onToggle={(v) => toggle('band', v)}
      />
      <ChipGroup
        label={f.skills}
        options={skills.map((s) => ({ value: s, label: l(SKILLS[s]), count: count((g) => g.skills.includes(s), 'skill') }))}
        selected={lists.skill}
        onToggle={(v) => toggle('skill', v)}
      />
    </>
  )

  // The career map's axes.
  const industries = (Object.keys(INDUSTRIES) as IndustryId[]).filter((i) => graduates.some((g) => g.industry === i))
  const years = graduates.map((g) => g.graduated)
  const y0 = Math.min(...years)
  const y1 = Math.max(...years)
  const rtl = dir === 'rtl'
  const xFor = (year: number) => {
    const k = (year - y0) / Math.max(1, y1 - y0)
    const span = W - PAD.start - PAD.end
    return r2(rtl ? W - PAD.start - k * span : PAD.start + k * span)
  }
  const yFor = (i: IndustryId) => r2(PAD.top + ((industries.indexOf(i) + 0.5) / industries.length) * (H - PAD.top - PAD.bottom))
  const stack = new Map<string, number>()
  const dotAt = (g: Graduate) => {
    const key = `${g.graduated}-${g.industry}`
    const n = stack.get(key) ?? 0
    stack.set(key, n + 1)
    return { x: r2(xFor(g.graduated) + n * 14), y: yFor(g.industry) }
  }

  const go = (id: string) => {
    const el = document.getElementById(`grad-${id}`)
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
    el.focus({ preventScroll: true })
  }

  return (
    <>
      <section className={styles.mapSection} aria-labelledby="map-title">
        <div className="container">
          <div className={styles.mapHead}>
            <h2 id="map-title" className={styles.mapTitle}>
              {c.mapTitle}
            </h2>
            <p className={styles.legend} aria-hidden="true">
              <span data-kind="open">{c.availability.open}</span>
              <span data-kind="limited">{c.availability.limited}</span>
              <span data-kind="closed">{c.availability.closed}</span>
            </p>
          </div>
          <div className={styles.map}>
            <svg viewBox={`0 0 ${W} ${H}`} className={styles.mapSvg} role="group" aria-label={c.mapLabel}>
              {industries.map((i) => (
                <g key={i}>
                  <line x1={PAD.start - 10} x2={W - PAD.end + 10} y1={yFor(i)} y2={yFor(i)} className={styles.row} />
                  <text x={rtl ? W - 8 : 8} y={yFor(i)} className={styles.rowLabel} dominantBaseline="central" textAnchor="start">
                    {l(INDUSTRIES[i])}
                  </text>
                </g>
              ))}
              {Array.from({ length: y1 - y0 + 1 }, (_, k) => y0 + k)
                .filter((y) => y % 2 === 1)
                .map((y) => (
                  <text key={y} x={xFor(y)} y={H - 14} className={styles.axisLabel} textAnchor="middle">
                    {y}
                  </text>
                ))}
              {graduates.map((g) => {
                const p = dotAt(g)
                const on = !filtering || shownIds.has(g.id)
                const req = session.mentorship[g.id]
                return (
                  <a
                    key={g.id}
                    href={`#grad-${g.id}`}
                    className={styles.dot}
                    data-kind={g.mentorship}
                    data-dim={!on || undefined}
                    data-requested={req || undefined}
                    style={{ '--key': DISCIPLINE_COLOR[g.discipline] } as CSSProperties}
                    onMouseEnter={() => setHover(g.id)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(g.id)}
                    onBlur={() => setHover(null)}
                    onClick={(e) => {
                      e.preventDefault()
                      go(g.id)
                    }}
                    aria-label={`${l(g.name)} · ${l(g.role)} · ${g.graduated}`}
                  >
                    {req && <circle cx={p.x} cy={p.y} r="14" className={styles.dotRing} />}
                    <circle cx={p.x} cy={p.y} r="8" className={styles.dotMark} />
                  </a>
                )
              })}
            </svg>
            <p className={styles.mapCard} aria-hidden="true">
              {hover
                ? (() => {
                    const g = graduates.find((x) => x.id === hover)!
                    return (
                      <>
                        <strong>{l(g.name)}</strong> · {l(g.role)} · {g.graduated}
                      </>
                    )
                  })()
                : c.mapHint}
            </p>
          </div>
        </div>
      </section>

      <section className={styles.listSection} aria-label={c.eyebrow}>
        <div className={`container ${styles.layout}`}>
          <aside className={styles.sidebar}>
            <SearchField value={values.q} onChange={(v) => set({ q: v || null })} placeholder={c.searchPlaceholder} label={c.searchLabel} />
            <div className={styles.sidebarFilters}>{filters}</div>
            <div className={styles.sheet}>
              <FilterSheet active={activeCount} shown={shown.length}>
                {filters}
              </FilterSheet>
            </div>
          </aside>

          <div className={styles.results}>
            <ResultBar shown={shown.length} total={data.length} active={active} onClearAll={() => clear()} />
            {view === 'loading' ? (
              <ul className={styles.cards} aria-busy="true" aria-label={t.platform.states.loading}>
                {Array.from({ length: 4 }, (_, i) => (
                  <li key={i} className={styles.card}>
                    <Skeleton style={{ width: 56, height: 56, borderRadius: '50%' }} />
                    <Skeleton style={{ width: '70%', height: 20 }} />
                    <Skeleton style={{ width: '90%', height: 14 }} />
                  </li>
                ))}
              </ul>
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
              <StateMessage kind="empty" title={t.platform.states.emptyTitle} />
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
              <ul className={styles.cards}>
                {shown.map((g) => (
                    <li
                      key={g.id}
                      id={`grad-${g.id}`}
                      tabIndex={-1}
                      className={styles.card}
                      data-lit={hover === g.id || undefined}
                      style={{ '--key': DISCIPLINE_COLOR[g.discipline] } as CSSProperties}
                    >
                      <div className={styles.cardHead}>
                        <Monogram name={g.name} discipline={g.discipline} size={52} />
                        <div className={styles.cardWho}>
                          <h3 className={styles.cardName}>
                            <Link href={routes.graduate(g.id)} className={styles.cardLink}>
                              {l(g.name)}
                            </Link>
                          </h3>
                          <p className={styles.cardRole}>{l(g.role)}</p>
                          <p className={styles.cardMeta}>
                            {l(g.employer)} · {l(g.location)}
                          </p>
                        </div>
                      </div>
                      <p className={styles.cardFacts}>
                        <span className={styles.key} aria-hidden="true" />
                        <DisciplineLink id={g.discipline}>{l(DISCIPLINE_BY_ID[g.discipline].shortName)}</DisciplineLink> ·{' '}
                        {t.platform.common.classOf(g.graduated)}
                      </p>
                      <div className={styles.offer}>
                        <span className={styles.offerLabel}>{c.offers}</span>
                        <p>{l(g.offer)}</p>
                      </div>
                      <ul className={styles.skills} aria-label={f.skills}>
                        {g.skills.map((s) => (
                          <li key={s} className="chip">
                            {l(SKILLS[s])}
                          </li>
                        ))}
                      </ul>
                      <div className={styles.cardFoot}>
                        <StatusBadge tone={g.mentorship === 'open' ? 'open' : g.mentorship === 'limited' ? 'waiting' : 'neutral'}>
                          {c.availability[g.mentorship]}
                        </StatusBadge>
                        <MentorshipStatus graduate={g} onAsk={() => setAsking(g)} />
                      </div>
                    </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <MentorshipDialog graduate={asking} onClose={() => setAsking(null)} />
    </>
  )
}
