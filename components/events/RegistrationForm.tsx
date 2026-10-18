'use client'
import { useRef, useState, type FormEvent } from 'react'
import { eventCopy } from '@/lib/core-api/copy'
import { submitRegistration } from '@/lib/core-api/registration'
import type { CoreEvent, RegistrationResult } from '@/lib/core-api/types'
import type { Locale } from '@/lib/i18n'
import styles from './RegistrationForm.module.css'

export function RegistrationForm({ event, base, locale }: { event: CoreEvent; base: string; locale: Locale }) {
  const copy = eventCopy[locale],
    lock = useRef(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<RegistrationResult | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [intent, setIntent] = useState<'register' | 'join_waitlist'>(
    event.availability === 'waitlist' ? 'join_waitlist' : 'register',
  )
  const complete =
    result?.ok ||
    (!result?.ok && ['already-registered', 'already-waitlisted', 'registration-closed'].includes(result?.reason ?? ''))
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (lock.current || Date.now() < cooldown) return
    lock.current = true
    setBusy(true)
    setResult(null)
    const fields = new FormData(e.currentTarget)
    try {
      const response = await submitRegistration(base, event.id, {
        attendeeName: String(fields.get('attendeeName') ?? ''),
        attendeeEmail: String(fields.get('attendeeEmail') ?? ''),
        intent,
      })
      setResult(response)
      if (!response.ok) {
        if (response.reason === 'event-full') setIntent('join_waitlist')
        if (response.reason === 'registration-available') setIntent('register')
        if (response.retryAfter) setCooldown(Date.now() + response.retryAfter * 1000)
      }
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  const resultKey = result?.ok
    ? result.status
    : (result?.reason ??
      (result && ['rate-limited', 'invalid-fields', 'conflict'].includes(result.code) ? result.code : 'error'))
  const message = result ? copy[resultKey as keyof typeof copy] : null
  if (event.availability === 'closed') return <p>{copy.closed}</p>
  if (!base) return <p role="status">{copy.unavailable}</p>
  return (
    <form onSubmit={submit} className={styles.form} aria-busy={busy}>
      <p>{copy.privacy}</p>
      {!complete ? (
        <>
          <label htmlFor="attendeeName">{copy.name}</label>
          <input id="attendeeName" name="attendeeName" autoComplete="name" maxLength={200} required disabled={busy} />
          <label htmlFor="attendeeEmail">{copy.email}</label>
          <input
            id="attendeeEmail"
            name="attendeeEmail"
            type="email"
            autoComplete="email"
            maxLength={254}
            dir="ltr"
            required
            disabled={busy}
          />
          <button className="btn btn--primary" type="submit" disabled={busy}>
            {busy ? copy.sending : intent === 'register' ? copy.submit : copy.waitlist}
          </button>
        </>
      ) : null}
      <p role="status" aria-live="polite">
        {message}
      </p>
    </form>
  )
}
