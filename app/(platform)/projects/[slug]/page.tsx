import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { ScrollReveals } from '@/components/motion/ScrollReveals'
import { MediaViewer } from '@/components/pages/projects/MediaViewer'
import { AwardBadge, StagePath } from '@/components/pages/projects/ProjectStatus'
import styles from '@/components/pages/projects/ProjectDetail.module.css'
import sheetStyles from '@/components/pages/projects/Projects.module.css'
import { Breadcrumbs } from '@/components/platform/Breadcrumbs'
import { Monogram, SampleNotice, TitleBlock } from '@/components/platform/Platform'
import { DisciplineLink } from '@/components/ui/DisciplineLink'
import { IconArrowRight } from '@/components/ui/icons'
import { Plate } from '@/components/ui/Plate'
import { DISCIPLINE_BY_ID } from '@/content/disciplines'
import { PROJECT_STAGES } from '@/content/platform/projects'
import { DISCIPLINE_COLOR, TECHNOLOGIES } from '@/content/platform/taxonomy'
import { getMembers, getProject, getRelatedProjects } from '@/lib/data'
import { getI18n } from '@/lib/i18n/server'
import { routes } from '@/lib/routes'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const [{ t, l }, project] = await Promise.all([getI18n(), getProject(slug)])
  if (!project) return { title: t.platform.projectsPage.metaTitle }
  return { title: `${l(project.title)} · ${t.platform.projectsPage.eyebrow}`, description: l(project.summary) }
}

/**
 * A project page built around the questions a student, researcher or partner arrives with:
 * what it is and where it stands (the first screen), the problem and the solution, how it
 * works, how far it has come, what has been measured or won, who built it, and how to help.
 */
export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [{ t, l }, project, members] = await Promise.all([getI18n(), getProject(slug), getMembers()])
  if (!project) notFound()
  const c = t.platform.projectsPage
  const related = await getRelatedProjects(project)
  const team = project.contributors.map((id) => members.find((m) => m.id === id)).filter((m) => m !== undefined)
  const at = PROJECT_STAGES.indexOf(project.stage)
  const award = project.achievements[0]

  return (
    <>
      <header className={styles.hero} style={{ '--key': DISCIPLINE_COLOR[project.discipline] } as CSSProperties}>
        <div className="container">
          <Breadcrumbs trail={[{ href: routes.projects, label: t.nav.links.projects }]} current={l(project.title)} />
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.chips}>
                <DisciplineLink id={project.discipline} className="chip" style={{ borderColor: DISCIPLINE_COLOR[project.discipline] }}>
                  {l(DISCIPLINE_BY_ID[project.discipline].name)}
                </DisciplineLink>
                <span className="chip">{c.types[project.type]}</span>
              </p>
              <h1 className={`${styles.title} intro-item`}>{l(project.title)}</h1>
              <p className={`${styles.summary} intro-item`} style={{ '--i': 1 } as CSSProperties}>
                {l(project.summary)}
              </p>
              <div className={`${styles.status} intro-item`} style={{ '--i': 2 } as CSSProperties}>
                <StagePath stage={project.stage} />
                {award && <AwardBadge award={award} />}
              </div>
              <section aria-labelledby="glance" className={`${styles.glance} intro-item`} style={{ '--i': 3 } as CSSProperties}>
                <h2 id="glance" className={styles.label}>
                  {c.atAGlance}
                </h2>
                <TitleBlock
                  className={styles.block}
                  rows={[
                    {
                      label: c.discipline,
                      value: <DisciplineLink id={project.discipline}>{l(DISCIPLINE_BY_ID[project.discipline].shortName)}</DisciplineLink>,
                    },
                    { label: c.year, value: project.year },
                    {
                      label: c.team,
                      value: (
                        <span className={styles.teamCell}>
                          <span className={styles.faces} aria-hidden="true">
                            {team.slice(0, 4).map((m) => (
                              <Monogram key={m.id} name={m.name} discipline={m.discipline} size={24} />
                            ))}
                          </span>
                          {c.teamSize(team.length)}
                        </span>
                      ),
                    },
                    { label: c.recognition, value: award ? `${c.results[award.result]} · ${award.year}` : '—' },
                    { label: c.technologies, value: project.technologies.map((x) => l(TECHNOLOGIES[x])).join(' · ') },
                    {
                      label: c.also,
                      value: project.alsoDisciplines?.length
                        ? project.alsoDisciplines.map((d, i) => (
                            <span key={d}>
                              {i > 0 && ' · '}
                              <DisciplineLink id={d}>{l(DISCIPLINE_BY_ID[d].shortName)}</DisciplineLink>
                            </span>
                          ))
                        : '—',
                    },
                  ]}
                />
              </section>
            </div>
            <MediaViewer project={project} items={project.media} className={styles.media} />
          </div>
        </div>
      </header>

      <div className={`container ${styles.body}`}>
        {/* What it is and why it matters. */}
        <div className={styles.pair}>
          <section aria-labelledby="problem" className={styles.panel}>
            <h2 id="problem" className={styles.label}>
              {c.problem}
            </h2>
            <p className={styles.lead}>{l(project.problem)}</p>
          </section>
          <section aria-labelledby="solution" className={styles.panel}>
            <h2 id="solution" className={styles.label}>
              {c.solution}
            </h2>
            <p className={styles.lead}>{l(project.solution)}</p>
          </section>
        </div>

        {/* How it works: the overview, the decisions behind it, the parts on demand. */}
        <section aria-labelledby="technical" className={styles.technical}>
          <h2 id="technical" className={styles.sectionTitle} data-reveal="heading">
            {c.technical}
          </h2>
          <div className={styles.technicalGrid}>
            <p className={styles.text}>{l(project.technicalApproach.overview)}</p>
            <div>
              <h3 className={styles.label}>{c.decisions}</h3>
              <ol className={styles.decisions}>
                {project.technicalApproach.decisions.map((d, i) => (
                  <li key={i}>{l(d)}</li>
                ))}
              </ol>
            </div>
          </div>
          <details className={styles.more}>
            <summary>
              {c.components} <span className={styles.count}>{project.parts.length}</span>
            </summary>
            <table className={styles.parts}>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">{c.parts}</th>
                  <th scope="col">{c.qty}</th>
                </tr>
              </thead>
              <tbody>
                {project.parts.map((p, i) => (
                  <tr key={i}>
                    <td>{String(i + 1).padStart(2, '0')}</td>
                    <td>{l(p.name)}</td>
                    <td>{p.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </section>

        {/* How far it has come: completed → now → next. */}
        <section aria-labelledby="journey" className={styles.journey}>
          <h2 id="journey" className={styles.sectionTitle} data-reveal="heading">
            {c.journey}
          </h2>
          <ol className={styles.route} data-reveal="points">
            {PROJECT_STAGES.map((s, i) => (
              <li key={s} className={styles.step} data-state={i < at ? 'done' : i === at ? 'current' : i === at + 1 ? 'next' : 'todo'}>
                <span className={styles.stepRule} data-part="rule" aria-hidden="true" />
                <span className={styles.stepDot} aria-hidden="true" />
                <span className={styles.stepName} data-part="text">
                  {c.stages[s]}
                </span>
                {i === at && <span className={styles.stepTag}>{c.current}</span>}
                {i === at + 1 && <span className={styles.stepTag}>{c.next}</span>}
              </li>
            ))}
          </ol>
          <div className={styles.journeyGrid}>
            <div>
              <h3 className={styles.label}>{c.done}</h3>
              <ul className={styles.milestones}>
                {project.development.map((d, i) => (
                  <li key={i}>{l(d)}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className={styles.label}>{c.next}</h3>
              <p className={styles.text}>{l(project.nextSteps)}</p>
            </div>
          </div>
        </section>

        {/* What has been measured, and what has been won. */}
        <div className={styles.pair}>
          <section aria-labelledby="validation" className={styles.panel}>
            <h2 id="validation" className={styles.label}>
              {c.validation}
            </h2>
            {project.validation.length === 0 ? (
              <p className={styles.empty}>{c.noValidation}</p>
            ) : (
              <dl className={styles.results}>
                {project.validation.map((v, i) => (
                  <div key={i}>
                    <dt>{l(v.measure)}</dt>
                    <dd>{l(v.result)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
          <section aria-labelledby="awards" className={styles.panel}>
            <h2 id="awards" className={styles.label}>
              {c.awards}
            </h2>
            {project.achievements.length === 0 ? (
              <p className={styles.empty}>{c.noAwards}</p>
            ) : (
              <ul className={styles.awards}>
                {project.achievements.map((a, i) => (
                  <li key={i}>
                    <AwardBadge award={a} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Who built it, and how to work with them. */}
        <div className={styles.pair}>
          <section aria-labelledby="team" className={styles.panel}>
            <h2 id="team" className={styles.label}>
              {c.contributors}
            </h2>
            <ul className={styles.team}>
              {team.map((m) => (
                <li key={m.id}>
                  <Link href={routes.member(m.id)} className={styles.member} aria-label={c.viewProfile(l(m.name))}>
                    <Monogram name={m.name} discipline={m.discipline} size={36} />
                    <span className={styles.memberText}>
                      {l(m.name)}
                      <span className={styles.memberMeta}>
                        {l(DISCIPLINE_BY_ID[m.discipline].shortName)} · {t.platform.common.yearN(m.year)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className={styles.note}>{c.contributorsNote}</p>
          </section>
          <section aria-labelledby="collaborate" className={`${styles.panel} ${styles.collaborate}`}>
            <h2 id="collaborate" className={styles.label}>
              {c.collaboration}
            </h2>
            <dl className={styles.collab}>
              <div>
                <dt>{c.seeking}</dt>
                <dd>{l(project.collaboration.seeking)}</dd>
              </div>
              {project.collaboration.application && (
                <div>
                  <dt>{c.application}</dt>
                  <dd>{l(project.collaboration.application)}</dd>
                </div>
              )}
            </dl>
            <Link href={routes.leadership} className="btn btn--secondary btn--compact">
              {c.contact}
              <IconArrowRight className="btn__arrow" />
            </Link>
            <p className={styles.note}>{c.contactNote}</p>
          </section>
        </div>

        <SampleNotice />
      </div>

      {related.length > 0 && (
        <section className={styles.related} aria-labelledby="related-projects">
          <div className="container">
            <h2 id="related-projects" className={styles.sectionTitle} data-reveal="heading">
              {c.related}
            </h2>
            <ul className={styles.relatedList}>
              {related.map((p) => (
                <li key={p.slug} className={sheetStyles.sheetCard} style={{ '--key': DISCIPLINE_COLOR[p.discipline] } as CSSProperties}>
                  <div className={sheetStyles.sheetMedia}>
                    <Plate id={`rel-${p.slug}`} drawing={p.drawing} tone="ivory" className={sheetStyles.sheetPlate} />
                  </div>
                  <div className={sheetStyles.sheetBody}>
                    <h3 className={sheetStyles.sheetTitle}>
                      <Link href={routes.project(p.slug)} className={sheetStyles.sheetLink}>
                        {l(p.title)}
                      </Link>
                    </h3>
                    <StagePath stage={p.stage} compact />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      <ScrollReveals />
    </>
  )
}
