'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { CheckInPass } from '@/components/platform/CheckInPass'
import { useDemoSession } from '@/components/platform/DemoSession'
import { Gauge, Modal, StatusBadge } from '@/components/platform/Platform'
import { STATUS_TONE, eventStatus, myRegistration, seatsTaken } from '@/components/platform/registration'
import { IconArrowRight } from '@/components/ui/icons'
import type { PlatformEvent } from '@/content/platform/events'
import { eventDateParts } from '@/lib/format'
import { routes } from '@/lib/routes'
import styles from './Events.module.css'

type Dialog = null | 'confirm' | 'cancel'

/**
 * The registration panel: one capacity dial and one action, whatever the state. Open →
 * confirm → registered (with a check-in pass); waitlist → join → waitlisted; full, closed and
 * completed explain themselves. Everything happens in this tab only (useDemoSession).
 */
export function RegistrationPanel({ event, held }: { event: PlatformEvent; held: string[] }) {
  const { t, l, intl } = useI18n()
  const c = t.platform.eventsPage
  const session = useDemoSession()
  const [dialog, setDialog] = useState<Dialog>(null)
  const [justDone, setJustDone] = useState(false)
  const mine = myRegistration(event.slug, session.registrations, held)
  const status = eventStatus(event, mine)
  const taken = seatsTaken(event, session.registrations, held)
  const waitlistMode = status === 'waitlist' || status === 'waitlisted'

  const confirm = () => {
    session.register(event.slug, event.registration === 'waitlist' ? 'waitlisted' : 'registered')
    setDialog(null)
    setJustDone(true)
  }

  const when = eventDateParts(event.start, intl).long
  const code = `ES-${event.slug.slice(0, 3).toUpperCase()}-${event.start.slice(5, 7)}${event.start.slice(8, 10)}-M07`

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <StatusBadge tone={STATUS_TONE[status]}>{t.platform.status[status]}</StatusBadge>
        <span className={styles.panelNote}>
          {c.capacity}: {event.capacity}
        </span>
      </div>

      {status === 'completed' ? (
        <Gauge value={event.attended ?? 0} max={event.capacity} label={String(event.attended ?? 0)} sublabel={t.platform.status.attended} />
      ) : (
        <Gauge
          value={taken}
          max={event.capacity}
          label={c.seatGauge(taken, event.capacity)}
          sublabel={waitlistMode ? c.waitlistCount(event.waitlist ?? 0) : c.seatsTaken}
        />
      )}

      {justDone && (status === 'registered' || status === 'waitlisted') && (
        <p className={styles.done} role="status">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          {status === 'registered' ? c.doneTitle : c.doneWaitlistTitle}
        </p>
      )}

      <div className={styles.panelActions}>
        {status === 'open' && (
          <button type="button" className="btn btn--primary" onClick={() => setDialog('confirm')}>
            {c.register}
            <IconArrowRight className="btn__arrow" />
          </button>
        )}
        {status === 'waitlist' && (
          <button type="button" className="btn btn--primary" onClick={() => setDialog('confirm')}>
            {c.joinWaitlist}
          </button>
        )}
        {status === 'full' && (
          <>
            <button type="button" className="btn btn--secondary" aria-disabled="true" disabled>
              {t.platform.status.full}
            </button>
            <p className={styles.panelNote}>{c.fullNote}</p>
          </>
        )}
        {status === 'closed' && (
          <>
            <button type="button" className="btn btn--secondary" aria-disabled="true" disabled>
              {t.platform.status.closed}
            </button>
            <p className={styles.panelNote}>{c.closedNote}</p>
          </>
        )}
        {status === 'completed' && (
          <>
            <p className={styles.panelNote}>
              {c.completedNote(event.attended ?? 0)} {c.completedCertificates}
            </p>
            <Link href={routes.certificates} className="btn btn--secondary">
              {c.toCertificates}
              <IconArrowRight className="btn__arrow" />
            </Link>
          </>
        )}
        {status === 'registered' && (
          <>
            <p className={styles.panelNote}>{c.registeredNote}</p>
            <CheckInPass code={code} title={l(event.title)} when={when} />
            <Link href={routes.profileEvents} className="btn btn--secondary">
              {c.toMyEvents}
              <IconArrowRight className="btn__arrow" />
            </Link>
            <button type="button" className={styles.quiet} onClick={() => setDialog('cancel')}>
              {c.cancel}
            </button>
          </>
        )}
        {status === 'waitlisted' && (
          <>
            <p className={styles.panelNote}>{c.waitlistedNote}</p>
            <Link href={routes.profileEvents} className="btn btn--secondary">
              {c.toMyEvents}
              <IconArrowRight className="btn__arrow" />
            </Link>
            <button type="button" className={styles.quiet} onClick={() => setDialog('cancel')}>
              {c.leaveWaitlist}
            </button>
          </>
        )}
      </div>

      <Modal
        open={dialog === 'confirm'}
        onClose={() => setDialog(null)}
        title={event.registration === 'waitlist' ? c.confirmWaitlistTitle : c.confirmTitle}
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setDialog(null)}>
              {t.platform.common.cancel}
            </button>
            <button type="button" className="btn btn--primary" onClick={confirm}>
              {event.registration === 'waitlist' ? c.confirmWaitlist : c.confirm}
            </button>
          </>
        }
      >
        <p>{c.confirmBody(l(event.title))}</p>
        <p className="preview-note">
          <span className="status-dot" aria-hidden="true" />
          <span>{c.confirmPrototype}</span>
        </p>
      </Modal>

      <Modal
        open={dialog === 'cancel'}
        onClose={() => setDialog(null)}
        title={c.cancelTitle}
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setDialog(null)}>
              {c.keep}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                session.cancel(event.slug)
                setDialog(null)
                setJustDone(false)
              }}
            >
              {c.confirmCancel}
            </button>
          </>
        }
      >
        <p>{c.cancelBody}</p>
      </Modal>
    </div>
  )
}
