'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, type CSSProperties } from 'react'
import { ChipGroup, FilterSheet, ResultBar, SearchField, Skeleton, StateMessage, previewState } from '@/components/discovery/Discovery'
import { matchesQuery, useQueryState } from '@/components/discovery/useQueryState'
import { useI18n } from '@/components/i18n/I18nProvider'
import { Monogram } from '@/components/platform/Platform'
import { DISCIPLINES, DISCIPLINE_BY_ID, type DisciplineId } from '@/content/disciplines'
import { DISCIPLINE_COLOR, SKILLS, type SkillId } from '@/content/platform/taxonomy'
import type { MemberSummary } from '@/lib/data'
import { routes } from '@/lib/routes'
import styles from './Members.module.css'

const KEYS = ['q', 'discipline', 'year', 'interest'] as const
const W = 1000
/** Trig differs in the last digits between server and browser; rounded values hydrate cleanly. */
const r2 = (n: number) => Math.round(n * 100) / 100
const H = 660

/**
 * The member directory as a network. Members gather around their discipline; a line joins two
 * members who built a project together. Filters dim the network and narrow the roll beneath
 * it, so the shape of the community stays visible while the visitor searches it.
 */
export function MembersNetwork({ members, links, state }: { members: MemberSummary[]; links: [string, string][]; state?: string }) {
  const { t, l } = useI18n()
  const router = useRouter()
  const c = t.platform.membersPage
  const f = t.platform.filters
  const view = previewState(state)
  const { values, lists, set, toggle, clear, activeCount } = useQueryState(KEYS)
  const [hover, setHover] = useState<string | null>(null)

  const data = view === 'empty' ? [] : members

  // Cluster centres on an ellipse, one per discipline; members on a small ring around each.
  const layout = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>()
    const centres = new Map<DisciplineId, { x: number; y: number }>()
    DISCIPLINES.forEach((d, i) => {
      const a = (i / DISCIPLINES.length) * Math.PI * 2 - Math.PI / 2
      const centre = { x: r2(W / 2 + Math.cos(a) * 370), y: r2(H / 2 - 16 + Math.sin(a) * 236) }
      centres.set(d.id, centre)
      const group = members.filter((m) => m.discipline === d.id)
      group.forEach((m, j) => {
        const b = (j / Math.max(group.length, 1)) * Math.PI * 2 + i
        const r = group.length === 1 ? 0 : 34 + (j % 2) * 12
        pos.set(m.id, { x: r2(centre.x + Math.cos(b) * r), y: r2(centre.y + Math.sin(b) * r) })
      })
    })
    return { pos, centres }
  }, [members])

  const passes = (m: MemberSummary, skip?: (typeof KEYS)[number]) =>
    (skip === 'q' || matchesQuery(values.q, l(m.name), l(m.headline), ...m.interests.map((s) => l(SKILLS[s])))) &&
    (skip === 'discipline' || lists.discipline.length === 0 || lists.discipline.includes(m.discipline)) &&
    (skip === 'year' || lists.year.length === 0 || lists.year.includes(String(m.year))) &&
    (skip === 'interest' || lists.interest.length === 0 || m.interests.some((s) => lists.interest.includes(s)))
  const shown = data.filter((m) => passes(m))
  const shownIds = new Set(shown.map((m) => m.id))
  const filtering = activeCount > 0 || Boolean(values.q)
  const count = (pred: (m: MemberSummary) => boolean, skip: (typeof KEYS)[number]) => data.filter((m) => pred(m) && passes(m, skip)).length
  const skills = (Object.keys(SKILLS) as SkillId[]).filter((s) => data.some((m) => m.interests.includes(s)))

  const active = [
    ...lists.discipline.map((v) => ({ key: `d${v}`, label: l(DISCIPLINE_BY_ID[v as DisciplineId]?.shortName ?? { en: v, ar: v }), onRemove: () => toggle('discipline', v) })),
    ...lists.year.map((v) => ({ key: `y${v}`, label: t.platform.common.yearN(Number(v)), onRemove: () => toggle('year', v) })),
    ...lists.interest.map((v) => ({ key: `i${v}`, label: l(SKILLS[v as SkillId] ?? { en: v, ar: v }), onRemove: () => toggle('interest', v) })),
    ...(values.q ? [{ key: 'q', label: `“${values.q}”`, onRemove: () => set({ q: null }) }] : []),
  ]

  const filters = (
    <>
      <ChipGroup
        label={f.discipline}
        options={DISCIPLINES.map((d) => ({ value: d.id, label: l(d.shortName), color: DISCIPLINE_COLOR[d.id], count: count((m) => m.discipline === d.id, 'discipline') }))}
        selected={lists.discipline}
        onToggle={(v) => toggle('discipline', v)}
      />
      <ChipGroup
        label={f.academicYear}
        options={[1, 2, 3, 4, 5].map((y) => ({ value: String(y), label: t.platform.common.yearN(y), count: count((m) => m.year === y, 'year') }))}
        selected={lists.year}
        onToggle={(v) => toggle('year', v)}
      />
      <ChipGroup
        label={f.interests}
        options={skills.map((s) => ({ value: s, label: l(SKILLS[s]), count: count((m) => m.interests.includes(s), 'interest') }))}
        selected={lists.interest}
        onToggle={(v) => toggle('interest', v)}
      />
    </>
  )

  const hovered = hover ? members.find((m) => m.id === hover) : null

  return (
    <>
      <section className={styles.mapSection} aria-label={c.mapLabel}>
        <div className="container">
          <div className={styles.map}>
            <svg viewBox={`0 0 ${W} ${H}`} className={styles.mapSvg} role="group" aria-label={c.mapLabel}>
              {DISCIPLINES.map((d) => {
                const p = layout.centres.get(d.id)!
                return (
                  <g key={d.id} className={styles.cluster} style={{ '--key': DISCIPLINE_COLOR[d.id] } as CSSProperties}>
                    <circle cx={p.x} cy={p.y} r="70" className={styles.clusterHalo} />
                    <text x={p.x} y={p.y + 94} className={styles.clusterLabel} textAnchor="middle">
                      {l(d.shortName)}
                    </text>
                  </g>
                )
              })}
              {links.map(([a, b]) => {
                const p = layout.pos.get(a)
                const q = layout.pos.get(b)
                if (!p || !q) return null
                const on = !filtering || (shownIds.has(a) && shownIds.has(b))
                const lit = hover === a || hover === b
                return (
                  <line
                    key={`${a}-${b}`}
                    x1={p.x}
                    y1={p.y}
                    x2={q.x}
                    y2={q.y}
                    className={styles.link}
                    data-dim={!on || undefined}
                    data-lit={lit || undefined}
                  />
                )
              })}
              {members.map((m) => {
                const p = layout.pos.get(m.id)!
                const on = !filtering || shownIds.has(m.id)
                return (
                  <a
                    key={m.id}
                    href={routes.member(m.id)}
                    className={styles.node}
                    onClick={(e) => {
                      // An SVG link would reload the page; route in place like every other link.
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                      e.preventDefault()
                      router.push(routes.member(m.id))
                    }}
                    data-dim={!on || undefined}
                    style={{ '--key': DISCIPLINE_COLOR[m.discipline] } as CSSProperties}
                    onMouseEnter={() => setHover(m.id)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(m.id)}
                    onBlur={() => setHover(null)}
                    aria-label={`${l(m.name)} · ${l(DISCIPLINE_BY_ID[m.discipline].shortName)}`}
                  >
                    <circle cx={p.x} cy={p.y} r={9 + Math.min(m.projects, 3) * 2} className={styles.nodeDot} />
                  </a>
                )
              })}
            </svg>
            <div className={styles.mapCard} aria-hidden="true" data-on={hovered ? '' : undefined}>
              {hovered ? (
                <>
                  <Monogram name={hovered.name} discipline={hovered.discipline} size={40} />
                  <span>
                    <strong>{l(hovered.name)}</strong>
                    <span className={styles.mapCardMeta}>
                      {l(DISCIPLINE_BY_ID[hovered.discipline].shortName)} · {t.platform.common.yearN(hovered.year)} · {c.projects(hovered.projects)}
                    </span>
                  </span>
                </>
              ) : (
                <span className={styles.mapCardMeta}>{c.mapHint}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.roll} aria-labelledby="roll-title">
        <div className="container">
          <div className={styles.rollHead}>
            <h2 id="roll-title" className={styles.rollTitle}>
              {c.rollTitle}
            </h2>
            <div className={styles.toolbar}>
              <SearchField value={values.q} onChange={(v) => set({ q: v || null })} placeholder={c.searchPlaceholder} label={c.searchLabel} />
              <FilterSheet active={activeCount} shown={shown.length}>
                {filters}
              </FilterSheet>
            </div>
          </div>
          <div className={styles.inlineFilters}>{filters}</div>
          <ResultBar shown={shown.length} total={data.length} active={active} onClearAll={() => clear()} />

          {view === 'loading' ? (
            <ul className={styles.list} aria-busy="true" aria-label={t.platform.states.loading}>
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i} className={styles.person}>
                  <Skeleton style={{ width: 48, height: 48, borderRadius: '50%' }} />
                  <Skeleton style={{ width: '60%', height: 18 }} />
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
            <ul className={styles.list}>
              {shown.map((m) => (
                <li key={m.id}>
                  <Link
                    href={routes.member(m.id)}
                    className={styles.person}
                    onMouseEnter={() => setHover(m.id)}
                    onMouseLeave={() => setHover(null)}
                    style={{ '--key': DISCIPLINE_COLOR[m.discipline] } as CSSProperties}
                  >
                    <Monogram name={m.name} discipline={m.discipline} size={48} />
                    <span className={styles.personMain}>
                      <span className={styles.personName}>{l(m.name)}</span>
                      <span className={styles.personHeadline}>{l(m.headline)}</span>
                    </span>
                    <span className={styles.personMeta}>
                      <span>{l(DISCIPLINE_BY_ID[m.discipline].shortName)}</span>
                      <span>{t.platform.common.yearN(m.year)}</span>
                      <span>{c.projects(m.projects)}</span>
                    </span>
                    <span className={styles.personTags}>
                      {m.interests.slice(0, 3).map((s) => (
                        <span key={s} className="chip">
                          {l(SKILLS[s])}
                        </span>
                      ))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  )
}
