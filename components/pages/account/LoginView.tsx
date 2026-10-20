'use client'

import Link from 'next/link'
import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import type { EmailOtpType, Session } from '@supabase/supabase-js'
import { useI18n } from '@/components/i18n/I18nProvider'
import { IconArrowRight } from '@/components/ui/icons'
import styles from '@/components/pages/register/Register.module.css'
import { routes } from '@/lib/routes'
import { memberAuthClient, setRememberMe, type MemberAuthSettings } from '@/lib/member-auth/client'
import { classifyAuthError, type AuthProblem } from '@/lib/member-auth/errors'
import { readAuthLink, withoutAuthLink } from '@/lib/member-auth/links'
import { fetchOwnMembership, type OwnMembership } from '@/lib/member-auth/membership'
import { PasswordInput } from './PasswordInput'
import a from './Account.module.css'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Member sign-in (Core's ADR 0019). Supabase Auth checks the password; Core then says what the
 * signed-in person is: a member, an applicant at some stage, or neither. Signing in alone grants
 * nothing. A confirmation link from the registration email also lands here.
 */
export function LoginView({ authSettings, coreBaseUrl }: { authSettings: MemberAuthSettings | null; coreBaseUrl: string | null }) {
  const { t, intl } = useI18n()
  const c = t.platform.accountPage.login
  const s = t.platform.accountPage.status
  const uid = useId()
  const summaryRef = useRef<HTMLDivElement>(null)
  const client = useMemo(() => (authSettings ? memberAuthClient(authSettings) : null), [authSettings])

  const [phase, setPhase] = useState<'checking' | 'form' | 'signed-in'>(authSettings ? 'checking' : 'form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<AuthProblem | null>(null)
  const [linkNotice, setLinkNotice] = useState<'confirmed' | 'expired' | 'invalid' | null>(null)
  const [membership, setMembership] = useState<OwnMembership | null>(null)
  const [signedInEmail, setSignedInEmail] = useState('')
  const [resend, setResend] = useState<'idle' | 'sending' | 'sent'>('idle')

  const loadMembership = useCallback(
    async (session: Session) => {
      setSignedInEmail(session.user.email ?? '')
      setPhase('signed-in')
      setMembership(null)
      if (!coreBaseUrl) return setMembership({ kind: 'unavailable' })
      const result = await fetchOwnMembership(coreBaseUrl, session.access_token)
      if (result.kind === 'signed-out' && client) {
        await client.auth.signOut({ scope: 'local' })
        setPhase('form')
        return
      }
      setMembership(result)
    },
    [client, coreBaseUrl],
  )

  useEffect(() => {
    if (!client) return
    let cancelled = false
    ;(async () => {
      // A confirmation link: read it, take it out of the address bar, then use it.
      const link = readAuthLink(window.location.search, window.location.hash)
      if (link.kind !== 'none') window.history.replaceState(null, '', withoutAuthLink(window.location.href))
      let session: Session | null = null
      const confirms = (type: string | null) => type === 'signup' || type === 'email'
      if (link.kind === 'token-hash') {
        const { data, error } = await client.auth.verifyOtp({ type: link.type as EmailOtpType, token_hash: link.tokenHash })
        if (error) setLinkNotice(classifyAuthError(error) === 'link-expired' ? 'expired' : 'invalid')
        else {
          session = data.session
          if (confirms(link.type)) setLinkNotice('confirmed')
        }
      } else if (link.kind === 'session') {
        const { data, error } = await client.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken })
        if (error) setLinkNotice('invalid')
        else {
          session = data.session
          if (confirms(link.type)) setLinkNotice('confirmed')
        }
      } else if (link.kind === 'error') setLinkNotice(link.failure)
      if (!session) session = (await client.auth.getSession()).data.session
      if (cancelled) return
      if (session) await loadMembership(session)
      else setPhase('form')
    })()
    return () => {
      cancelled = true
    }
  }, [client, loadMembership])

  const errors: { email?: string; password?: string } = {}
  const typed = email.trim()
  if (!typed) errors.email = c.errors.emailRequired
  else if (!EMAIL.test(typed)) errors.email = c.errors.emailInvalid
  if (!password) errors.password = c.errors.passwordRequired

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!client || busy) return
    setSubmitted(true)
    setProblem(null)
    setResend('idle')
    if (errors.email || errors.password) return
    setBusy(true)
    setRememberMe(remember)
    const { data, error } = await client.auth.signInWithPassword({ email: typed.toLowerCase(), password }).catch((e: unknown) => ({ data: { session: null }, error: e as { code?: string } }))
    setBusy(false)
    if (error || !data.session) {
      setProblem(classifyAuthError(error))
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    setPassword('')
    await loadMembership(data.session)
  }

  const resendConfirmation = async () => {
    if (!client || errors.email) return
    setResend('sending')
    await client.auth.resend({ type: 'signup', email: typed.toLowerCase(), options: { emailRedirectTo: `${window.location.origin}${routes.login}` } }).catch(() => null)
    setResend('sent')
  }

  const signOut = async () => {
    await client?.auth.signOut({ scope: 'local' })
    setMembership(null)
    setPhase('form')
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

  if (phase === 'checking') {
    return (
      <div className={`${a.narrow} ${styles.form}`}>
        <p className={a.muted} role="status">
          {c.checking}
        </p>
      </div>
    )
  }

  const date = (iso: string) => new Intl.DateTimeFormat(intl, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Muscat' }).format(new Date(iso))

  if (phase === 'signed-in') {
    const view = (() => {
      if (!membership) return { title: s.title, body: c.checking, action: null }
      switch (membership.kind) {
        case 'member':
          return { title: s.member.title, body: s.member.body(date(membership.since)), action: { href: routes.events, label: s.events } }
        case 'application':
          return membership.stage === 'pending_review'
            ? { title: s.pending_review.title, body: s.pending_review.body(date(membership.submittedAt)), action: null }
            : membership.stage === 'rejected'
              ? { title: s.rejected.title, body: s.rejected.body, action: { href: routes.register, label: s.applyAgain } }
              : { title: s[membership.stage].title, body: s[membership.stage].body, action: null }
        case 'none':
          return { title: s.none.title, body: s.none.body, action: { href: routes.register, label: s.apply } }
        case 'unconfirmed':
          return { title: s.unconfirmed.title, body: s.unconfirmed.body, action: null }
        default:
          return { title: s.title, body: s.unavailable, action: null }
      }
    })()
    return (
      <div className={`${a.narrow} ${styles.form}`}>
        {linkNotice === 'confirmed' ? (
          <p className="preview-note" role="status">
            <span className="status-dot" aria-hidden="true" />
            <span>{c.confirmed}</span>
          </p>
        ) : null}
        <div className={a.status} role="status" aria-busy={!membership}>
          <p className={a.muted}>{s.signedInAs(signedInEmail)}</p>
          <h2 className={a.statusTitle}>{view.title}</h2>
          <p>{view.body}</p>
        </div>
        <div className={a.buttons}>
          {view.action ? (
            <Link href={view.action.href} className="btn btn--primary">
              {view.action.label}
              <IconArrowRight className="btn__arrow" />
            </Link>
          ) : null}
          <button type="button" className="btn btn--quiet" onClick={signOut}>
            {s.signOut}
          </button>
        </div>
      </div>
    )
  }

  const shown = (f: 'email' | 'password') => (submitted ? errors[f] : undefined)
  const problemText =
    problem === 'invalid-credentials'
      ? c.errors.invalidCredentials
      : problem === 'email-not-confirmed'
        ? c.errors.notConfirmed
        : problem === 'disabled'
          ? c.errors.disabled
          : problem === 'rate-limited'
            ? c.errors.rateLimited
            : problem
              ? c.errors.unavailable
              : null

  return (
    <div className={a.narrow}>
      <form className={styles.form} onSubmit={onSubmit} noValidate aria-label={c.formLabel} aria-busy={busy}>
        {linkNotice ? (
          <p className="preview-note" role="status">
            <span className="status-dot" aria-hidden="true" />
            <span>{linkNotice === 'confirmed' ? c.confirmed : linkNotice === 'expired' ? c.linkExpired : c.linkInvalid}</span>
          </p>
        ) : null}
        {problemText ? (
          <div ref={summaryRef} className={styles.summary} tabIndex={-1} role="alert">
            <p className={styles.summaryTitle}>{problemText}</p>
          </div>
        ) : null}

        <div className={styles.field} data-invalid={Boolean(shown('email')) || undefined}>
          <label htmlFor={`${uid}-email`}>{c.email}</label>
          <input
            id={`${uid}-email`}
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            inputMode="email"
            aria-invalid={Boolean(shown('email')) || undefined}
            aria-describedby={shown('email') ? `${uid}-email-error` : undefined}
          />
          {shown('email') && (
            <p id={`${uid}-email-error`} className={styles.error}>
              {shown('email')}
            </p>
          )}
        </div>

        <div className={styles.field} data-invalid={Boolean(shown('password')) || undefined}>
          <label htmlFor={`${uid}-password`}>{c.password}</label>
          <PasswordInput
            id={`${uid}-password`}
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            invalid={Boolean(shown('password'))}
            describedBy={shown('password') ? `${uid}-password-error` : undefined}
          />
          {shown('password') && (
            <p id={`${uid}-password-error`} className={styles.error}>
              {shown('password')}
            </p>
          )}
          <p className={a.links}>
            <Link href={routes.forgotPassword}>{c.forgot}</Link>
          </p>
        </div>

        <label className={a.remember}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <span>{c.remember}</span>
        </label>

        <div className={styles.actions}>
          <button type="submit" className="btn btn--primary" disabled={busy} aria-busy={busy}>
            {busy ? (
              <>
                <span className={styles.spinner} aria-hidden="true" />
                {c.signingIn}
              </>
            ) : (
              <>
                {c.submit}
                <IconArrowRight className="btn__arrow" />
              </>
            )}
          </button>
          <p className={styles.tip}>
            {c.noAccount}{' '}
            <Link href={routes.register} className={a.inline}>
              {c.register}
            </Link>
          </p>
        </div>

        {problem === 'email-not-confirmed' || linkNotice === 'expired' ? (
          <div className={a.status}>
            <p className={a.muted}>{c.resendTitle}</p>
            {resend === 'sent' ? (
              <p role="status">{c.resent}</p>
            ) : (
              <div className={a.buttons}>
                <button type="button" className="btn btn--secondary btn--compact" onClick={resendConfirmation} disabled={resend === 'sending' || Boolean(errors.email)}>
                  {resend === 'sending' ? c.resending : c.resend}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </form>
    </div>
  )
}
