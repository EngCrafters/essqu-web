'use client'

import Link from 'next/link'
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { IconArrowRight } from '@/components/ui/icons'
import styles from '@/components/pages/register/Register.module.css'
import { routes } from '@/lib/routes'
import { memberAuthClient, type MemberAuthSettings } from '@/lib/member-auth/client'
import { classifyAuthError, type AuthProblem } from '@/lib/member-auth/errors'
import { readAuthLink, withoutAuthLink } from '@/lib/member-auth/links'
import { MIN_PASSWORD_LENGTH, checkConfirmation, checkPassword } from '@/lib/member-auth/password'
import { PasswordInput } from './PasswordInput'
import a from './Account.module.css'

type Phase = 'checking' | 'ready' | 'expired' | 'invalid' | 'done'

/**
 * The page a password-recovery email opens. The form appears only after Supabase Auth has
 * verified the recovery link in this page load: nothing in the URL (an email address, a user ID)
 * and no ordinary sign-in can change a password here. The link is removed from the address bar
 * before it is used. After the change every session of the account is signed out.
 */
export function ResetPasswordForm({ authSettings }: { authSettings: MemberAuthSettings | null }) {
  const { t } = useI18n()
  const c = t.platform.accountPage.reset
  const p = t.platform.accountPage.password
  const uid = useId()
  const summaryRef = useRef<HTMLDivElement>(null)
  const client = useMemo(() => (authSettings ? memberAuthClient(authSettings) : null), [authSettings])
  const [phase, setPhase] = useState<Phase>('checking')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<AuthProblem | null>(null)

  useEffect(() => {
    if (!client) return
    let cancelled = false
    ;(async () => {
      const link = readAuthLink(window.location.search, window.location.hash)
      if (link.kind !== 'none') window.history.replaceState(null, '', withoutAuthLink(window.location.href))
      let next: Phase = 'invalid'
      if (link.kind === 'token-hash' && link.type === 'recovery') {
        const { error } = await client.auth.verifyOtp({ type: 'recovery', token_hash: link.tokenHash })
        next = error ? (classifyAuthError(error) === 'link-expired' ? 'expired' : 'invalid') : 'ready'
      } else if (link.kind === 'session' && link.type === 'recovery') {
        const { error } = await client.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken })
        next = error ? 'invalid' : 'ready'
      } else if (link.kind === 'error') next = link.failure
      if (!cancelled) setPhase(next)
    })()
    return () => {
      cancelled = true
    }
  }, [client])

  const passwordProblem = checkPassword(password)
  const confirmationProblem = checkConfirmation(password, confirmation)
  const passwordError = !submitted || !passwordProblem ? null : passwordProblem === 'required' ? p.errors.required : passwordProblem === 'too-short' ? p.errors.tooShort(MIN_PASSWORD_LENGTH) : p.errors.tooLong
  const confirmationError = !submitted || !confirmationProblem ? null : confirmationProblem === 'required' ? p.errors.confirmRequired : p.errors.mismatch

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!client || busy) return
    setSubmitted(true)
    setProblem(null)
    if (passwordProblem || confirmationProblem) return
    setBusy(true)
    const { error } = await client.auth.updateUser({ password }).catch((e: unknown) => ({ error: e as { code?: string } }))
    if (error) {
      setBusy(false)
      setProblem(classifyAuthError(error))
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    // A reset ends every session of the account, including any the visitor did not start.
    await client.auth.signOut({ scope: 'global' }).catch(() => client.auth.signOut({ scope: 'local' }))
    setPassword('')
    setConfirmation('')
    setBusy(false)
    setPhase('done')
  }

  const note = (text: string, action?: { href: string; label: string }) => (
    <div className={`${a.narrow} ${styles.form}`}>
      <div className={a.status} role="status">
        <p>{text}</p>
      </div>
      {action ? (
        <div className={a.buttons}>
          <Link href={action.href} className="btn btn--primary">
            {action.label}
            <IconArrowRight className="btn__arrow" />
          </Link>
        </div>
      ) : null}
    </div>
  )

  if (!authSettings) return note(c.unavailable)
  if (phase === 'checking') return note(c.checking)
  if (phase === 'expired') return note(c.expired, { href: routes.forgotPassword, label: c.requestNew })
  if (phase === 'invalid') return note(c.invalid, { href: routes.forgotPassword, label: c.requestNew })
  if (phase === 'done') {
    return (
      <div className={`${a.narrow} ${styles.form}`}>
        <div className={a.status} role="status">
          <h2 className={a.statusTitle}>{c.successTitle}</h2>
          <p>{c.successBody}</p>
        </div>
        <div className={a.buttons}>
          <Link href={routes.login} className="btn btn--primary">
            {c.toLogin}
            <IconArrowRight className="btn__arrow" />
          </Link>
        </div>
      </div>
    )
  }

  const problemText =
    problem === 'same-password'
      ? c.errors.samePassword
      : problem === 'weak-password'
        ? p.errors.weak
        : problem === 'session-missing' || problem === 'link-expired'
          ? c.errors.session
          : problem
            ? c.errors.unavailable
            : null

  return (
    <div className={a.narrow}>
      <form className={styles.form} onSubmit={onSubmit} noValidate aria-label={c.formLabel} aria-busy={busy}>
        {problemText ? (
          <div ref={summaryRef} className={styles.summary} tabIndex={-1} role="alert">
            <p className={styles.summaryTitle}>{problemText}</p>
            {problem === 'session-missing' || problem === 'link-expired' ? (
              <p>
                <Link href={routes.forgotPassword}>{c.requestNew}</Link>
              </p>
            ) : null}
          </div>
        ) : null}
        <div className={styles.field} data-invalid={Boolean(passwordError) || undefined}>
          <label htmlFor={`${uid}-new`}>{c.newPassword}</label>
          <p id={`${uid}-new-hint`} className={styles.hint}>
            {p.hint(MIN_PASSWORD_LENGTH)}
          </p>
          <PasswordInput
            id={`${uid}-new`}
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            invalid={Boolean(passwordError)}
            describedBy={[`${uid}-new-hint`, passwordError ? `${uid}-new-error` : ''].filter(Boolean).join(' ')}
            disabled={busy}
          />
          {passwordError && (
            <p id={`${uid}-new-error`} className={styles.error}>
              {passwordError}
            </p>
          )}
        </div>
        <div className={styles.field} data-invalid={Boolean(confirmationError) || undefined}>
          <label htmlFor={`${uid}-confirm`}>{c.confirmPassword}</label>
          <PasswordInput
            id={`${uid}-confirm`}
            value={confirmation}
            onChange={setConfirmation}
            autoComplete="new-password"
            invalid={Boolean(confirmationError)}
            describedBy={confirmationError ? `${uid}-confirm-error` : undefined}
            disabled={busy}
          />
          {confirmationError && (
            <p id={`${uid}-confirm-error`} className={styles.error}>
              {confirmationError}
            </p>
          )}
        </div>
        <div className={styles.actions}>
          <button type="submit" className="btn btn--primary" disabled={busy} aria-busy={busy}>
            {busy ? (
              <>
                <span className={styles.spinner} aria-hidden="true" />
                {c.updating}
              </>
            ) : (
              <>
                {c.submit}
                <IconArrowRight className="btn__arrow" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
