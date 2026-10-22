'use client'

import { useId, useState, type FormEvent } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { isSquEmail } from '@/lib/core-api/member-profile'
import { memberProfileCopy } from '@/lib/i18n/dictionaries/pages/member-profile'
import { memberAuthClient, type MemberAuthSettings } from '@/lib/member-auth/client'
import { routes } from '@/lib/routes'
import m from './MemberProfile.module.css'

/**
 * The sign-in email and password belong to Supabase Auth, and change only through its
 * confirmation emails. Core then follows a confirmed SQU address; it never takes one from here.
 */
export function AccountSettings({ authSettings, signInEmail }: { authSettings: MemberAuthSettings; signInEmail: string }) {
  const { locale } = useI18n()
  const c = memberProfileCopy[locale].profile.settings
  const id = useId()
  const [changing, setChanging] = useState(false)
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [emailState, setEmailState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const [sentTo, setSentTo] = useState('')
  const [reset, setReset] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')

  const typed = email.trim().toLowerCase()
  const invalid = !isSquEmail(typed) || typed === signInEmail.toLowerCase()
  const changeEmail = async (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (invalid) return
    setEmailState('sending')
    const { error } = await memberAuthClient(authSettings)
      .auth.updateUser({ email: typed }, { emailRedirectTo: `${window.location.origin}${routes.login}` })
      .catch(() => ({ error: true }))
    if (error) return setEmailState('failed')
    setSentTo(typed)
    setEmailState('sent')
    setChanging(false)
    setEmail('')
    setTouched(false)
  }
  const sendReset = async () => {
    setReset('sending')
    const { error } = await memberAuthClient(authSettings)
      .auth.resetPasswordForEmail(signInEmail, { redirectTo: `${window.location.origin}${routes.resetPassword}` })
      .catch(() => ({ error: true }))
    setReset(error ? 'failed' : 'sent')
  }

  return (
    <div className={m.settingsGrid}>
      <section className={m.card} aria-labelledby={`${id}-email`}>
        <h3 id={`${id}-email`} className={m.cardTitle}>
          {c.email}
        </h3>
        <p className={m.emailValue} dir="ltr">
          {signInEmail}
        </p>
        {!isSquEmail(signInEmail.toLowerCase()) && <p className={m.note}>{c.notSqu}</p>}
        {changing ? (
          <form className={m.form} onSubmit={changeEmail} noValidate aria-busy={emailState === 'sending'}>
            <div className={m.field} data-invalid={(touched && invalid) || undefined}>
              <label htmlFor={`${id}-new`}>{c.newEmail}</label>
              <p id={`${id}-hint`} className={m.hint}>
                {c.emailHint}
              </p>
              <input
                id={`${id}-new`}
                type="email"
                autoComplete="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={touched && invalid}
                aria-describedby={`${id}-hint${touched && invalid ? ` ${id}-error` : ''}`}
              />
              {touched && invalid && (
                <p id={`${id}-error`} className={m.problem}>
                  {c.emailInvalid}
                </p>
              )}
            </div>
            <div className={m.actions}>
              <button type="submit" className="btn btn--primary btn--compact" disabled={emailState === 'sending'}>
                {c.sendEmail}
              </button>
              <button type="button" className="btn btn--secondary btn--compact" onClick={() => setChanging(false)} disabled={emailState === 'sending'}>
                {c.cancel}
              </button>
            </div>
          </form>
        ) : (
          <div className={m.actions}>
            <button
              type="button"
              className="btn btn--secondary btn--compact"
              onClick={() => {
                setChanging(true)
                setEmailState('idle')
              }}
            >
              {c.changeEmail}
            </button>
          </div>
        )}
        {emailState === 'sent' && (
          <p className={`preview-note ${m.saved}`} role="status">
            <span className="status-dot" aria-hidden="true" />
            <span>{c.emailSent(sentTo)}</span>
          </p>
        )}
        {emailState === 'failed' && (
          <p className={m.problem} role="alert">
            {c.emailFailed}
          </p>
        )}
      </section>

      <section className={m.card} aria-labelledby={`${id}-password`}>
        <h3 id={`${id}-password`} className={m.cardTitle}>
          {c.password}
        </h3>
        <p className={m.note}>{c.passwordBody}</p>
        <div className={m.actions}>
          <button type="button" className="btn btn--secondary btn--compact" onClick={() => void sendReset()} disabled={reset === 'sending' || reset === 'sent'}>
            {c.sendReset}
          </button>
        </div>
        {reset === 'sent' && (
          <p className={`preview-note ${m.saved}`} role="status">
            <span className="status-dot" aria-hidden="true" />
            <span>{c.resetSent}</span>
          </p>
        )}
        {reset === 'failed' && (
          <p className={m.problem} role="alert">
            {c.resetFailed}
          </p>
        )}
      </section>
    </div>
  )
}
