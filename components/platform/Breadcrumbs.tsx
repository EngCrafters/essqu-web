import Link from 'next/link'
import { IconArrowRight } from '@/components/ui/icons'
import { getI18n } from '@/lib/i18n/server'
import styles from './Breadcrumbs.module.css'

/**
 * Where a deep page sits: its parent section, then the page itself (`Projects / Line-following
 * rover`). The first crumb carries the back arrow, so the way out is always obvious; the
 * current page's name truncates rather than wrap the trail.
 */
export async function Breadcrumbs({ trail, current, className }: { trail: { href: string; label: string }[]; current: string; className?: string }) {
  const { t } = await getI18n()
  return (
    <nav aria-label={t.nav.breadcrumb} className={[styles.crumbs, className].filter(Boolean).join(' ')}>
      <ol className={styles.list}>
        {trail.map((c, i) => (
          <li key={c.href} className={styles.item}>
            <Link href={c.href} className={styles.link}>
              {i === 0 && <IconArrowRight className={styles.back} />}
              {c.label}
            </Link>
          </li>
        ))}
        <li className={styles.item}>
          <span className={styles.current} aria-current="page">
            {current}
          </span>
        </li>
      </ol>
    </nav>
  )
}
