'use client'

import Link from 'next/link'
import { useRef, useState, type CSSProperties } from 'react'
import { ChipGroup, FilterSheet, ResultBar, SearchField, SelectField, Skeleton, StateMessage, previewState } from '@/components/discovery/Discovery'
import { matchesQuery, useQueryState } from '@/components/discovery/useQueryState'
import { useI18n } from '@/components/i18n/I18nProvider'
import { SampleNotice, TitleBlock } from '@/components/platform/Platform'
import { IconArrowRight } from '@/components/ui/icons'
import { DisciplineLink } from '@/components/ui/DisciplineLink'
import { DISCIPLINES, DISCIPLINE_BY_ID, type DisciplineId } from '@/content/disciplines'
import { PROJECT_STAGES, type Project, type ProjectStage } from '@/content/platform/projects'
import { DISCIPLINE_COLOR, PROJECT_TYPES, TECHNOLOGIES, type TechnologyId } from '@/content/platform/taxonomy'
import { MediaViewer } from './MediaViewer'
import { ProjectCover } from './ProjectCover'
import { AwardBadge, StagePath } from './ProjectStatus'
import styles from './Projects.module.css'
import { routes } from '@/lib/routes'

const KEYS = ['q', 'discipline', 'stage', 'year', 'type', 'tech', 'sort'] as const

export function ProjectsLab({ projects, state }: { projects: Project[]; state?: string }) {
  const { t, l } = useI18n()
  const c = t.platform.projectsPage
  const f = t.platform.filters
  const view = previewState(state)
  const { values, lists, set, toggle, clear, activeCount } = useQueryState(KEYS)

  const [benchSlug, setBenchSlug] = useState(projects[0]?.slug ?? '')
  const bench = projects.find((p) => p.slug === benchSlug) ?? projects[0]
  const benchRef = useRef<HTMLElement>(null)

  const data = view === 'empty' ? [] : projects
  const disciplinesOf = (p: Project) => [p.discipline, ...(p.alsoDisciplines ?? [])]
  const passes = (p: Project, skip?: (typeof KEYS)[number]) =>
    (skip === 'q' || matchesQuery(values.q, l(p.title), l(p.summary), ...p.technologies.map((x) => l(TECHNOLOGIES[x])))) &&
    (skip === 'discipline' || lists.discipline.length === 0 || disciplinesOf(p).some((d) => lists.discipline.includes(d))) &&
    (skip === 'stage' || lists.stage.length === 0 || lists.stage.includes(p.stage)) &&
    (skip === 'year' || lists.year.length === 0 || lists.year.includes(String(p.year))) &&
    (skip === 'type' || lists.type.length === 0 || lists.type.includes(p.type)) &&
    (skip === 'tech' || lists.tech.length === 0 || p.technologies.some((x) => lists.tech.includes(x)))
  const sort = values.sort || 'featured'
  const shown = data
    .filter((p) => passes(p))
    .sort((a, b) =>
      sort === 'az'
        ? l(a.title).localeCompare(l(b.title))
        : sort === 'newest'
          ? b.year - a.year
          : Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || b.year - a.year,
    )

  const count = (pred: (p: Project) => boolean, skip: (typeof KEYS)[number]) => data.filter((p) => pred(p) && passes(p, skip)).length
  const years = [...new Set(data.map((p) => p.year))].sort((a, b) => b - a)
  const techs = (Object.keys(TECHNOLOGIES) as TechnologyId[]).filter((x) => data.some((p) => p.technologies.includes(x)))

  const active = [
    ...lists.discipline.map((v) => ({
      key: `d${v}`,
      label: l(DISCIPLINE_BY_ID[v as DisciplineId]?.shortName ?? { en: v, ar: v }),
      onRemove: () => toggle('discipline', v),
    })),
    ...lists.stage.map((v) => ({ key: `s${v}`, label: c.stages[v as ProjectStage] ?? v, onRemove: () => toggle('stage', v) })),
    ...lists.year.map((v) => ({ key: `y${v}`, label: v, onRemove: () => toggle('year', v) })),
    ...lists.type.map((v) => ({ key: `t${v}`, label: c.types[v as keyof typeof c.types] ?? v, onRemove: () => toggle('type', v) })),
    ...lists.tech.map((v) => ({ key: `x${v}`, label: l(TECHNOLOGIES[v as TechnologyId] ?? { en: v, ar: v }), onRemove: () => toggle('tech', v) })),
    ...(values.q ? [{ key: 'q', label: `“${values.q}”`, onRemove: () => set({ q: null }) }] : []),
  ]

  const filters = (
    <>
      <ChipGroup
        label={f.discipline}
        options={DISCIPLINES.map((d) => ({
          value: d.id,
          label: l(d.shortName),
          color: DISCIPLINE_COLOR[d.id],
          count: count((p) => disciplinesOf(p).includes(d.id), 'discipline'),
        }))}
        selected={lists.discipline}
        onToggle={(v) => toggle('discipline', v)}
        layout="stack"
      />
      <ChipGroup
        label={c.stage}
        options={PROJECT_STAGES.filter((s) => data.some((p) => p.stage === s)).map((s) => ({
          value: s,
          label: c.stages[s],
          count: count((p) => p.stage === s, 'stage'),
        }))}
        selected={lists.stage}
        onToggle={(v) => toggle('stage', v)}
      />
      <ChipGroup
        label={f.year}
        options={years.map((y) => ({ value: String(y), label: String(y), count: count((p) => p.year === y, 'year') }))}
        selected={lists.year}
        onToggle={(v) => toggle('year', v)}
      />
      <ChipGroup
        label={f.type}
        options={(Object.keys(PROJECT_TYPES) as (keyof typeof c.types)[]).map((ty) => ({
          value: ty,
          label: c.types[ty],
          count: count((p) => p.type === ty, 'type'),
        }))}
        selected={lists.type}
        onToggle={(v) => toggle('type', v)}
      />
      <ChipGroup
        label={f.technology}
        options={techs.map((x) => ({ value: x, label: l(TECHNOLOGIES[x]), count: count((p) => p.technologies.includes(x), 'tech') }))}
        selected={lists.tech}
        onToggle={(v) => toggle('tech', v)}
      />
    </>
  )

  return (
    <>
      {/* The bench. */}
      <section ref={benchRef} className={styles.lab} aria-labelledby="projects-title">
        <div className={`container ${styles.labGrid}`}>
          <div className={styles.labCopy}>
            <p className={`${styles.eyebrow} intro-item`}>{c.eyebrow}</p>
            <h1 id="projects-title" className={`${styles.title} intro-item`} style={{ '--i': 1 } as CSSProperties}>
              {c.title}
            </h1>
            <p className={`${styles.lead} intro-item`} style={{ '--i': 2 } as CSSProperties}>
              {c.lead}
            </p>
            <Link href="/projects/submit" className="btn btn--on-dark">
              {l({ en: 'Submit a project · My projects', ar: 'قدّم مشروعاً · مشاريعي' })}
              <IconArrowRight className="btn__arrow" />
            </Link>
            {bench && (
              <div
                className={`${styles.benchCard} intro-item`}
                style={{ '--i': 3, '--key': DISCIPLINE_COLOR[bench.discipline] } as CSSProperties}
                aria-live="polite"
              >
                <p className={styles.benchKicker}>
                  <span className={styles.key} aria-hidden="true" />
                  {c.bench}
                </p>
                <h2 className={styles.benchTitle}>{l(bench.title)}</h2>
                <p className={styles.benchSummary}>{l(bench.summary)}</p>
                <StagePath stage={bench.stage} tone="dark" />
                <p className={styles.benchMeta}>
                  {l(DISCIPLINE_BY_ID[bench.discipline].shortName)} · {bench.year} · {c.teamSize(bench.teamCredits?.length ?? bench.contributors.length)}
                </p>
                {bench.achievements[0] && <AwardBadge award={bench.achievements[0]} tone="dark" />}
                <Link href={routes.project(bench.slug)} className="btn btn--on-dark">
                  {c.openProject}
                  <IconArrowRight className="btn__arrow" />
                </Link>
              </div>
            )}
          </div>

          {bench && <MediaViewer project={bench} items={bench.media} tone="dark" className={styles.benchMedia} />}
        </div>
      </section>

      {/* The catalogue of drawing sheets. */}
      <section className={styles.catalogue} aria-labelledby="catalogue-title">
        <div className={`container ${styles.catalogueGrid}`}>
          <aside className={styles.sidebar}>
            <h2 id="catalogue-title" className={styles.catalogueTitle}>
              {c.catalogue}
            </h2>
            <SearchField value={values.q} onChange={(v) => set({ q: v || null })} placeholder={c.searchPlaceholder} label={c.searchLabel} />
            <div className={styles.sidebarFilters}>{filters}</div>
            <div className={styles.sheetTrigger}>
              <FilterSheet active={activeCount} shown={shown.length}>
                {filters}
              </FilterSheet>
            </div>
          </aside>

          <div className={styles.results}>
            <div className={styles.resultsHead}>
              <ResultBar shown={shown.length} total={data.length} active={active} onClearAll={() => clear(['q', 'discipline', 'year', 'type', 'tech'])} />
              <SelectField
                label={c.sortLabel}
                value={sort}
                onChange={(v) => set({ sort: v === 'featured' ? null : v })}
                options={(['featured', 'newest', 'az'] as const).map((s) => ({ value: s, label: c.sort[s] }))}
                className={styles.sort}
              />
            </div>

            {view === 'loading' ? (
              <ul className={styles.sheets} aria-busy="true" aria-label={t.platform.states.loading}>
                {Array.from({ length: 4 }, (_, i) => (
                  <li key={i} className={styles.sheetCard}>
                    <Skeleton style={{ aspectRatio: '3 / 2', width: '100%' }} />
                    <Skeleton style={{ height: 22, width: '70%', margin: '16px' }} />
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
              <StateMessage kind="empty" title={t.platform.states.emptyTitle} body={c.empty} />
            ) : shown.length === 0 ? (
              <StateMessage
                kind="filtered"
                title={t.platform.states.filteredTitle}
                body={t.platform.states.filteredBody}
                action={
                  <button type="button" className="btn btn--secondary" onClick={() => clear(['q', 'discipline', 'year', 'type', 'tech'])}>
                    {f.clearAll}
                  </button>
                }
              />
            ) : (
              <ul className={styles.sheets}>
                {shown.map((p) => {
                  const n = projects.indexOf(p) + 1
                  const onBench = p.slug === bench?.slug
                  return (
                    <li
                      key={p.slug}
                      className={styles.sheetCard}
                      style={{ '--key': DISCIPLINE_COLOR[p.discipline] } as CSSProperties}
                      data-bench={onBench || undefined}
                    >
                      <div className={styles.sheetMedia}>
                        <ProjectCover id={`sheet-${p.slug}`} project={p} className={styles.sheetPlate} />
                        <span className={styles.sheetNo}>
                          {c.sheet} P-{String(n).padStart(2, '0')}
                        </span>
                        {p.featured && <span className={`chip chip--brand ${styles.sheetFeatured}`}>{c.featured}</span>}
                      </div>
                      <div className={styles.sheetBody}>
                        <h3 className={styles.sheetTitle}>
                          <Link href={routes.project(p.slug)} className={styles.sheetLink}>
                            {l(p.title)}
                          </Link>
                        </h3>
                        <p className={styles.sheetSummary}>{l(p.summary)}</p>
                        <div className={styles.sheetStatus}>
                          <StagePath stage={p.stage} compact />
                          {p.achievements[0] && <AwardBadge award={p.achievements[0]} />}
                        </div>
                        <TitleBlock
                          className={styles.sheetBlock}
                          rows={[
                            { label: c.discipline, value: <DisciplineLink id={p.discipline}>{l(DISCIPLINE_BY_ID[p.discipline].shortName)}</DisciplineLink> },
                            { label: c.year, value: p.year },
                            { label: c.type, value: c.types[p.type] },
                            { label: c.team, value: c.teamSize(p.teamCredits?.length ?? p.contributors.length) },
                          ]}
                        />
                        <button
                          type="button"
                          className={`btn btn--compact ${onBench ? 'btn--quiet' : 'btn--secondary'} ${styles.benchButton}`}
                          aria-pressed={onBench}
                          onClick={() => {
                            setBenchSlug(p.slug)
                            const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                            benchRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
                          }}
                        >
                          {onBench ? c.onBench : c.putOnBench}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            {projects.some((p) => p.sample) && <SampleNotice className={styles.sample} />}
          </div>
        </div>
      </section>
    </>
  )
}
