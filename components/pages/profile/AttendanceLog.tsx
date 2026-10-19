'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { CheckInPass } from '@/components/platform/CheckInPass'
import { useDemoSession } from '@/components/platform/DemoSession'
import { Gauge, StatusBadge, type StatusTone } from '@/components/platform/Platform'
import { isPast } from '@/components/platform/registration'
import type { Certificate } from '@/content/platform/certificates'
import type { PlatformEvent } from '@/content/platform/events'
import type { AttendanceEntry } from '@/lib/data'
import { eventDateParts } from '@/lib/format'
import styles from './Profile.module.css'

type Tab = 'all' | 'upcoming' | 'attended' | 'absent' | 'pending'
type Row = { event: PlatformEvent; status: 'registered' | 'waitlisted' | 'attended' | 'absent' | 'pending'; certificate: AttendanceEntry['certificate'] | null; fromSession: boolean }

const TONE: Record<Row['status'], StatusTone> = { registered: 'positive', waitlisted: 'waiting', attended: 'done', absent: 'negative', pending: 'waiting' }

/**
 * The member's attendance log: the records the society holds, plus what the visitor registered
 * for in this tab. Each row says what happened and what it means for a certificate; upcoming
 * registrations carry their check-in pass.
 */
export function AttendanceLog({ entries, events, certificates }: { entries: AttendanceEntry[]; events: PlatformEvent[]; certificates: Certificate[] }) {
  const { t, l, intl } = useI18n()
  const c = t.platform.membersPage
  const session = useDemoSession()
  const [tab, setTab] = useState<Tab>('all')
  const [open, setOpen] = useState<string | null>(null)

  // Records, minus registrations cancelled in this tab, plus registrations made in it.
  const rows: Row[] = entries
    .filter((e) => !(e.status === 'registered' && session.registrations[e.event.slug] === 'cancelled'))
    .map((e) => ({ event: e.event, status: e.status, certificate: e.certificate, fromSession: false }))
  for (const [slug, state] of Object.entries(session.registrations)) {
    if (state === 'cancelled' || rows.some((r) => r.event.slug === slug)) continue
    const event = events.find((e) => e.slug === slug)
    if (event && !isPast(event)) rows.push({ event, status: state, certificate: 'after-event', fromSession: true })
  }
  rows.sort((a, b) => b.event.start.localeCompare(a.event.start))

  const inTab = (r: Row, k: Tab) =>
    k === 'all' ||
    (k === 'upcoming' && (r.status === 'registered' || r.status === 'waitlisted') && !isPast(r.event)) ||
    r.status === k
  const shown = rows.filter((r) => inTab(r, tab))
  const attended = rows.filter((r) => r.status === 'attended').length
  const completed = rows.filter((r) => isPast(r.event)).length
  const tabs: Tab[] = ['all', 'upcoming', 'attended', 'absent', 'pending']

  return (
    <div className={styles.attendanceGrid}>
      <div>
        <div className={styles.tabs} role="tablist" aria-label={c.attendanceTitle}>
          {tabs.map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} aria-controls="attendance-log" className={styles.tab} onClick={() => setTab(k)}>
              {c.tabs[k]}
              <span className={styles.tabCount}>{rows.filter((r) => inTab(r, k)).length}</span>
            </button>
          ))}
        </div>
        <div id="attendance-log" role="tabpanel" aria-label={c.tabs[tab]}>
          {shown.length === 0 ? (
            <p className={styles.empty}>{c.emptyTab}</p>
          ) : (
            <ul className={styles.log}>
              {shown.map((r) => {
                const d = eventDateParts(r.event.start, intl)
                const cert = certificates.find((x) => x.eventSlug === r.event.slug && x.status === 'valid')
                const upcoming = !isPast(r.event) && r.status === 'registered'
                const statusLabel = r.status === 'waitlisted' ? t.platform.status.waitlisted : t.platform.status[r.status]
                return (
                  <li key={r.event.slug} className={styles.entry}>
                    <div className={styles.entryMain}>
                      <span className={styles.entryDate}>
                        <span className={styles.entryDay}>{d.day}</span>
                        <span className={styles.entryMonth}>
                          {d.month} {d.year}
                        </span>
                      </span>
                      <div className={styles.entryBody}>
                        <p className={styles.entryTitle}>
                          <Link href={`/events/${r.event.slug}`}>{l(r.event.title)}</Link>
                        </p>
                        <div className={styles.entryRow}>
                          <StatusBadge tone={TONE[r.status]}>{statusLabel}</StatusBadge>
                          {r.certificate && (
                            <span className={styles.eligibility} data-kind={r.certificate}>
                              {c.certificate[r.certificate]}
                            </span>
                          )}
                          {r.fromSession && <span className={styles.from}>{c.fromSession}</span>}
                        </div>
                        <div className={styles.entryActions}>
                          {upcoming && (
                            <button
                              type="button"
                              className={styles.linkButton}
                              aria-expanded={open === r.event.slug}
                              onClick={() => setOpen((o) => (o === r.event.slug ? null : r.event.slug))}
                            >
                              {open === r.event.slug ? c.hidePass : c.showPass}
                            </button>
                          )}
                          {cert && (
                            <Link href={`/certificates/${cert.id}`} className={styles.linkButton}>
                              {c.openCertificate}
                            </Link>
                          )}
                        </div>
                        {upcoming && open === r.event.slug && (
                          <div className={styles.pass}>
                            <CheckInPass
                              code={`ES-${r.event.slug.slice(0, 3).toUpperCase()}-${r.event.start.slice(5, 7)}${r.event.start.slice(8, 10)}-M07`}
                              title={l(r.event.title)}
                              when={d.long}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
      <aside className={styles.attendanceAside}>
        <Gauge value={attended} max={Math.max(completed, 1)} label={`${completed ? Math.round((attended / completed) * 100) : 0}%`} sublabel={c.rate} />
        <p className={styles.small} style={{ textAlign: 'center', marginTop: 'var(--space-2)' }}>
          {c.rateNote(attended, completed)}
        </p>
        <div className={styles.checkIn}>
          <h2 className={styles.checkInTitle}>{c.checkInTitle}</h2>
          <ol>
            {c.checkIn.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  )
}
