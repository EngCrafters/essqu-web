import Link from 'next/link'
import { IconArrowRight } from '@/components/ui/icons'
import { getI18n } from '@/lib/i18n/server'
import { routes } from '@/lib/routes'
import styles from './NotFound.module.css'

type RecordKind = 'event' | 'project' | 'member' | 'graduate' | 'certificate'

const SECTION: Record<RecordKind, string> = {
  event: routes.events,
  project: routes.projects,
  member: routes.members,
  graduate: routes.network,
  certificate: routes.certificates,
}

/**
 * The 404 page: an empty drawing sheet with its title block, and ways back. For a record that
 * doesn't exist (an event, a project, a person, a certificate) it names what was missing and
 * leads first to that record's own section.
 */
export async function NotFoundView({ record }: { record?: RecordKind }) {
  const { t } = await getI18n()
  const c = t.platform.notFound
  const r = record ? c.records[record] : null
  return (
    <section className={styles.page} aria-labelledby="nf-title">
      <div className={`container ${styles.grid}`}>
        <div>
          <p className={styles.code}>{c.code}</p>
          <h1 id="nf-title" className={styles.title}>
            {r ? r.title : c.title}
          </h1>
          <p className={styles.body}>{r ? r.body : c.body}</p>
          <div className={styles.actions}>
            {record && r ? (
              <>
                <Link href={SECTION[record]} className="btn btn--primary">
                  {r.action}
                  <IconArrowRight className="btn__arrow" />
                </Link>
                <Link href={routes.home} className="btn btn--secondary">
                  {c.home}
                </Link>
              </>
            ) : (
              <>
                <Link href={routes.home} className="btn btn--primary">
                  {c.home}
                  <IconArrowRight className="btn__arrow" />
                </Link>
                <Link href={routes.events} className="btn btn--secondary">
                  {c.events}
                </Link>
              </>
            )}
          </div>
        </div>
        <svg className={styles.sheet} viewBox="0 0 400 280" aria-hidden="true" focusable="false">
          <defs>
            <pattern id="nf-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M20 0H0V20" className={styles.gridLine} />
            </pattern>
          </defs>
          <rect x="8" y="8" width="384" height="264" className={styles.paper} />
          <rect x="8" y="8" width="384" height="264" fill="url(#nf-grid)" />
          <rect x="20" y="20" width="360" height="240" className={styles.border} />
          <path d="M80 140h240M200 70v140" className={styles.axis} />
          <circle cx="200" cy="140" r="34" className={styles.missing} />
          <path d="M184 124l32 32M216 124l-32 32" className={styles.cross} />
          <rect x="250" y="220" width="130" height="40" className={styles.border} />
          <path d="M315 220v40" className={styles.border} />
          <text x="282" y="240" className={styles.value} textAnchor="middle" dominantBaseline="central">
            404
          </text>
          <text x="347" y="240" className={styles.value} textAnchor="middle" dominantBaseline="central">
            —
          </text>
        </svg>
      </div>
    </section>
  )
}
