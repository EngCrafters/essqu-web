import type { Metadata } from 'next'
import { AttendanceLog } from '@/components/pages/profile/AttendanceLog'
import styles from '@/components/pages/profile/Profile.module.css'
import { Breadcrumbs } from '@/components/platform/Breadcrumbs'
import { PlatformHero, SampleNotice } from '@/components/platform/Platform'
import { getCurrentMember, getEvents } from '@/lib/data'
import { getI18n } from '@/lib/i18n/server'
import { routes } from '@/lib/routes'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: `${t.platform.membersPage.attendanceTitle} · ${t.site.name}`, robots: { index: false } }
}

export default async function AttendancePage() {
  const { t } = await getI18n()
  const c = t.platform.membersPage
  const [me, events] = await Promise.all([getCurrentMember(), getEvents()])
  return (
    <>
      <PlatformHero
        trail={<Breadcrumbs trail={[{ href: routes.profile, label: t.platform.nav.profile }]} current={c.attendanceTitle} />}
        eyebrow={c.you}
        title={c.attendanceTitle}
        lead={<p>{c.attendanceLead}</p>}
        layout="stack"
        tone="surface"
      >
        <p className="preview-note">
          <span className="status-dot" aria-hidden="true" />
          <span>{c.ownNote}</span>
        </p>
      </PlatformHero>
      <section className={styles.attendance} aria-label={c.attendanceTitle}>
        <div className="container">
          <AttendanceLog entries={me.attendance} events={events} certificates={me.certificates} />
          <SampleNotice className={styles.sample} />
        </div>
      </section>
    </>
  )
}
