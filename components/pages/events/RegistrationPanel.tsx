'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { CheckInPass } from '@/components/platform/CheckInPass'
import { useDemoSession } from '@/components/platform/DemoSession'
import { Gauge, Modal, StatusBadge } from '@/components/platform/Platform'
import { STATUS_TONE, eventStatus, myRegistration, seatsTaken, type EventStatus } from '@/components/platform/registration'
import { IconArrowRight } from '@/components/ui/icons'
import { isSampleEvent, type EventView, type PlatformEvent } from '@/content/platform/events'
import {
  EMAIL_MAX,
  NAME_MAX,
  registrationBody,
  submitRegistration,
  validateRegistration,
  type FieldProblem,
  type RegistrationField,
} from '@/lib/core-api/registration'
import type { RegistrationTransport } from '@/lib/data'
import { eventDateParts } from '@/lib/format'
import { routes } from '@/lib/routes'
import styles from './Events.module.css'
import { memberAuthClient, type MemberAuthSettings } from '@/lib/member-auth/client'
import { isMemberProfile, memberCall, fetchMemberEvent, normalizePhone, type MemberProfile } from '@/lib/core-api/member-events'
import { eventManagement } from '@/lib/i18n/dictionaries/pages/event-management'

type Dialog = null | 'confirm' | 'cancel'

/** Wall-clock milliseconds, for event handlers only (never read while rendering). */
const wallClock = () => Date.now()

/**
 * The registration panel. Sample events keep the prototype, which lives in this browser tab only;
 * events published through the Core platform register for real, straight from the browser to
 * Core (lib/core-api/registration.ts).
 */
export function RegistrationPanel({
  event,
  held,
  now,
  registration,
  authSettings,
}: {
  event: EventView
  held: string[]
  now?: string
  registration: RegistrationTransport
  authSettings?: MemberAuthSettings | null
}) {
  if (registration.kind === 'sample' && isSampleEvent(event)) return <SampleRegistration event={event} held={held} />
  return <CoreRegistration event={event} now={now} baseUrl={registration.kind === 'core' ? registration.baseUrl : null} authSettings={authSettings ?? null} />
}

/**
 * The prototype: one capacity dial and one action, whatever the state. Open → confirm →
 * registered (with a check-in pass); waitlist → join → waitlisted; full, closed and completed
 * explain themselves. Everything happens in this tab only (useDemoSession).
 */
function SampleRegistration({ event, held }: { event: PlatformEvent; held: string[] }) {
  const { t, l, intl } = useI18n()
  const c = t.platform.eventsPage
  const session = useDemoSession()
  const [dialog, setDialog] = useState<Dialog>(null)
  const [justDone, setJustDone] = useState(false)
  const mine = myRegistration(event.slug, session.registrations, held)
  const status = eventStatus(event, mine)
  const taken = seatsTaken(event, session.registrations, held) ?? 0
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

/**
 * Registration for an event published through the Core platform. The same panel and dialog as the
 * prototype, with the two fields Core needs. Core decides the outcome; nothing is claimed until it
 * answers, a pending request can't be sent twice, and nothing typed is kept after success. Core
 * publishes no capacity or count, issues no check-in pass and has no member accounts or
 * cancellation yet, so the dial, the pass, "your events" and "cancel" don't appear here.
 *
 * When Core says why a registration conflicted, the panel follows it: full → the waitlist is
 * offered (joined only by a second, explicit submit), a place is free → register, closed → closed.
 */
function CoreRegistration({
  event,
  now,
  baseUrl,
  authSettings,
}: {
  event: EventView
  now?: string
  baseUrl: string | null
  authSettings: MemberAuthSettings | null
}) {
  const { t, l, locale } = useI18n()
  const copy = eventManagement[locale]
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [checking, setChecking] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [guestChoice, setGuestChoice] = useState(false)
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [requiresPhone, setRequiresPhone] = useState(event.phoneRequired ?? false)
  const c = t.platform.eventsPage
  const formId = useId()
  const [open, setOpen] = useState(false)
  /** The event's availability as Core last reported it: from the page, or from a 409 since. */
  const [availability, setAvailability] = useState(event.registration)
  const [values, setValues] = useState({ name: '', email: '' })
  const [touched, setTouched] = useState<Partial<Record<RegistrationField, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  /** Fields Core itself rejected, until they are edited. */
  const [rejected, setRejected] = useState<RegistrationField[]>([])
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [result, setResult] = useState<'confirmed' | 'waitlisted' | null>(null)
  const inFlight = useRef(false)
  /** After a 429 with Retry-After: until when a submission would only be refused again. */
  const retryAt = useRef(0)
  const doneRef = useRef<HTMLParagraphElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const fieldRefs = useRef<Partial<Record<RegistrationField, HTMLInputElement | null>>>({})

  // Core's answer takes the focus once it is on screen (after the dialog has closed and returned
  // focus to a button that no longer exists), so assistive technology announces it.
  useEffect(() => {
    if (result) doneRef.current?.focus()
  }, [result])

  const status: EventStatus =
    result === 'confirmed' ? 'registered' : result === 'waitlisted' ? 'waitlisted' : eventStatus({ ...event, registration: availability }, undefined, now)
  const waitlist = availability === 'waitlist'
  const closed = availability === 'closed' || availability === 'full'
  const problems = validateRegistration(values)
  const problemFor = (field: RegistrationField): FieldProblem | undefined =>
    (submitted || touched[field] ? problems[field] : undefined) ?? (rejected.includes(field) ? 'invalid' : undefined)

  // Escape can close the dialog even while a request is pending; a failure then reopens it, so the
  // visitor always sees Core's answer.
  const close = () => {
    setOpen(false)
    setFailure(null)
  }
  const fail = (message: string) => {
    setFailure(message)
    setOpen(true)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (inFlight.current || !baseUrl || checking || blocked) return
    setSubmitted(true)
    setFailure(null)
    const firstInvalid = (['attendeeName', 'attendeeEmail'] as const).find((f) => problems[f])
    if (firstInvalid) {
      fieldRefs.current[firstInvalid]?.focus()
      return
    }
    const requiredPhone = requiresPhone && !profile?.phone
    const normalizedPhone = requiredPhone ? normalizePhone(phone) : null
    if (requiredPhone && !normalizedPhone) {
      setPhoneError(copy.invalidPhone)
      phoneRef.current?.focus()
      return
    }
    // Core would refuse it again; say so without sending.
    const wait = retryAt.current - wallClock()
    if (wait > 0) return fail(c.outcome.rateLimitedIn(Math.ceil(wait / 60000)))
    inFlight.current = true
    setPending(true)
    let outcome
    if (profile && authSettings) {
      if (normalizedPhone) {
        const saved = await memberCall<MemberProfile>(authSettings, baseUrl, '/me/profile', 'PATCH', { phone: normalizedPhone })
        if (!saved.ok || !isMemberProfile(saved.data)) {
          inFlight.current = false
          setPending(false)
          return fail(copy.phoneSaveFailed)
        }
        setProfile(saved.data)
      }
      const result = await memberCall<{ status: 'confirmed' | 'waitlisted' }>(authSettings, baseUrl, `/me/events/${event.slug}/registrations`, 'POST', {
        intent: waitlist ? 'join_waitlist' : 'register',
      })
      if (!result.ok && result.code === 'PHONE_REQUIRED') {
        setRequiresPhone(true)
        inFlight.current = false
        setPending(false)
        return fail(copy.phoneRequired)
      }
      outcome =
        result.ok && ['confirmed', 'waitlisted'].includes(result.data.status)
          ? ({ kind: result.data.status } as const)
          : result.ok
            ? ({ kind: 'unavailable' } as const)
            : result.status === 409
              ? ({
                  kind: 'conflict',
                  reason: (
                    {
                      ALREADY_REGISTERED: 'already-registered',
                      ALREADY_WAITLISTED: 'already-waitlisted',
                      EVENT_FULL: 'event-full',
                      REGISTRATION_CLOSED: 'registration-closed',
                      REGISTRATION_AVAILABLE: 'registration-available',
                    } as const
                  )[result.code as 'EVENT_FULL'],
                } as const)
              : result.status === 429
                ? ({ kind: 'rate-limited', retryAfterSeconds: result.retryAfterSeconds ?? 600 } as const)
                : ({ kind: 'unavailable' } as const)
    } else {
      outcome = await submitRegistration(baseUrl, event.slug, {
        ...registrationBody({ ...values, waitlist }),
        ...(normalizedPhone ? { attendeePhone: normalizedPhone } : {}),
      })
    }
    inFlight.current = false
    setPending(false)
    switch (outcome.kind) {
      case 'phone-required':
        setRequiresPhone(true)
        return fail(copy.guestPhone)
      case 'confirmed':
      case 'waitlisted':
        setResult(outcome.kind)
        setOpen(false)
        // What was typed isn't needed any more, so it isn't kept.
        setValues({ name: '', email: '' })
        return
      case 'invalid':
        setRejected(outcome.fields)
        fail(c.outcome.invalid)
        if (outcome.fields[0]) requestAnimationFrame(() => fieldRefs.current[outcome.fields[0]!]?.focus())
        return
      case 'conflict':
        switch (outcome.reason) {
          case 'already-registered':
            return fail(c.outcome.alreadyRegistered)
          case 'already-waitlisted':
            return fail(c.outcome.alreadyWaitlisted)
          // The dialog turns into the waitlist one; nothing is sent until the visitor submits it.
          case 'event-full':
            setAvailability('waitlist')
            return fail(c.outcome.eventFull)
          case 'registration-available':
            setAvailability('open')
            return fail(c.outcome.registrationAvailable)
          case 'registration-closed':
            setAvailability('closed')
            return fail(c.outcome.registrationClosed)
          default:
            return fail(c.outcome.conflict)
        }
      case 'not-found':
        return fail(c.outcome.notFound)
      case 'rate-limited':
        if (outcome.retryAfterSeconds) retryAt.current = wallClock() + outcome.retryAfterSeconds * 1000
        return fail(outcome.retryAfterSeconds ? c.outcome.rateLimitedIn(Math.ceil(outcome.retryAfterSeconds / 60)) : c.outcome.rateLimited)
      case 'unavailable':
        return fail(c.outcome.unavailable)
    }
  }

  const field = (
    key: RegistrationField,
    input: { label: string; type: 'text' | 'email'; autoComplete: string; max: number; value: string; set: (v: string) => void },
  ) => {
    const id = `${formId}-${key}`
    const problem = problemFor(key)
    return (
      <div className={styles.field} data-invalid={problem ? '' : undefined}>
        <label htmlFor={id}>{input.label}</label>
        <input
          ref={(el) => {
            fieldRefs.current[key] = el
          }}
          id={id}
          name={key}
          type={input.type}
          inputMode={input.type === 'email' ? 'email' : undefined}
          dir={input.type === 'email' ? 'ltr' : undefined}
          autoComplete={input.autoComplete}
          maxLength={input.max}
          value={input.value}
          disabled={pending}
          readOnly={Boolean(profile)}
          onChange={(e) => {
            input.set(e.target.value)
            setRejected((r) => r.filter((f) => f !== key))
          }}
          onBlur={() => setTouched((x) => ({ ...x, [key]: true }))}
          aria-invalid={Boolean(problem)}
          aria-describedby={problem ? `${id}-error` : undefined}
          required
        />
        {problem && (
          <p id={`${id}-error`} className={styles.fieldError}>
            {c.fieldErrors[key][problem]}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <StatusBadge tone={STATUS_TONE[status]}>{t.platform.status[status]}</StatusBadge>
      </div>

      {result && (
        <p ref={doneRef} className={styles.done} role="status" tabIndex={-1}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          {result === 'confirmed' ? c.doneTitle : c.doneWaitlistTitle}
        </p>
      )}

      <div className={styles.panelActions}>
        {(status === 'open' || status === 'waitlist') &&
          (baseUrl ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={async () => {
                if (checking) return
                setOpen(true)
                setFailure(null)
                setPhoneError('')
                setBlocked(false)
                setGuestChoice(false)
                setChecking(true)
                setProfile(null)
                setValues({ name: '', email: '' })
                setPhone('')
                setTouched({})
                setSubmitted(false)
                try {
                  if (!authSettings || !baseUrl) return
                  const session = (await memberAuthClient(authSettings).auth.getSession()).data.session
                  if (!session) return
                  const data = await fetchMemberEvent(authSettings, baseUrl, event.slug)
                  if (!data.ok || !isMemberProfile(data.data.profile)) {
                    setBlocked(true)
                    const noMember = !data.ok && data.status === 403 && data.code === 'MEMBER_REQUIRED'
                    setGuestChoice(noMember)
                    setFailure(noMember ? copy.noMemberProfile : copy.profileUnavailable)
                    return
                  }
                  if (data.data.registration) {
                    setResult(data.data.registration.status)
                    setOpen(false)
                    return
                  }
                  setProfile(data.data.profile)
                  setValues({ name: data.data.profile.name, email: data.data.profile.email })
                  setPhone(data.data.profile.phone ?? '')
                } catch {
                  setBlocked(true)
                  setFailure(copy.profileUnavailable)
                } finally {
                  setChecking(false)
                }
              }}
            >
              {status === 'open' ? c.register : c.joinWaitlist}
              {status === 'open' && <IconArrowRight className="btn__arrow" />}
            </button>
          ) : (
            <p className={styles.panelNote}>{c.outcome.unavailable}</p>
          ))}
        {(status === 'closed' || status === 'full') && (
          <>
            <button type="button" className="btn btn--secondary" aria-disabled="true" disabled>
              {t.platform.status.closed}
            </button>
            <p className={styles.panelNote}>{c.closedNote}</p>
          </>
        )}
        {status === 'completed' && <p className={styles.panelNote}>{c.completedNoteCore}</p>}
        {status === 'registered' && <p className={styles.panelNote}>{c.registeredNoteCore}</p>}
        {status === 'waitlisted' && <p className={styles.panelNote}>{c.waitlistedNote}</p>}
      </div>

      <Modal
        open={open}
        onClose={close}
        title={waitlist ? c.confirmWaitlistTitle : c.confirmTitle}
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={close}>
              {t.platform.common.cancel}
            </button>
            <button
              type="submit"
              form={formId}
              className="btn btn--primary"
              disabled={pending || closed || checking || blocked}
              aria-disabled={pending || closed || checking || blocked}
            >
              {pending ? c.sending : waitlist ? c.confirmWaitlist : c.confirm}
            </button>
          </>
        }
      >
        <p>{c.confirmBody(l(event.title))}</p>
        {guestChoice && (
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => {
              setGuestChoice(false)
              setBlocked(false)
              setFailure(null)
            }}
          >
            {copy.continueGuest}
          </button>
        )}
        {checking ? (
          <p role="status">{copy.checking}</p>
        ) : profile ? (
          <p>{copy.memberConfirmation}</p>
        ) : !blocked ? (
          <p>
            {copy.guestNote} {authSettings && <Link href={`/login?next=${encodeURIComponent(`/events/${event.slug}`)}`}>{copy.signIn}</Link>}
          </p>
        ) : null}
        <form id={formId} className={styles.form} onSubmit={submit} noValidate aria-busy={pending}>
          <fieldset disabled={checking || blocked} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 'var(--space-5)' }}>
            {field('attendeeName', {
              label: c.formName,
              type: 'text',
              autoComplete: 'name',
              max: NAME_MAX,
              value: values.name,
              set: (name) => setValues((v) => ({ ...v, name })),
            })}
            {field('attendeeEmail', {
              label: c.formEmail,
              type: 'email',
              autoComplete: 'email',
              max: EMAIL_MAX,
              value: values.email,
              set: (email) => setValues((v) => ({ ...v, email })),
            })}
            {requiresPhone && !profile?.phone && (
              <div className={styles.field}>
                <label htmlFor={`${formId}-phone`}>{copy.phone}</label>
                <p id={`${formId}-phone-help`}>{profile ? copy.phoneRequired : copy.guestPhone}</p>
                <input
                  ref={phoneRef}
                  id={`${formId}-phone`}
                  type="tel"
                  dir="ltr"
                  autoComplete="tel"
                  value={phone}
                  maxLength={32}
                  placeholder="+968 9123 4567"
                  disabled={pending}
                  required
                  onChange={(e) => {
                    setPhone(e.target.value)
                    setPhoneError('')
                  }}
                  aria-invalid={Boolean(phoneError)}
                  aria-describedby={`${formId}-phone-help${phoneError ? ` ${formId}-phone-error` : ''}`}
                />
                {phoneError && (
                  <p id={`${formId}-phone-error`} role="alert" className={styles.fieldError}>
                    {phoneError}
                  </p>
                )}
              </div>
            )}
            {profile?.phone && (
              <p>
                <span>{copy.phone}: </span>
                <bdi dir="ltr">{profile.phone}</bdi>
              </p>
            )}
          </fieldset>
          <p className={styles.panelNote}>{c.formPrivacy}</p>
          {failure && (
            <p className={styles.formError} role="alert">
              {failure}
            </p>
          )}
        </form>
      </Modal>
    </div>
  )
}
