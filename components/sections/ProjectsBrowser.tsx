'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
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
    projects.forEach((p) => p.discipline && map.set(p.discipline, (map.get(p.discipline) ?? 0) + 1))
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
                    {p.award ? (
                      <Award award={p.award} />
                    ) : (
                      [p.discipline && l(DISCIPLINE_BY_ID[p.discipline].shortName), p.year, p.sample && t.common.sample].filter(Boolean).join(' · ')
                    )}
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

/**
 * The project's picture. A team's poster or product photograph is laid on the drawing board as
 * a print, so real material sits inside the section's blueprint language; a photograph fills
 * the frame; otherwise the project's drawing.
 */
function Media({ project, sizes, tone }: { project: ArchiveProject; sizes: string; tone: 'soft' | 'brand' }) {
  const { t, l } = useI18n()
  const print = project.print
  return (
    <div className={styles.tilt} data-tilt="">
      <div className={styles.media} data-mask="">
        {print ? (
          <div className={`${styles.plate} ${styles.board}`} data-tone={tone}>
            <span className={styles.print} style={{ '--ratio': `${print.width} / ${print.height}` } as CSSProperties} data-parallax="">
              <Image
                src={print.src}
                alt={l(print.alt)}
                fill
                sizes={sizes}
                quality={85}
                className={styles.printImage}
                style={print.focus ? { objectPosition: print.focus } : undefined}
              />
            </span>
          </div>
        ) : project.image || project.drawing ? (
          <ItemMedia
            id={project.id}
            // A photograph replaces the drawing, so the drawing only matters when there is none.
            drawing={project.drawing ?? 'truss'}
            image={project.image && { ...project.image, alt: l(project.image.alt) }}
            tone={tone}
            sizes={sizes}
            className={styles.plate}
          />
        ) : (
          <div className={`${styles.plate} ${styles.board}`} data-tone={tone} />
        )}
        {project.sample && <span className={`chip chip--sample ${styles.sampleTag}`}>{t.common.sample}</span>}
      </div>
    </div>
  )
}

/** The recognition a project received: a gold medal mark and its name. */
function Award({ award, className }: { award: ArchiveProject['award']; className?: string }) {
  const { l } = useI18n()
  if (!award) return null
  return (
    <span className={[styles.award, className].filter(Boolean).join(' ')}>
      <svg className={styles.medal} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M8.5 3h7l-2 6h-3z" />
        <circle cx="12" cy="15" r="5.5" />
        <path d="M12 12.3l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3z" />
      </svg>
      {l(award)}
    </span>
  )
}

function FeaturedProject({ project }: { project: ArchiveProject }) {
  const { t, l } = useI18n()
  const discipline = project.discipline ? DISCIPLINE_BY_ID[project.discipline] : null
  // Only what is known about the project goes into its title block.
  const facts = [
    discipline && { label: t.projects.discipline, value: l(discipline.shortName) },
    project.year && { label: t.projects.year, value: <span dir="ltr">{project.year}</span> },
    project.teamSize && { label: t.projects.team, value: t.projects.teamOf(project.teamSize) },
  ].filter((f) => Boolean(f)) as { label: string; value: ReactNode }[]
  return (
    <article className={styles.featured} aria-labelledby={`${project.id}-title`}>
      <Media project={project} tone="brand" sizes="(min-width: 64rem) 50vw, 100vw" />
      <div className={styles.featuredBody}>
        {discipline && <p className={styles.kicker}>{l(discipline.name)}</p>}
        {project.award && (
          <p>
            <Award award={project.award} />
          </p>
        )}
        <ProjectTitle project={project} className={styles.featuredTitle} />
        <p className={styles.summary}>{l(project.summary)}</p>
        {facts.length > 0 && (
          <dl className={styles.spec}>
            {facts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <ArchiveStatus project={project} />
      </div>
    </article>
  )
}

function ProjectCard({ project }: { project: ArchiveProject }) {
  const { t, l } = useI18n()
  const meta = [project.discipline && l(DISCIPLINE_BY_ID[project.discipline].shortName), project.year].filter(Boolean)
  return (
    <article className={styles.card} aria-labelledby={`${project.id}-title`}>
      <Media project={project} tone="soft" sizes="(min-width: 48rem) 34vw, 100vw" />
      <div className={styles.cardBody}>
        {meta.length > 0 && (
          <p className={styles.cardMeta}>
            {meta.map((m, i) => (
              <span key={i}>
                {i > 0 && <span aria-hidden="true"> · </span>}
                <span dir={i === meta.length - 1 && project.year ? 'ltr' : undefined}>{m}</span>
              </span>
            ))}
          </p>
        )}
        {project.award && (
          <p>
            <Award award={project.award} />
          </p>
        )}
        <ProjectTitle project={project} className={styles.cardTitle} />
        <p className={styles.summary}>{l(project.summary)}</p>
        {project.teamSize && <p className={styles.team}>{t.projects.teamOf(project.teamSize)}</p>}
      </div>
    </article>
  )
}
