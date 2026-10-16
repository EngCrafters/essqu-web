import { PROJECTS } from '@/content/projects'
import { getI18n } from '@/lib/i18n/server'
import { ProjectsBrowser } from './ProjectsBrowser'
import styles from './Projects.module.css'

export async function Projects() {
  const { t } = await getI18n()
  return (
    <section id="projects" className={`section ${styles.section}`} aria-labelledby="projects-title">
      <div className="container">
        <header className="section-head">
          <h2 id="projects-title" className="section-title" data-reveal="heading">
            {t.projects.title}
          </h2>
          <div className={styles.headAside} data-reveal="rise">
            <p className="section-lead">{t.projects.lead}</p>
            <p className="preview-note">
              <span className="status-dot" aria-hidden="true" />
              <span>
                <strong>{t.projects.noteStrong}</strong> {t.projects.noteBody}
              </span>
            </p>
          </div>
        </header>
        <ProjectsBrowser projects={PROJECTS} />
      </div>
    </section>
  )
}
