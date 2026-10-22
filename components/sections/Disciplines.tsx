import Link from 'next/link'
import { DISCIPLINES } from '@/content/disciplines'
import { PROJECTS } from '@/content/projects'
import { DisciplineSymbol } from '@/components/ui/DisciplineSymbol'
import { getI18n } from '@/lib/i18n/server'
import { routes } from '@/lib/routes'
import { DisciplineProjectsLink } from './DisciplineProjectsLink'
import styles from './Disciplines.module.css'

export async function Disciplines() {
  const { t, l } = await getI18n()
  // An action appears only where it leads somewhere real: a discipline with archive entries.
  const withProjects = new Set(PROJECTS.flatMap((p) => (p.discipline ? [p.discipline] : [])))

  return (
    <section id="disciplines" className={`section ${styles.section}`} aria-labelledby="disciplines-title">
      <div className="container">
        <header className="section-head">
          <h2 id="disciplines-title" className="section-title" data-reveal="heading">
            {t.disciplines.title}
          </h2>
        </header>

        <ul className={styles.index} data-reveal="index">
          {DISCIPLINES.map((d) => (
            <li key={d.id} className={styles.row} data-symbol-row="">
              <span className={styles.rule} data-part="rule" aria-hidden="true" />
              <DisciplineSymbol id={d.id} className={styles.symbol} />
              <div className={styles.text} data-part="text">
                <h3 className={styles.name}>
                  <Link href={routes.discipline(d.id)} className={styles.nameLink}>
                    {l(d.name)}
                  </Link>
                </h3>
                <p className={styles.focus}>{l(d.focus)}</p>
                <p className={styles.description}>{l(d.description)}</p>
              </div>
              {withProjects.has(d.id) && (
                <DisciplineProjectsLink discipline={d.id} name={l(d.shortName)} className={styles.action} />
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
