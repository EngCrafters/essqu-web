'use client'

import { useI18n } from '@/components/i18n/I18nProvider'
import { PROJECT_STAGES, type Achievement, type ProjectStage } from '@/content/platform/projects'
import styles from './ProjectStatus.module.css'

/**
 * Where a project stands: the stage named in words, over a seven-step drafting scale with the
 * steps behind it filled and the current one marked. No percentages: a stage says more.
 */
export function StagePath({ stage, tone = 'light', compact = false }: { stage: ProjectStage; tone?: 'light' | 'dark'; compact?: boolean }) {
  const { t } = useI18n()
  const c = t.platform.projectsPage
  const at = PROJECT_STAGES.indexOf(stage)
  return (
    <div className={styles.stage} data-tone={tone} data-compact={compact || undefined}>
      <p className={styles.stageName}>
        {!compact && <span className={styles.stageKicker}>{c.stage}</span>}
        <span className={styles.stageValue}>{c.stages[stage]}</span>
        <span className="visually-hidden">, {c.stageStep(at + 1, PROJECT_STAGES.length)}</span>
      </p>
      <ol className={styles.track} aria-hidden="true">
        {PROJECT_STAGES.map((s, i) => (
          <li key={s} data-state={i < at ? 'done' : i === at ? 'current' : 'todo'} title={c.stages[s]} />
        ))}
      </ol>
    </div>
  )
}

/** A competition result, set apart in gold. Sample results say so. */
export function AwardBadge({ award, tone = 'light' }: { award: Achievement; tone?: 'light' | 'dark' }) {
  const { t, l } = useI18n()
  const c = t.platform.projectsPage
  const body = (
    <>
      <svg className={styles.medal} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M8 3l2.4 5M16 3l-2.4 5" />
        <circle cx="12" cy="14" r="6" />
        <path d="M12 11l.9 1.9 2.1.3-1.5 1.4.4 2.1-1.9-1-1.9 1 .4-2.1-1.5-1.4 2.1-.3z" />
      </svg>
      <span className={styles.awardText}>
        <strong>{c.results[award.result]}</strong>
        <span>
          {l(award.competition)} {award.year}
        </span>
      </span>
      {award.sample && <span className={styles.awardSample}>{c.sampleResult}</span>}
    </>
  )
  return award.href ? (
    <a href={award.href} className={styles.award} data-tone={tone} target="_blank" rel="noopener noreferrer">
      {body}
    </a>
  ) : (
    <p className={styles.award} data-tone={tone}>
      {body}
    </p>
  )
}
