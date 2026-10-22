'use client'

import Link from 'next/link'
import { useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { IconArrowRight } from '@/components/ui/icons'
import styles from '@/components/pages/register/Register.module.css'
import { routes } from '@/lib/routes'
import { memberAuthClient, type MemberAuthSettings } from '@/lib/member-auth/client'
import { classifyAuthError } from '@/lib/member-auth/errors'
import a from './Account.module.css'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Supabase Auth's password recovery. The answer is the same whether or not the address has an
 * account; only a rate limit or a failed connection is reported, since neither reveals anything.
 * The email's link opens /reset-password on this site (Supabase's redirect allow-list).
 */
export function ForgotPasswordForm({ authSettings }: { authSettings: MemberAuthSettings | null }) {
  const { t } = useI18n()
  const c = t.platform.accountPage.forgot
  const uid = useId()
  const summaryRef = useRef<HTMLDivElement>(null)
  const client = useMemo(() => (authSettings ? memberAuthClient(authSettings) : null), [authSettings])
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [problem, setProblem] = useState<'rate-limited' | 'unavailable' | null>(null)

  const typed = email.trim()
  const error = !typed ? c.errors.emailRequired : !EMAIL.test(typed) ? c.errors.emailInvalid : null

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!client || busy) return
    setSubmitted(true)
    setProblem(null)
    if (error) return
    setBusy(true)
    const { error: failure } = await client.auth
      .resetPasswordForEmail(typed.toLowerCase(), { redirectTo: `${window.location.origin}${routes.resetPassword}` })
      .catch((e: unknown) => ({ error: e as { code?: string; status?: number } }))
    setBusy(false)
    const kind = failure ? classifyAuthError(failure) : null
    if (kind === 'rate-limited' || kind === 'unavailable') {
      setProblem(kind)
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    setSent(true)
  }

  if (!authSettings) {
    return (
      <div className={a.narrow}>
        <p className="preview-note">
          <span className="status-dot" aria-hidden="true" />
          <span>{c.unavailable}</span>
        </p>
      </div>
    )
  }

  if (sent) {
    return (
      <div className={`${a.narrow} ${styles.form}`}>
        <div className={a.status} role="status">
          <p className={a.statusTitle}>{c.sent}</p>
          <p className={a.muted}>{c.sentNote}</p>
        </div>
        <p className={a.links}>
          <Link href={routes.login}>{c.back}</Link>
        </p>
      </div>
    )
  }

  const shown = submitted ? error : null
  return (
    <div className={a.narrow}>
      <form className={styles.form} onSubmit={onSubmit} noValidate aria-label={c.formLabel} aria-busy={busy}>
        {problem ? (
          <div ref={summaryRef} className={styles.summary} tabIndex={-1} role="alert">
            <p className={styles.summaryTitle}>{problem === 'rate-limited' ? c.errors.rateLimited : c.errors.unavailable}</p>
          </div>
        ) : null}
        <div className={styles.field} data-invalid={Boolean(shown) || undefined}>
          <label htmlFor={`${uid}-email`}>{c.email}</label>
          <input
            id={`${uid}-email`}
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            inputMode="email"
            aria-invalid={Boolean(shown) || undefined}
            aria-describedby={shown ? `${uid}-email-error` : undefined}
          />
          {shown && (
            <p id={`${uid}-email-error`} className={styles.error}>
              {shown}
            </p>
          )}
        </div>
        <div className={styles.actions}>
          <button type="submit" className="btn btn--primary" disabled={busy} aria-busy={busy}>
            {busy ? (
              <>
                <span className={styles.spinner} aria-hidden="true" />
                {c.sending}
              </>
            ) : (
              <>
                {c.submit}
                <IconArrowRight className="btn__arrow" />
              </>
            )}
          </button>
          <p className={a.links}>
            <Link href={routes.login}>{c.back}</Link>
          </p>
        </div>
      </form>
    </div>
  )
}
