import { Skeleton } from '@/components/discovery/Discovery'
import styles from './NotFound.module.css'

/** A neutral page skeleton while a platform page's data loads: a title block and three cards. */
export function PageSkeleton() {
  return (
    <section className={styles.page} aria-busy="true">
      <div className={`container ${styles.skeleton}`}>
        <Skeleton style={{ width: 120, height: 14 }} />
        <Skeleton style={{ width: 'min(100%, 34rem)', height: 56 }} />
        <Skeleton style={{ width: 'min(100%, 28rem)', height: 18 }} />
        <div className={styles.skeletonCards}>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} style={{ height: 220, borderRadius: 18 }} />
          ))}
        </div>
      </div>
    </section>
  )
}
