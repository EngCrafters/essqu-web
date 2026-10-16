'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DISCIPLINE_BY_ID, type DisciplineId } from '@/content/disciplines'
import type { ArchiveProject } from '@/content/projects'
import { useI18n } from '@/components/i18n/I18nProvider'
import { IconArchive, IconArrowRight } from '@/components/ui/icons'
import { ItemMedia } from '@/components/ui/Plate'
import { PROJECT_FILTER_EVENT } from '@/lib/events'
import { DESKTOP_QUERY, FINE_POINTER_QUERY, MOTION } from '@/lib/motion'
import styles from './Projects.module.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

type Filter = DisciplineId | 'all'

export function ProjectsBrowser({ projects }: { projects: ArchiveProject[] }) {
  const { t, l } = useI18n()
  const [filter, setFilter] = useState<Filter>('all')
  const rootRef = useRef<HTMLDivElement>(null)
  // Reveals are for arrival; once someone has filtered, results simply crossfade in place.
  const hasFiltered = useRef(false)
  const choose = (next: Filter) => {
    hasFiltered.current = true
    setFilter(next)
  }

  // Discipline rows elsewhere on the page can pre-select a filter.
  useEffect(() => {
    const onFilter = (e: Event) => {
      const id = (e as CustomEvent<DisciplineId>).detail
      if (id && id in DISCIPLINE_BY_ID) {
        hasFiltered.current = true
        setFilter(id)
      }
    }
    window.addEventListener(PROJECT_FILTER_EVENT, onFilter)
    return () => window.removeEventListener(PROJECT_FILTER_EVENT, onFilter)
  }, [])

  const counts = useMemo(() => {
    const map = new Map<DisciplineId, number>()
    projects.forEach((p) => map.set(p.discipline, (map.get(p.discipline) ?? 0) + 1))
    return map
  }, [projects])
  const disciplines = [...counts.keys()]

  const visible = filter === 'all' ? projects : projects.filter((p) => p.discipline === filter)
  const [featured, ...others] = visible
  const supporting = others.slice(0, 2)
  const more = others.slice(2)

  const summary =
    filter === 'all'
      ? t.projects.showingAll(visible.length)
      : t.projects.showingIn(visible.length, l(DISCIPLINE_BY_ID[filter].name))

  // Portfolio motion: a mask reveal on first arrival, gentle parallax in the drawings, and a
  // restrained tilt on fine-pointer desktops. Each lives on its own element.
  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return
      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        if (!hasFiltered.current) {
          const threshold = window.innerHeight * 0.85
          gsap.utils.toArray<HTMLElement>('[data-mask]', root).forEach((el) => {
            if (el.getBoundingClientRect().top < threshold) return
            gsap.fromTo(
              el,
              { clipPath: 'inset(0% 0% 100% 0%)' },
              {
                clipPath: 'inset(0% 0% 0% 0%)',
                duration: MOTION.mask.duration,
                ease: MOTION.ease,
                clearProps: 'clipPath',
                scrollTrigger: { trigger: el, start: MOTION.start, once: true },
              },
            )
          })
        }
      })

      // Depth in the drawings as they pass: full travel on desktop, about half on phones.
      mm.add({ desktop: DESKTOP_QUERY, motion: '(prefers-reduced-motion: no-preference)' }, (ctx) => {
        const { desktop, motion } = ctx.conditions as Record<string, boolean>
        if (!motion) return
        const travel = desktop ? MOTION.parallax : MOTION.parallax * 0.55
        gsap.utils.toArray<HTMLElement>('[data-mask]', root).forEach((media) => {
          const art = media.querySelector('[data-parallax]')
          if (!art) return
          gsap.fromTo(
            art,
            { y: -travel },
            {
              y: travel,
              ease: 'none',
              scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: true },
            },
          )
        })
      })

      mm.add(`${DESKTOP_QUERY} and ${FINE_POINTER_QUERY} and (prefers-reduced-motion: no-preference)`, () => {
        const cleanups: (() => void)[] = []
        gsap.utils.toArray<HTMLElement>('[data-tilt]', root).forEach((el) => {
          gsap.set(el, { transformPerspective: 900 })
          const rx = gsap.quickTo(el, 'rotationX', { duration: 0.5, ease: MOTION.ease })
          const ry = gsap.quickTo(el, 'rotationY', { duration: 0.5, ease: MOTION.ease })
          const onMove = (e: PointerEvent) => {
            const r = el.getBoundingClientRect()
            const nx = (e.clientX - r.left) / r.width - 0.5
            const ny = (e.clientY - r.top) / r.height - 0.5
            ry(nx * MOTION.tiltMax * 2)
            rx(-ny * MOTION.tiltMax * 2)
          }
          const onLeave = () => {
            rx(0)
            ry(0)
          }
          el.addEventListener('pointermove', onMove)
          el.addEventListener('pointerleave', onLeave)
          cleanups.push(() => {
            el.removeEventListener('pointermove', onMove)
            el.removeEventListener('pointerleave', onLeave)
            gsap.set(el, { clearProps: 'transform' })
          })
        })
        return () => cleanups.forEach((fn) => fn())
      })

      return () => mm.revert()
    },
    { scope: rootRef, dependencies: [filter], revertOnUpdate: true },
  )

  return (
    <div ref={rootRef} className={styles.browser}>
      <div className={styles.filters} role="group" aria-label={t.projects.filterLabel}>
        <FilterButton active={filter === 'all'} count={projects.length} onClick={() => choose('all')}>
          {t.projects.all}
        </FilterButton>
        {disciplines.map((id) => (
          <FilterButton key={id} active={filter === id} count={counts.get(id) ?? 0} onClick={() => choose(id)}>
            {l(DISCIPLINE_BY_ID[id].shortName)}
          </FilterButton>
        ))}
      </div>
      <p className="visually-hidden" aria-live="polite">
        {summary}
      </p>

      <div key={filter} className={styles.results}>
        {featured && <FeaturedProject project={featured} />}

        {supporting.length > 0 && (
          <ul className={styles.supporting}>
            {supporting.map((p) => (
              <li key={p.id}>
                <ProjectCard project={p} />
              </li>
            ))}
          </ul>
        )}

        {more.length > 0 && (
          <div className={styles.more}>
            <h3 className={styles.moreTitle}>{t.projects.alsoInArchive}</h3>
            <ul className={styles.moreList}>
              {more.map((p) => (
                <li key={p.id} className={styles.moreRow}>
                  <span className={styles.moreName}>{l(p.title)}</span>
                  <span className={styles.moreMeta}>
                    {l(DISCIPLINE_BY_ID[p.discipline].shortName)} · <span dir="ltr">{p.year}</span> · {t.common.sample}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {filter !== 'all' && visible.length === 1 && (
          <p className={styles.note}>{t.projects.onlyOne}</p>
        )}
      </div>
    </div>
  )
}

function FilterButton({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean
  count: number
  onClick: () => void
  children: string
}) {
  return (
    <button type="button" className={styles.filter} aria-pressed={active} onClick={onClick}>
      {children}
      <span className={styles.count} aria-hidden="true">
        {count}
      </span>
    </button>
  )
}

/** The title links to the archive entry once one exists; the whole card becomes its target. */
function ProjectTitle({ project, className }: { project: ArchiveProject; className: string }) {
  const { l } = useI18n()
  return (
    <h3 id={`${project.id}-title`} className={className}>
      {project.href ? (
        <Link href={project.href} className={styles.stretched}>
          {l(project.title)}
          <IconArrowRight className={styles.titleArrow} />
        </Link>
      ) : (
        l(project.title)
      )}
    </h3>
  )
}

function ArchiveStatus({ project }: { project: ArchiveProject }) {
  const { t } = useI18n()
  if (project.href) return null
  return (
    <p className={styles.archiveStatus}>
      <IconArchive className={styles.archiveIcon} />
      {t.projects.archiveOpens}
    </p>
  )
}

function Media({ project, sizes, tone }: { project: ArchiveProject; sizes: string; tone: 'soft' | 'brand' }) {
  const { t, l } = useI18n()
  return (
    <div className={styles.tilt} data-tilt="">
      <div className={styles.media} data-mask="">
        <ItemMedia
          id={project.id}
          drawing={project.drawing}
          image={project.image && { ...project.image, alt: l(project.image.alt) }}
          tone={tone}
          sizes={sizes}
          className={styles.plate}
        />
        {project.sample && <span className={`chip chip--sample ${styles.sampleTag}`}>{t.common.sample}</span>}
      </div>
    </div>
  )
}

function FeaturedProject({ project }: { project: ArchiveProject }) {
  const { t, l } = useI18n()
  const discipline = DISCIPLINE_BY_ID[project.discipline]
  return (
    <article className={styles.featured} aria-labelledby={`${project.id}-title`}>
      <Media project={project} tone="brand" sizes="(min-width: 64rem) 60vw, 100vw" />
      <div className={styles.featuredBody}>
        <p className={styles.kicker}>{l(discipline.name)}</p>
        <ProjectTitle project={project} className={styles.featuredTitle} />
        <p className={styles.summary}>{l(project.summary)}</p>
        <dl className={styles.spec}>
          <div>
            <dt>{t.projects.discipline}</dt>
            <dd>{l(discipline.shortName)}</dd>
          </div>
          <div>
            <dt>{t.projects.year}</dt>
            <dd dir="ltr">{project.year}</dd>
          </div>
          <div>
            <dt>{t.projects.team}</dt>
            <dd>{t.projects.teamOf(project.teamSize)}</dd>
          </div>
        </dl>
        <ArchiveStatus project={project} />
      </div>
    </article>
  )
}

function ProjectCard({ project }: { project: ArchiveProject }) {
  const { t, l } = useI18n()
  const discipline = DISCIPLINE_BY_ID[project.discipline]
  return (
    <article className={styles.card} aria-labelledby={`${project.id}-title`}>
      <Media project={project} tone="soft" sizes="(min-width: 48rem) 40vw, 100vw" />
      <div className={styles.cardBody}>
        <p className={styles.cardMeta}>
          {l(discipline.shortName)} <span aria-hidden="true">·</span> <span dir="ltr">{project.year}</span>
        </p>
        <ProjectTitle project={project} className={styles.cardTitle} />
        <p className={styles.summary}>{l(project.summary)}</p>
        <p className={styles.team}>{t.projects.teamOf(project.teamSize)}</p>
      </div>
    </article>
  )
}
