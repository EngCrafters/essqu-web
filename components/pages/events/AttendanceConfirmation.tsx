'use client'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { memberCall, fetchMemberEvent, isMemberProfile, type MemberEvent } from '@/lib/core-api/member-events'
import type { MemberAuthSettings } from '@/lib/member-auth/client'
import { eventManagement } from '@/lib/i18n/dictionaries/pages/event-management'
import { eventDateParts } from '@/lib/format'
import type { EventView } from '@/content/platform/events'
import styles from './Events.module.css'

export function AttendanceConfirmation({
  event,
  authSettings,
  baseUrl,
}: {
  event: EventView
  authSettings: MemberAuthSettings | null
  baseUrl: string | null
}) {
  const { locale, l, intl } = useI18n()
  const c = eventManagement[locale]
  const [data, setData] = useState<MemberEvent | null>(null)
  const [problem, setProblem] = useState('')
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [challenge, setChallenge] = useState('')
  const inFlight = useRef(false)
  const storageKey = `essqu-attendance:${event.slug}`
  const returnPath = `/events/${event.slug}/attendance`
  const signIn = useCallback(() => window.location.replace(`/login?next=${encodeURIComponent(returnPath)}`), [returnPath])
  const message = (code: string) => {
    if (code === 'CHECKIN_CLOSED') return c.closed
    if (code === 'CHALLENGE_EXPIRED') return c.expired
    if (code === 'INVALID_CHALLENGE') return c.invalid
    if (code === 'NOT_REGISTERED') return c.notRegistered
    if (code === 'WAITLISTED') return c.waitlisted
    if (code === 'MEMBER_REQUIRED' || code === 'EMAIL_UNCONFIRMED') return c.memberRequired
    return c.unavailable
  }
  const load = useCallback(async () => {
    if (!authSettings || !baseUrl) {
      setProblem('UNAVAILABLE')
      setLoading(false)
      return
    }
    setLoading(true)
    setProblem('')
    const result = await fetchMemberEvent(authSettings, baseUrl, event.slug)
    if (!result.ok) {
      if (result.status === 401) {
        signIn()
        return
      }
      setProblem(result.code)
      setLoading(false)
      return
    }
    if (
      !isMemberProfile(result.data.profile) ||
      typeof result.data.checkinOpen !== 'boolean' ||
      (result.data.registration !== null && !['confirmed', 'waitlisted'].includes(result.data.registration?.status))
    ) {
      setProblem('UNAVAILABLE')
      setLoading(false)
      return
    }
    setData(result.data)
    setLoading(false)
  }, [authSettings, baseUrl, event.slug, signIn])

  useEffect(() => {
    // The challenge is public and short-lived, never a login token. Fragments
    // never reach servers; remove it from history before any API/navigation.
    const fragment = new URLSearchParams(window.location.hash.slice(1))
    const scanned = fragment.get('checkin')
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search)
    let token = /^[0-9a-f]{64}$/.test(scanned ?? '') ? scanned! : ''
    try {
      // Core accepts a code for three minutes from first display; never keep it longer.
      if (token) sessionStorage.setItem(storageKey, JSON.stringify({ token, until: Date.now() + 180_000 }))
      else {
        const cached = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null')
        if (cached && cached.until > Date.now() && /^[0-9a-f]{64}$/.test(cached.token)) token = cached.token
        else sessionStorage.removeItem(storageKey)
      }
    } catch {
      /* A signed-in scanner can still confirm without browser storage. */
    }
    const task = setTimeout(() => {
      setChallenge(token)
      void load()
    }, 0)
    return () => clearTimeout(task)
  }, [storageKey, load])

  const confirm = async () => {
    if (inFlight.current || !authSettings || !baseUrl || !challenge) return
    inFlight.current = true
    setPending(true)
    setProblem('')
    try {
      const result = await memberCall<{ checkedInAt: string }>(authSettings, baseUrl, `/me/events/${event.slug}/attendance`, 'POST', { challenge })
      if (!result.ok) {
        if (result.status === 401) {
          signIn()
          return
        }
        setProblem(result.code)
        return
      }
      if (!Number.isFinite(Date.parse(result.data.checkedInAt))) {
        setProblem('UNAVAILABLE')
        return
      }
      setSaved(result.data.checkedInAt)
      try {
        sessionStorage.removeItem(storageKey)
      } catch {
        /* No retained challenge. */
      }
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }
  const attendedAt = saved ?? data?.registration?.checkedInAt
  const attended = Boolean(saved || data?.registration?.attended)
  const eligible = data?.registration?.status === 'confirmed'
  const statusText = attended
    ? c.already
    : !data?.registration
      ? c.notRegistered
      : !eligible
        ? c.waitlisted
        : !data.checkinOpen
          ? c.closed
          : !challenge
            ? c.missing
            : c.confirmed
  return (
    <div className={styles.panel} style={{ maxWidth: '46rem', margin: '0 auto' }} aria-busy={loading || pending}>
      <h2 className={styles.blockTitle}>{l(event.title)}</h2>
      <dl className={styles.meta}>
        <div>
          <dt>{locale === 'ar' ? 'التاريخ والوقت' : 'Date and time'}</dt>
          <dd>
            {eventDateParts(event.start, intl).long} ·{' '}
            {new Intl.DateTimeFormat(intl, { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Muscat' }).format(new Date(event.start))} (UTC+04:00)
          </dd>
        </div>
        {event.location && (
          <div>
            <dt>{locale === 'ar' ? 'المكان' : 'Location'}</dt>
            <dd>{l(event.location)}</dd>
          </div>
        )}
        {data && (
          <div>
            <dt>{c.member}</dt>
            <dd dir="auto">{data.profile.name}</dd>
          </div>
        )}
        {attendedAt && (
          <div>
            <dt>{c.checkedInAt}</dt>
            <dd>{new Intl.DateTimeFormat(intl, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Muscat' }).format(new Date(attendedAt))}</dd>
          </div>
        )}
      </dl>
      {loading ? (
        <p role="status">{c.checking}</p>
      ) : (
        <p role="status" className={attended ? styles.done : undefined}>
          {saved ? c.saved : statusText}
        </p>
      )}
      {problem && (
        <p role="alert" className={styles.fieldError}>
          {message(problem)}
        </p>
      )}
      <div className={styles.panelActions}>
        {!attended && (
          <button
            type="button"
            className="btn btn--primary"
            disabled={loading || pending || !eligible || !data?.checkinOpen || !challenge}
            onClick={() => void confirm()}
          >
            {pending ? c.sending : c.confirm}
          </button>
        )}
        {!pending && (
          <button type="button" className="btn btn--secondary" disabled={loading} onClick={() => void load()}>
            {c.retry}
          </button>
        )}
        <Link href={`/events/${event.slug}`} className="btn btn--quiet">
          {c.eventLink}
        </Link>
      </div>
    </div>
  )
}
