'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { DisciplineSymbol } from '@/components/ui/DisciplineSymbol'
import { IconArrowRight } from '@/components/ui/icons'
import { DISCIPLINES, DISCIPLINE_BY_ID, type DisciplineId } from '@/content/disciplines'
import { DISCIPLINE_COLOR, SKILLS, type SkillId } from '@/content/platform/taxonomy'
import {
  fetchApplicationStatus,
  forgetApplication,
  membershipFormData,
  recallApplication,
  rememberApplication,
  setUpImmediateAccount,
  submitMembershipApplication,
  type ApplicationField,
} from '@/lib/core-api/membership'
import { OTHER_INSTITUTION, fetchMembershipOptions, findCategory, type AccountActivation, type MembershipOptions } from '@/lib/core-api/membership-options'
import styles from './Register.module.css'
import { routes } from '@/lib/routes'
import { PasswordInput } from '@/components/pages/account/PasswordInput'
import { memberAuthClient, setAccountPassword, signInWithAccountToken, signUpApplicant, type MemberAuthSettings } from '@/lib/member-auth/client'
import type { AuthProblem } from '@/lib/member-auth/errors'
import { MIN_PASSWORD_LENGTH, checkConfirmation, checkPassword } from '@/lib/member-auth/password'

type Field = 'name' | 'email' | 'category' | 'institution' | 'institutionName' | 'year' | 'discipline' | 'password' | 'confirmPassword' | 'interests' | 'consent'
/** The applicant's own sign-in, set up with Supabase Auth after Core accepted the application. */
type Account =
  | { state: 'idle' }
  | { state: 'working' }
  | { state: 'sent' }
  | { state: 'failed'; problem: AuthProblem }
  // Core ADR 0030, immediate activation: signed in now; an account that already existed; or
  // signed in but the password still needs setting.
  | { state: 'active'; member: boolean }
  | { state: 'existing' }
  | { state: 'password'; problem: AuthProblem }
type Errors = Partial<Record<Field, string>>
type Notice = 'duplicate' | 'member' | 'rateLimited' | 'unavailable' | null
type Status = { status: 'pending_review' | 'approved' | 'rejected'; submittedAt: string } | null

const MAX_INTERESTS = 4
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CONTROL = /[\u0000-\u001f\u007f]/

/** Core's field names → this form's fields. */
const FROM_CORE: Record<ApplicationField, Field> = {
  fullName: 'name',
  email: 'email',
  category: 'category',
  institution: 'institution',
  institutionName: 'institutionName',
  academicYear: 'year',
  discipline: 'discipline',
  interests: 'interests',
  consent: 'consent',
}

const EMPTY = { name: '', email: '', category: '', institution: '', institutionName: '', year: '', discipline: '', consent: false }

/**
 * The membership application (Core ADRs 0017 and 0025). Anyone may apply; the category decides
 * which details the form asks for, and only those are sent. Choosing another category clears the
 * details that changed meaning (a student's university is not a graduate's alma mater), so a
 * hidden field can never block the form or be stored stale. Validation runs on blur and on
 * submit; a summary at the top lists what needs attention and moves focus there. Nothing is
 * called a membership until it is approved, and no ID card is collected here: SQU students
 * verify their student status later, from their profile.
 *
 * With sign-in configured, the applicant also chooses a password. It is never part of the
 * application: once Core has accepted the application, this browser sends the password to
 * Supabase Auth's own sign-up (Core's ADR 0019), which emails a confirmation link. If that step
 * fails, the application still stands and the applicant can retry it here.
 *
 * The categories and universities come from Core. When they could not be loaded the form is not
 * shown half-built: the page says so and offers "Try again", which reads them from the browser.
 */
export function RegisterForm({
  applyBaseUrl,
  authSettings,
  options: initialOptions,
}: {
  applyBaseUrl: string | null
  authSettings: MemberAuthSettings | null
  options: MembershipOptions | null
}) {
  const [options, setOptions] = useState(initialOptions)
  const [retrying, setRetrying] = useState(false)
  const { t, l, locale, intl } = useI18n()
  const c = t.platform.registerPage
  const uid = useId()
  const summaryRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const inFlight = useRef(false)
  const available = Boolean(applyBaseUrl && options)

  const [values, setValues] = useState(EMPTY)
  const [interests, setInterests] = useState<SkillId[]>([])
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [serverErrors, setServerErrors] = useState<Errors>({})
  const [notice, setNotice] = useState<Notice>(null)
  const [status, setStatus] = useState<Status>(null)
  const [statusProblem, setStatusProblem] = useState(false)
  const [justSent, setJustSent] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [account, setAccount] = useState<Account>({ state: 'idle' })
  const [accountEmail, setAccountEmail] = useState('')
  const [accountToken, setAccountToken] = useState('')
  const [activation, setActivation] = useState<AccountActivation>('email_confirmation')

  // A returning applicant sees where their application stands (the token is in this browser only).
  useEffect(() => {
    const token = recallApplication()
    if (!token || !applyBaseUrl) return
    let cancelled = false
    fetchApplicationStatus(applyBaseUrl, token).then((result) => {
      if (cancelled) return
      if (result.kind === 'status') setStatus({ status: result.status, submittedAt: result.submittedAt })
      else if (result.kind === 'not-found') forgetApplication()
      else setStatusProblem(true)
    })
    return () => {
      cancelled = true
    }
  }, [applyBaseUrl])

  const category = findCategory(options, values.category)
  const asksInstitution = Boolean(category && category.institution !== 'none')
  const typedInstitution = asksInstitution && values.institution === OTHER_INSTITUTION
  const asksYear = Boolean(category?.academicYear)

  const validate = (): Errors => {
    const e: Errors = {}
    const name = values.name.trim()
    if (!name) e.name = c.errors.nameRequired
    else if (name.split(/\s+/).length < 2) e.name = c.errors.nameShort
    else if (name.length > 200) e.name = c.errors.nameLong
    const email = values.email.trim().toLowerCase()
    if (!email) e.email = c.errors.emailRequired
    else if (email.length > 254 || !EMAIL.test(email)) e.email = c.errors.emailInvalid
    if (!category) e.category = c.errors.categoryRequired
    if (typedInstitution) {
      const institutionName = values.institutionName.trim()
      if (!institutionName) e.institutionName = c.errors.institutionNameRequired
      else if (institutionName.length < 2 || institutionName.length > 120 || CONTROL.test(institutionName)) e.institutionName = c.errors.institutionNameInvalid
    } else if (asksInstitution && category?.institution === 'required' && !values.institution) e.institution = c.errors.institutionRequired
    if (asksYear && !values.year) e.year = c.errors.yearRequired
    if (!values.discipline) e.discipline = c.errors.disciplineRequired
    if (authSettings) {
      const problem = checkPassword(password)
      if (problem) e.password = problem === 'required' ? c.errors.passwordRequired : problem === 'too-short' ? c.errors.passwordShort(MIN_PASSWORD_LENGTH) : c.errors.passwordLong
      const mismatch = checkConfirmation(password, confirmation)
      if (mismatch) e.confirmPassword = mismatch === 'required' ? c.errors.confirmRequired : c.errors.passwordMismatch
    }
    if (interests.length > MAX_INTERESTS) e.interests = c.errors.interestsMax
    if (!values.consent) e.consent = c.errors.consent
    return { ...e, ...serverErrors }
  }

  const errors = validate()
  const shown = (f: Field) => (submitted || touched[f] ? errors[f] : undefined)
  const errorCount = Object.keys(errors).length

  /** A field edited after Core named it no longer carries Core's message. */
  const edited = (...fields: Field[]) => {
    setNotice(null)
    if (fields.some((f) => serverErrors[f]))
      setServerErrors((current) => {
        const next = { ...current }
        for (const f of fields) delete next[f]
        return next
      })
  }

  /** Another category: the details whose meaning changed are cleared, never kept hidden. */
  const chooseCategory = (id: string) => {
    if (id === values.category) return
    edited('category', 'institution', 'institutionName', 'year')
    setValues((v) => ({ ...v, category: id, institution: '', institutionName: '', year: '' }))
    setTouched((x) => ({ ...x, category: true, institution: false, institutionName: false, year: false }))
  }

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault()
    if (inFlight.current) return
    setSubmitted(true)
    setNotice(null)
    if (errorCount > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    if (!applyBaseUrl || !category) {
      setNotice('unavailable')
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    inFlight.current = true
    setSending(true)
    setProgress(0)
    const form = membershipFormData(
      {
        fullName: values.name,
        email: values.email,
        category: values.category,
        institution: values.institution,
        institutionName: values.institutionName,
        academicYear: values.year,
        discipline: values.discipline,
        interests,
      },
      category,
    )
    const outcome = await submitMembershipApplication(applyBaseUrl, form, (fraction) => setProgress(fraction))
    inFlight.current = false
    setSending(false)
    setProgress(null)
    switch (outcome.kind) {
      case 'submitted':
        rememberApplication(outcome.statusToken)
        setStatus({ status: outcome.status, submittedAt: new Date().toISOString() })
        setJustSent(true)
        window.scrollTo({ top: 0, behavior: 'auto' })
        requestAnimationFrame(() => titleRef.current?.focus())
        setActivation(outcome.accountActivation)
        if (authSettings) void setUpAccount(values.email, password, outcome.statusToken, outcome.accountActivation)
        return
      case 'invalid': {
        const named: Errors = {}
        for (const { field } of outcome.fields) {
          const f = FROM_CORE[field]
          named[f] = {
            name: c.errors.nameRequired,
            email: c.errors.emailInvalid,
            category: c.errors.categoryRequired,
            institution: c.errors.institutionRequired,
            institutionName: c.errors.institutionNameInvalid,
            year: c.errors.yearRequired,
            discipline: c.errors.disciplineRequired,
            interests: c.errors.interestsMax,
            consent: c.errors.consent,
            password: undefined,
            confirmPassword: undefined,
          }[f]
        }
        if (Object.keys(named).length === 0) setNotice('unavailable')
        setServerErrors(named)
        break
      }
      case 'conflict':
        setNotice(outcome.reason === 'already-member' ? 'member' : 'duplicate')
        break
      case 'rate-limited':
        setNotice('rateLimited')
        break
      default:
        setNotice('unavailable')
    }
    requestAnimationFrame(() => summaryRef.current?.focus())
  }

  /** Supabase Auth's sign-up with the chosen password; the password is dropped once it succeeds. */
  const setUpAccount = async (email: string, chosen: string, statusToken: string, mode: AccountActivation) => {
    if (!authSettings) return
    setAccountEmail(email.trim().toLowerCase())
    setAccountToken(statusToken)
    setAccount({ state: 'working' })
    const client = memberAuthClient(authSettings)
    // Core ADR 0030: Core creates the account and this browser signs in with a one-time token.
    if (mode === 'immediate' && applyBaseUrl) {
      const ready = await setUpImmediateAccount(applyBaseUrl, statusToken)
      if (ready.kind === 'ready') {
        const signedIn = await signInWithAccountToken(client, ready.tokenHash, chosen)
        if (signedIn.ok) {
          setPassword('')
          setConfirmation('')
          setAccount({ state: 'active', member: ready.member })
        } else setAccount(signedIn.stage === 'password' ? { state: 'password', problem: signedIn.problem } : { state: 'failed', problem: signedIn.problem })
        return
      }
      if (ready.kind === 'account-exists' || ready.kind === 'already-set-up') {
        setPassword('')
        setConfirmation('')
        setAccount({ state: 'existing' })
        return
      }
      if (ready.kind !== 'confirmation-required') {
        setAccount({ state: 'failed', problem: 'unavailable' })
        return
      }
      // This application uses email confirmation after all (or Core cannot create accounts now).
      setActivation('email_confirmation')
    }
    const outcome = await signUpApplicant(client, email, chosen, `${window.location.origin}${routes.login}`)
    if (outcome.ok) {
      setPassword('')
      setConfirmation('')
      setAccount({ state: 'sent' })
    } else setAccount({ state: 'failed', problem: outcome.problem })
  }

  const retryAccount = (ev: FormEvent) => {
    ev.preventDefault()
    if (checkPassword(password) || checkConfirmation(password, confirmation)) {
      setTouched((x) => ({ ...x, password: true, confirmPassword: true }))
      return
    }
    if (account.state === 'password' && authSettings) {
      // Already signed in with the one-time token: only the password is left to save.
      void setAccountPassword(memberAuthClient(authSettings), password).then((saved) => {
        if (saved.ok) {
          setPassword('')
          setConfirmation('')
          setAccount({ state: 'active', member: status?.status === 'approved' })
        } else setAccount({ state: 'password', problem: saved.problem })
      })
      return
    }
    void setUpAccount(accountEmail, password, accountToken, activation)
  }

  /** "Try again" after the options failed to load: read them again, from the browser. */
  const retryOptions = async () => {
    if (!applyBaseUrl || retrying) return
    setRetrying(true)
    const fresh = await fetchMembershipOptions(applyBaseUrl)
    setRetrying(false)
    if (fresh) setOptions(fresh)
    else requestAnimationFrame(() => summaryRef.current?.focus())
  }

  const startOver = () => {
    forgetApplication()
    setStatus(null)
    setJustSent(false)
    setPassword('')
    setConfirmation('')
    setAccount({ state: 'idle' })
    setValues(EMPTY)
    setInterests([])
    setTouched({})
    setSubmitted(false)
    setServerErrors({})
    setNotice(null)
  }

  const id = (f: Field) => `${uid}-${f}`
  const described = (f: Field, hint = true) => [hint ? `${id(f)}-hint` : '', shown(f) ? `${id(f)}-error` : ''].filter(Boolean).join(' ') || undefined
  const discipline = values.discipline as DisciplineId | ''
  const since = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-GB', { month: 'short', year: 'numeric' }).format(new Date())
  const listed = asksInstitution && values.institution && !typedInstitution ? options?.institutions.find((i) => i.id === values.institution) : null
  const institutionLabel = listed ? l(listed.name) : typedInstitution ? values.institutionName.trim() : ''

  const memberCard = (
    <div className={styles.card} style={{ '--key': discipline ? DISCIPLINE_COLOR[discipline] : 'var(--border-strong)' } as CSSProperties} aria-hidden="true">
      <div className={styles.cardTop}>
        <span>{c.card}</span>
        <span className={styles.cardFlag}>{c.cardPreview}</span>
      </div>
      <div className={styles.cardMain}>
        <span className={styles.cardSymbol}>{discipline ? <DisciplineSymbol id={discipline} /> : <span className={styles.cardBlank} />}</span>
        <div className={styles.cardWho}>
          <span className={styles.cardName} data-empty={!values.name.trim() || undefined}>
            {values.name.trim() || c.cardName}
          </span>
          <span className={styles.cardDiscipline}>{discipline ? l(DISCIPLINE_BY_ID[discipline].name) : '—'}</span>
          {institutionLabel ? (
            <span className={styles.cardInstitution} dir="auto">
              {institutionLabel}
            </span>
          ) : null}
        </div>
      </div>
      <dl className={styles.cardFacts}>
        <div>
          <dt>{c.cardCategory}</dt>
          <dd>{category ? l(category.label) : '—'}</dd>
        </div>
        {asksYear ? (
          <div>
            <dt>{c.cardYear}</dt>
            <dd>{values.year ? t.platform.common.yearN(Number(values.year)) : '—'}</dd>
          </div>
        ) : (
          <div>
            <dt>{c.cardNumber}</dt>
            <dd>{c.cardNumberValue}</dd>
          </div>
        )}
        <div>
          <dt>{c.cardSince}</dt>
          <dd>{since}</dd>
        </div>
      </dl>
      <div className={styles.cardInterests}>
        {interests.map((s) => (
          <span key={s}>{l(SKILLS[s])}</span>
        ))}
      </div>
      <div className={styles.cardStripe} />
    </div>
  )

  // The password and its confirmation, side by side on wide screens like the other paired fields.
  const passwordFields = (
    <div className={styles.row}>
      <div className={styles.field} data-invalid={Boolean(shown('password')) || undefined}>
        <label htmlFor={id('password')}>{c.password}</label>
        <p id={`${id('password')}-hint`} className={styles.hint}>
          {c.passwordHint(MIN_PASSWORD_LENGTH)}
        </p>
        <PasswordInput
          id={id('password')}
          value={password}
          onChange={(value) => setPassword(value)}
          onBlur={() => setTouched((x) => ({ ...x, password: true }))}
          autoComplete="new-password"
          invalid={Boolean(shown('password'))}
          describedBy={described('password')}
          disabled={sending}
        />
        {shown('password') && (
          <p id={`${id('password')}-error`} className={styles.error}>
            {shown('password')}
          </p>
        )}
      </div>
      <div className={styles.field} data-invalid={Boolean(shown('confirmPassword')) || undefined}>
        <label htmlFor={id('confirmPassword')}>{c.confirmPassword}</label>
        <p id={`${id('confirmPassword')}-hint`} className={styles.hint}>
          {c.confirmPasswordHint}
        </p>
        <PasswordInput
          id={id('confirmPassword')}
          value={confirmation}
          onChange={(value) => setConfirmation(value)}
          onBlur={() => setTouched((x) => ({ ...x, confirmPassword: true }))}
          autoComplete="new-password"
          invalid={Boolean(shown('confirmPassword'))}
          describedBy={described('confirmPassword')}
          disabled={sending}
        />
        {shown('confirmPassword') && (
          <p id={`${id('confirmPassword')}-error`} className={styles.error}>
            {shown('confirmPassword')}
          </p>
        )}
      </div>
    </div>
  )

  // Sent in this visit, or still open (pending or approved) from an earlier one.
  if (status && (justSent || status.status !== 'rejected')) {
    const submittedOn = new Intl.DateTimeFormat(intl, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Muscat' }).format(new Date(status.submittedAt))
    const pending = status.status === 'pending_review'
    // Core ADR 0030: what this submission recorded (falls back to email confirmation if needed).
    const immediate = justSent && activation === 'immediate'
    return (
      <div className={styles.success}>
        <div className={styles.successCopy} role="status">
          <p className={styles.successMark} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </p>
          <h2 ref={titleRef} className={styles.successTitle} tabIndex={-1}>
            {justSent ? (pending ? c.successTitle : c.welcomeTitle) : c.status[status.status]}
          </h2>
          <p className={styles.successBody}>{justSent
              ? immediate
                ? pending
                  ? c.immediatePendingBody
                  : c.immediateBody
                : pending
                  ? c.successBody
                  : c.welcomeBody
              : pending
                ? c.statusBody.pending_review(submittedOn)
                : c.statusBody.approved}</p>
          {pending ? (
            <>
              <h3 className={styles.nextTitle}>{c.nextTitle}</h3>
              <ol className={styles.next}>
                {c.next.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </>
          ) : null}
          {justSent && authSettings ? (
            account.state === 'active' ? (
              <p className={styles.successNote}>{account.member ? c.accountActiveMember : c.accountActivePending}</p>
            ) : account.state === 'existing' ? (
              <p className={styles.successNote}>{c.accountAlreadyExists}</p>
            ) : account.state === 'password' ? (
              <form className={styles.successNote} onSubmit={retryAccount} noValidate>
                <p>{account.problem === 'weak-password' ? c.accountWeak : c.accountPasswordFailed}</p>
                {passwordFields}
                <button type="submit" className="btn btn--secondary btn--compact">
                  {c.accountSavePassword}
                </button>
              </form>
            ) : account.state === 'sent' ? (
              <p className={styles.successNote}>
                {pending ? c.accountConfirm(accountEmail) : c.accountConfirmMember(accountEmail)} {c.accountExisting}
              </p>
            ) : account.state === 'working' ? (
              <p className={styles.successNote} aria-busy="true">
                {c.accountRetrying}
              </p>
            ) : account.state === 'failed' ? (
              <form className={styles.successNote} onSubmit={retryAccount} noValidate>
                <p>
                  {account.problem === 'weak-password' ? c.accountWeak : c.accountFailed} {c.accountNote}
                </p>
                {account.problem === 'weak-password' ? passwordFields : null}
                <button type="submit" className="btn btn--secondary btn--compact">
                  {c.accountRetry}
                </button>
              </form>
            ) : null
          ) : null}
          <div className={styles.successActions}>
            {account.state === 'active' && account.member ? (
              <Link href={routes.profile} className="btn btn--primary">
                {c.openProfile}
                <IconArrowRight className="btn__arrow" />
              </Link>
            ) : null}
            <Link href={routes.events} className={account.state === 'active' && account.member ? 'btn btn--secondary' : 'btn btn--primary'}>
              {c.explore}
              <IconArrowRight className="btn__arrow" />
            </Link>
            {authSettings && account.state !== 'active' ? (
              <Link href={routes.login} className="btn btn--secondary">
                {c.signIn}
              </Link>
            ) : null}
            <button type="button" className="btn btn--quiet" onClick={startOver}>
              {c.another}
            </button>
          </div>
        </div>
        <div className={styles.cardCol}>{memberCard}</div>
      </div>
    )
  }

  // Without Core's categories the form cannot know what to ask: no half-built form.
  if (!options) {
    return (
      <div className={styles.layout}>
        <div className={styles.form} aria-label={c.formLabel} role="region">
          {applyBaseUrl ? (
            <div ref={summaryRef} className={styles.summary} tabIndex={-1} role="alert" aria-busy={retrying}>
              <p className={styles.summaryTitle}>{c.optionsFailedTitle}</p>
              <p>{c.optionsFailedBody}</p>
              <p>
                <button type="button" className="btn btn--secondary btn--compact" onClick={() => void retryOptions()} disabled={retrying}>
                  {retrying ? c.optionsRetrying : c.optionsRetry}
                </button>
              </p>
            </div>
          ) : (
            <p className="preview-note" role="status">
              <span className="status-dot" aria-hidden="true" />
              <span>{c.unavailableNote}</span>
            </p>
          )}
        </div>
        <div className={styles.cardCol}>{memberCard}</div>
      </div>
    )
  }

  const visibleErrors = (Object.keys(errors) as Field[]).filter((f) => submitted && errors[f])
  const noticeText =
    notice === 'duplicate'
      ? { title: c.duplicateTitle, body: options?.approval === 'automatic' ? c.duplicateBodyAutomatic : c.duplicateBody }
      : notice === 'member'
        ? { title: c.memberTitle, body: c.memberBody }
        : notice === 'rateLimited'
          ? { title: c.rateLimited, body: null }
          : notice === 'unavailable'
            ? { title: c.unavailable, body: null }
            : null

  const yearField = (
    <div className={styles.field} data-invalid={Boolean(shown('year')) || undefined}>
      <label htmlFor={id('year')}>{c.year}</label>
      <select
        id={id('year')}
        value={values.year}
        onChange={(e) => {
          edited('year')
          setValues((v) => ({ ...v, year: e.target.value }))
        }}
        onBlur={() => setTouched((x) => ({ ...x, year: true }))}
        aria-invalid={Boolean(shown('year'))}
        aria-describedby={described('year', false)}
      >
        <option value="">{c.yearPlaceholder}</option>
        {[1, 2, 3, 4, 5].map((y) => (
          <option key={y} value={y}>
            {t.platform.common.yearN(y)}
          </option>
        ))}
      </select>
      {shown('year') && (
        <p id={`${id('year')}-error`} className={styles.error}>
          {shown('year')}
        </p>
      )}
    </div>
  )

  const disciplineField = (
    <div className={styles.field} data-invalid={Boolean(shown('discipline')) || undefined}>
      <label htmlFor={id('discipline')}>{c.discipline}</label>
      <select
        id={id('discipline')}
        value={values.discipline}
        onChange={(e) => {
          edited('discipline')
          setValues((v) => ({ ...v, discipline: e.target.value }))
        }}
        onBlur={() => setTouched((x) => ({ ...x, discipline: true }))}
        aria-invalid={Boolean(shown('discipline'))}
        aria-describedby={described('discipline', false)}
      >
        <option value="">{c.disciplinePlaceholder}</option>
        {DISCIPLINES.map((d) => (
          <option key={d.id} value={d.id}>
            {l(d.name)}
          </option>
        ))}
      </select>
      {shown('discipline') && (
        <p id={`${id('discipline')}-error`} className={styles.error}>
          {shown('discipline')}
        </p>
      )}
    </div>
  )

  const student = category?.institution === 'required'
  const institutionField = asksInstitution ? (
    <div className={styles.field} data-invalid={Boolean(shown('institution')) || undefined}>
      <label htmlFor={id('institution')}>{student ? c.institution : c.almaMater}</label>
      <p id={`${id('institution')}-hint`} className={styles.hint}>
        {student ? c.institutionHint : c.almaMaterHint}
      </p>
      <select
        id={id('institution')}
        value={values.institution}
        onChange={(e) => {
          edited('institution', 'institutionName')
          setValues((v) => ({ ...v, institution: e.target.value, institutionName: e.target.value === OTHER_INSTITUTION ? v.institutionName : '' }))
        }}
        onBlur={() => setTouched((x) => ({ ...x, institution: true }))}
        aria-invalid={Boolean(shown('institution'))}
        aria-describedby={described('institution')}
      >
        <option value="">{student ? c.institutionPlaceholder : c.almaMaterPlaceholder}</option>
        {options?.institutions.map((i) => (
          <option key={i.id} value={i.id}>
            {l(i.name)}
          </option>
        ))}
        <option value={OTHER_INSTITUTION}>{c.otherInstitution}</option>
      </select>
      {shown('institution') && (
        <p id={`${id('institution')}-error`} className={styles.error}>
          {shown('institution')}
        </p>
      )}
    </div>
  ) : null

  return (
    <div className={styles.layout}>
      <form className={styles.form} onSubmit={onSubmit} noValidate aria-label={c.formLabel} aria-busy={sending}>
        {!available ? (
          <p className="preview-note">
            <span className="status-dot" aria-hidden="true" />
            <span>{c.unavailableNote}</span>
          </p>
        ) : status?.status === 'rejected' ? (
          <p className="preview-note" role="status">
            <span className="status-dot" aria-hidden="true" />
            <span>
              <strong>{c.status.rejected}.</strong> {c.statusBody.rejected}
            </span>
          </p>
        ) : statusProblem ? (
          <p className="preview-note" role="status">
            <span className="status-dot" aria-hidden="true" />
            <span>{c.statusUnavailable}</span>
          </p>
        ) : null}

        {(submitted && visibleErrors.length > 0) || noticeText ? (
          <div ref={summaryRef} className={styles.summary} tabIndex={-1} role="alert">
            {noticeText ? (
              <>
                <p className={styles.summaryTitle}>{noticeText.title}</p>
                {noticeText.body ? <p>{noticeText.body}</p> : null}
              </>
            ) : (
              <>
                <p className={styles.summaryTitle}>{c.errorSummary(visibleErrors.length)}</p>
                <ul>
                  {visibleErrors.map((f) => (
                    <li key={f}>
                      <a href={`#${id(f)}`}>{errors[f]}</a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : null}

        <div className={styles.field} data-invalid={Boolean(shown('name')) || undefined}>
          <label htmlFor={id('name')}>{c.name}</label>
          <p id={`${id('name')}-hint`} className={styles.hint}>
            {c.nameHint}
          </p>
          <input
            id={id('name')}
            autoComplete="name"
            maxLength={200}
            value={values.name}
            onChange={(e) => {
              edited('name')
              setValues((v) => ({ ...v, name: e.target.value }))
            }}
            onBlur={() => setTouched((x) => ({ ...x, name: true }))}
            aria-invalid={Boolean(shown('name'))}
            aria-describedby={described('name')}
          />
          {shown('name') && (
            <p id={`${id('name')}-error`} className={styles.error}>
              {shown('name')}
            </p>
          )}
        </div>

        <div className={styles.field} data-invalid={Boolean(shown('email')) || undefined}>
          <label htmlFor={id('email')}>{c.email}</label>
          <p id={`${id('email')}-hint`} className={styles.hint}>
            {c.emailHint}
          </p>
          <input
            id={id('email')}
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            maxLength={254}
            value={values.email}
            onChange={(e) => {
              edited('email')
              setValues((v) => ({ ...v, email: e.target.value }))
            }}
            onBlur={() => setTouched((x) => ({ ...x, email: true }))}
            aria-invalid={Boolean(shown('email'))}
            aria-describedby={described('email')}
          />
          {shown('email') && (
            <p id={`${id('email')}-error`} className={styles.error}>
              {shown('email')}
            </p>
          )}
        </div>

        <fieldset
          className={styles.field}
          id={id('category')}
          data-invalid={Boolean(shown('category')) || undefined}
          aria-describedby={described('category')}
        >
          <legend>{c.category}</legend>
          <p id={`${id('category')}-hint`} className={styles.hint}>
            {c.categoryHint}
          </p>
          <div className={styles.interests} role="radiogroup" aria-required="true" aria-invalid={Boolean(shown('category'))}>
            {options?.categories.map((option) => (
              <label key={option.id} className={styles.interest}>
                <input type="radio" name={`${uid}-category`} value={option.id} checked={values.category === option.id} onChange={() => chooseCategory(option.id)} />
                <span>{l(option.label)}</span>
              </label>
            ))}
          </div>
          {shown('category') && (
            <p id={`${id('category')}-error`} className={styles.error}>
              {shown('category')}
            </p>
          )}
        </fieldset>

        {asksInstitution && asksYear ? (
          <div className={styles.row}>
            {institutionField}
            {yearField}
          </div>
        ) : asksInstitution ? (
          institutionField
        ) : null}

        {typedInstitution ? (
          <div className={styles.field} data-invalid={Boolean(shown('institutionName')) || undefined}>
            <label htmlFor={id('institutionName')}>{c.institutionName}</label>
            <p id={`${id('institutionName')}-hint`} className={styles.hint}>
              {c.institutionNameHint}
            </p>
            <input
              id={id('institutionName')}
              autoComplete="organization"
              dir="auto"
              maxLength={120}
              value={values.institutionName}
              onChange={(e) => {
                edited('institutionName')
                setValues((v) => ({ ...v, institutionName: e.target.value }))
              }}
              onBlur={() => setTouched((x) => ({ ...x, institutionName: true }))}
              aria-invalid={Boolean(shown('institutionName'))}
              aria-describedby={described('institutionName')}
            />
            {shown('institutionName') && (
              <p id={`${id('institutionName')}-error`} className={styles.error}>
                {shown('institutionName')}
              </p>
            )}
          </div>
        ) : null}

        {asksYear && !asksInstitution ? (
          <div className={styles.row}>
            {yearField}
            {disciplineField}
          </div>
        ) : (
          disciplineField
        )}

        {authSettings ? passwordFields : null}

        <fieldset className={styles.field} id={id('interests')} data-invalid={Boolean(shown('interests')) || undefined} aria-describedby={described('interests')}>
          <legend>{c.interests}</legend>
          <p id={`${id('interests')}-hint`} className={styles.hint}>
            {c.interestsHint}
          </p>
          <div className={styles.interests}>
            {(Object.keys(SKILLS) as SkillId[]).map((s) => (
              <label key={s} className={styles.interest}>
                <input
                  type="checkbox"
                  checked={interests.includes(s)}
                  onChange={(e) => {
                    edited('interests')
                    setTouched((x) => ({ ...x, interests: true }))
                    setInterests((list) => (e.target.checked ? [...list, s] : list.filter((x) => x !== s)))
                  }}
                />
                <span>{l(SKILLS[s])}</span>
              </label>
            ))}
          </div>
          {shown('interests') && (
            <p id={`${id('interests')}-error`} className={styles.error}>
              {shown('interests')}
            </p>
          )}
        </fieldset>

        <div className={styles.field} data-invalid={Boolean(shown('consent')) || undefined}>
          <label className={styles.consent}>
            <input
              id={id('consent')}
              type="checkbox"
              checked={values.consent}
              onChange={(e) => {
                edited('consent')
                setValues((v) => ({ ...v, consent: e.target.checked }))
              }}
              aria-invalid={Boolean(shown('consent'))}
              aria-describedby={described('consent', false)}
            />
            <span>{c.consent}</span>
          </label>
          {shown('consent') && (
            <p id={`${id('consent')}-error`} className={styles.error}>
              {shown('consent')}
            </p>
          )}
        </div>

        <div className={styles.actions}>
          <button type="submit" className="btn btn--primary" disabled={sending || !available} aria-busy={sending}>
            {sending ? (
              <>
                <span className={styles.spinner} aria-hidden="true" />
                {progress !== null && progress > 0 ? c.uploading(Math.round(progress * 100)) : c.checking}
              </>
            ) : (
              <>
                {c.submit}
                <IconArrowRight className="btn__arrow" />
              </>
            )}
          </button>
          {sending && progress !== null ? (
            <span className={styles.progress} aria-hidden="true">
              <span style={{ '--fill': `${Math.round(progress * 100)}%` } as CSSProperties} />
            </span>
          ) : null}
          {authSettings ? (
            <p className={styles.tip}>
              {c.haveAccount} <Link href={routes.login}>{c.signIn}</Link>
            </p>
          ) : null}
        </div>
      </form>
      <div className={styles.cardCol}>{memberCard}</div>
    </div>
  )
}
