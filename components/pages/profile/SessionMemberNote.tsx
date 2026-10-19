'use client'

import { useI18n } from '@/components/i18n/I18nProvider'
import { useDemoSession } from '@/components/platform/DemoSession'
import styles from './Profile.module.css'

/** After the membership form in this tab, explains whose profile the prototype shows. */
export function SessionMemberNote() {
  const { t } = useI18n()
  const { member } = useDemoSession()
  if (!member) return null
  return (
    <p className={`preview-note ${styles.sessionNote}`} role="status">
      <span className="status-dot" aria-hidden="true" />
      <span>{t.platform.membersPage.sessionMember}</span>
    </p>
  )
}
