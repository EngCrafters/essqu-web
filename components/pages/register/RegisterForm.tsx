'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { DisciplineSymbol } from '@/components/ui/DisciplineSymbol'
import { IconArrowRight } from '@/components/ui/icons'
import { DISCIPLINES, DISCIPLINE_BY_ID, type DisciplineId } from '@/content/disciplines'
import { DISCIPLINE_COLOR, SKILLS, type SkillId } from '@/content/platform/taxonomy'
import {
  DOCUMENT_ACCEPT,
  fetchApplicationStatus,
  forgetApplication,
  membershipFormData,
  prepareDocument,
  recallApplication,
  rememberApplication,
  submitMembershipApplication,
  type ApplicationField,
  type PreparedDocument,
} from '@/lib/core-api/membership'
import styles from './Register.module.css'
import { routes } from '@/lib/routes'
import { PasswordInput } from '@/components/pages/account/PasswordInput'
import { memberAuthClient, signUpApplicant, type MemberAuthSettings } from '@/lib/member-auth/client'
import type { AuthProblem } from '@/lib/member-auth/errors'
import { MIN_PASSWORD_LENGTH, checkConfirmation, checkPassword } from '@/lib/member-auth/password'

type Field = 'name' | 'email' | 'studentId' | 'year' | 'discipline' | 'password' | 'confirmPassword' | 'interests' | 'idDocument' | 'consent'
/** The applicant's own sign-in, set up with Supabase Auth after Core accepted the application. */
type Account = { state: 'idle' } | { state: 'working' } | { state: 'sent' } | { state: 'failed'; problem: AuthProblem }
type Errors = Partial<Record<Field, string>>
type Notice = 'duplicate' | 'member' | 'rateLimited' | 'unavailable' | null
type Card = { name: string; size: number; preview: string | null; prepared: PreparedDocument | null }
type Status = { status: 'pending_review' | 'approved' | 'rejected'; submittedAt: string } | null

const MAX_INTERESTS = 4

/** Core's field names → this form's fields. */
const FROM_CORE: Record<ApplicationField, Field> = {
  fullName: 'name',
  email: 'email',
  universityId: 'studentId',
  academicYear: 'year',
  discipline: 'discipline',
  interests: 'interests',
  consent: 'consent',
  idDocument: 'idDocument',
}

const formatSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`)

/**
 * The membership application. Validation runs on blur and on submit; a summary at the top lists
 * what needs attention and moves focus there. On submit, the form and the SQU ID card go from this
 * browser to the Core platform (lib/core-api/membership.ts), which stores the application for
 * review. Nothing is called a membership until it is approved.
 *
 * With sign-in configured, the applicant also chooses a password. It is never part of the
 * application: once Core has accepted the application, this browser sends the password to
 * Supabase Auth's own sign-up (Core's ADR 0019), which emails a confirmation link. If that step
 * fails, the application still stands and the applicant can retry it here.
 */
export function RegisterForm({ applyBaseUrl, authSettings }: { applyBaseUrl: string | null; authSettings: MemberAuthSettings | null }) {
  const { t, l, locale, intl } = useI18n()
  const c = t.platform.registerPage
  const uid = useId()
  const summaryRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const inFlight = useRef(false)

  const [values, setValues] = useState({ name: '', email: '', studentId: '', year: '', discipline: '', consent: false })
  const [interests, setInterests] = useState<SkillId[]>([])
  const [card, setCard] = useState<Card | null>(null)
  const [preparing, setPreparing] = useState(false)
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

  // The card preview is an object URL; release it when it changes.
  useEffect(() => () => void (card?.preview && URL.revokeObjectURL(card.preview)), [card])

  const cardError = (prepared: PreparedDocument | null): string | undefined => {
    if (!prepared) return c.errors.cardRequired
    if (prepared.ok) return undefined
    return {
      required: c.errors.cardRequired,
      'unsupported-type': c.errors.cardType,
      'too-large': c.errors.cardTooLarge,
      unreadable: c.errors.cardUnreadable,
    }[prepared.problem]
  }

  const validate = (): Errors => {
    const e: Errors = {}
    const name = values.name.trim()
    if (!name) e.name = c.errors.nameRequired
    else if (name.split(/\s+/).length < 2) e.name = c.errors.nameShort
    else if (name.length > 200) e.name = c.errors.nameLong
    const email = values.email.trim().toLowerCase()
    if (!email) e.email = c.errors.emailRequired
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = c.errors.emailInvalid
    else if (!/@([a-z0-9-]+\.)*squ\.edu\.om$/.test(email)) e.email = c.errors.emailDomain
    if (!values.studentId.trim()) e.studentId = c.errors.idRequired
    else if (!/^\d{6,10}$/.test(values.studentId.trim())) e.studentId = c.errors.idInvalid
    if (!values.year) e.year = c.errors.yearRequired
    if (!values.discipline) e.discipline = c.errors.disciplineRequired
    if (authSettings) {
      const problem = checkPassword(password)
      if (problem) e.password = problem === 'required' ? c.errors.passwordRequired : problem === 'too-short' ? c.errors.passwordShort(MIN_PASSWORD_LENGTH) : c.errors.passwordLong
      const mismatch = checkConfirmation(password, confirmation)
      if (mismatch) e.confirmPassword = mismatch === 'required' ? c.errors.confirmRequired : c.errors.passwordMismatch
    }
    if (interests.length > MAX_INTERESTS) e.interests = c.errors.interestsMax
    if (!preparing) {
      const problem = cardError(card?.prepared ?? null)
      if (problem) e.idDocument = problem
    }
    if (!values.consent) e.consent = c.errors.consent
    return { ...e, ...serverErrors }
  }

  const errors = validate()
  const shown = (f: Field) => (submitted || touched[f] ? errors[f] : undefined)
  const errorCount = Object.keys(errors).length

  /** A field edited after Core named it no longer carries Core's message. */
  const edited = (f: Field) => {
    setNotice(null)
    if (serverErrors[f])
      setServerErrors((current) => {
        const next = { ...current }
        delete next[f]
        return next
      })
  }

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    edited('idDocument')
    setTouched((x) => ({ ...x, idDocument: true }))
    if (!file) return
    setPreparing(true)
    setCard({ name: file.name, size: file.size, preview: null, prepared: null })
    const prepared = await prepareDocument(file)
    setPreparing(false)
    setCard({
      name: file.name,
      size: prepared.ok ? prepared.blob.size : file.size,
      preview: prepared.ok && prepared.kind !== 'application/pdf' ? URL.createObjectURL(prepared.blob) : null,
      prepared,
    })
  }

  const removeFile = () => {
    setCard(null)
    edited('idDocument')
    if (fileRef.current) fileRef.current.value = ''
    fileRef.current?.focus()
  }

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault()
    if (inFlight.current || preparing) return
    setSubmitted(true)
    setNotice(null)
    if (errorCount > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    if (!applyBaseUrl || !card?.prepared?.ok) {
      setNotice('unavailable')
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    inFlight.current = true
    setSending(true)
    setProgress(0)
    const form = membershipFormData(
      { fullName: values.name, email: values.email, universityId: values.studentId, academicYear: values.year, discipline: values.discipline, interests },
      card.prepared,
    )
    const outcome = await submitMembershipApplication(applyBaseUrl, form, (fraction) => setProgress(fraction))
    inFlight.current = false
    setSending(false)
    setProgress(null)
    switch (outcome.kind) {
      case 'submitted':
        rememberApplication(outcome.statusToken)
        setStatus({ status: 'pending_review', submittedAt: new Date().toISOString() })
        setJustSent(true)
        window.scrollTo({ top: 0, behavior: 'auto' })
        requestAnimationFrame(() => titleRef.current?.focus())
        if (authSettings) void setUpAccount(values.email, password)
        return
      case 'invalid': {
        const named: Errors = {}
        for (const { field, code } of outcome.fields) {
          const f = FROM_CORE[field]
          named[f] =
            f === 'idDocument'
              ? code === 'too-large'
                ? c.errors.cardTooLarge
                : code === 'required'
                  ? c.errors.cardRequired
                  : c.errors.cardType
              : f === 'email'
                ? c.errors.emailDomain
                : f === 'studentId'
                  ? c.errors.idInvalid
                  : f === 'name'
                    ? c.errors.nameRequired
                    : f === 'interests'
                      ? c.errors.interestsMax
                      : f === 'consent'
                        ? c.errors.consent
                        : f === 'year'
                          ? c.errors.yearRequired
                          : c.errors.disciplineRequired
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
  const setUpAccount = async (email: string, chosen: string) => {
    if (!authSettings) return
    setAccountEmail(email.trim().toLowerCase())
    setAccount({ state: 'working' })
    const outcome = await signUpApplicant(memberAuthClient(authSettings), email, chosen, `${window.location.origin}${routes.login}`)
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
    void setUpAccount(accountEmail, password)
  }

  const startOver = () => {
    forgetApplication()
    setStatus(null)
    setJustSent(false)
    setPassword('')
    setConfirmation('')
    setAccount({ state: 'idle' })
    setValues({ name: '', email: '', studentId: '', year: '', discipline: '', consent: false })
    setInterests([])
    setCard(null)
    setTouched({})
    setSubmitted(false)
    setServerErrors({})
    setNotice(null)
  }

  const id = (f: Field) => `${uid}-${f}`
  const described = (f: Field, hint = true) => [hint ? `${id(f)}-hint` : '', shown(f) ? `${id(f)}-error` : ''].filter(Boolean).join(' ') || undefined
  const discipline = values.discipline as DisciplineId | ''
  const since = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-GB', { month: 'short', year: 'numeric' }).format(new Date())

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
        </div>
      </div>
      <dl className={styles.cardFacts}>
        <div>
          <dt>{c.cardNumber}</dt>
          <dd>{c.cardNumberValue}</dd>
        </div>
        <div>
          <dt>{c.cardYear}</dt>
          <dd>{values.year ? t.platform.common.yearN(Number(values.year)) : '—'}</dd>
        </div>
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
    return (
      <div className={styles.success}>
        <div className={styles.successCopy} role="status">
          <p className={styles.successMark} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </p>
          <h2 ref={titleRef} className={styles.successTitle} tabIndex={-1}>
            {justSent ? c.successTitle : c.status[status.status]}
          </h2>
          <p className={styles.successBody}>{justSent ? c.successBody : pending ? c.statusBody.pending_review(submittedOn) : c.statusBody.approved}</p>
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
            account.state === 'sent' ? (
              <p className={styles.successNote}>
                {c.accountConfirm(accountEmail)} {c.accountExisting}
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
            <Link href={routes.events} className="btn btn--primary">
              {c.explore}
              <IconArrowRight className="btn__arrow" />
            </Link>
            {authSettings ? (
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

  const visibleErrors = (Object.keys(errors) as Field[]).filter((f) => submitted && errors[f])
  const noticeText =
    notice === 'duplicate'
      ? { title: c.duplicateTitle, body: c.duplicateBody }
      : notice === 'member'
        ? { title: c.memberTitle, body: c.memberBody }
        : notice === 'rateLimited'
          ? { title: c.rateLimited, body: null }
          : notice === 'unavailable'
            ? { title: c.unavailable, body: null }
            : null
  const fileMeta = preparing ? c.preparingFile : card?.prepared?.ok ? c.fileReady(formatSize(card.size)) : ''

  return (
    <div className={styles.layout}>
      <form className={styles.form} onSubmit={onSubmit} noValidate aria-label={c.formLabel} aria-busy={sending}>
        {!applyBaseUrl ? (
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

        <div className={styles.row}>
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
          <div className={styles.field} data-invalid={Boolean(shown('studentId')) || undefined}>
            <label htmlFor={id('studentId')}>{c.studentId}</label>
            <p id={`${id('studentId')}-hint`} className={styles.hint}>
              {c.studentIdHint}
            </p>
            <input
              id={id('studentId')}
              inputMode="numeric"
              autoComplete="off"
              dir="ltr"
              maxLength={10}
              value={values.studentId}
              onChange={(e) => {
                edited('studentId')
                setValues((v) => ({ ...v, studentId: e.target.value.replace(/\s/g, '') }))
              }}
              onBlur={() => setTouched((x) => ({ ...x, studentId: true }))}
              aria-invalid={Boolean(shown('studentId'))}
              aria-describedby={described('studentId')}
            />
            {shown('studentId') && (
              <p id={`${id('studentId')}-error`} className={styles.error}>
                {shown('studentId')}
              </p>
            )}
          </div>
        </div>

        <div className={styles.row}>
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
        </div>

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

        <div className={styles.field} data-invalid={Boolean(shown('idDocument')) || undefined}>
          <label htmlFor={id('idDocument')}>{c.idCard}</label>
          <p id={`${id('idDocument')}-hint`} className={styles.hint}>
            {c.idCardHint} {c.idCardWhy}
          </p>
          <div className={styles.upload} data-filled={card ? '' : undefined}>
            <span className={styles.uploadPreview} aria-hidden="true">
              {card?.preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- a local object URL of the visitor's own file, never uploaded as-is
                <img src={card.preview} alt="" />
              ) : (
                <svg viewBox="0 0 48 32">
                  <rect x="1.5" y="1.5" width="45" height="29" rx="4" />
                  <circle cx="14" cy="14" r="5" />
                  <path d="M7 25c1.5-4 4-6 7-6s5.5 2 7 6M26 11h14M26 17h10M26 23h12" />
                </svg>
              )}
            </span>
            <span className={styles.uploadInfo}>
              <span className={styles.uploadName} dir="auto">
                {card ? card.name : c.noFile}
              </span>
              <span className={styles.uploadMeta} aria-live="polite">
                {fileMeta}
              </span>
            </span>
            <span className={styles.uploadButtons}>
              <span className={styles.uploadPick}>
                <input
                  ref={fileRef}
                  id={id('idDocument')}
                  type="file"
                  accept={DOCUMENT_ACCEPT}
                  className={styles.uploadInput}
                  onChange={onFile}
                  disabled={sending}
                  aria-invalid={Boolean(shown('idDocument'))}
                  aria-describedby={described('idDocument')}
                />
                <span className="btn btn--secondary btn--compact" aria-hidden="true">
                  {card ? c.replaceFile : c.chooseFile}
                </span>
              </span>
              {card && !sending ? (
                <button type="button" className={styles.uploadRemove} onClick={removeFile}>
                  {c.removeFile}
                </button>
              ) : null}
            </span>
          </div>
          {shown('idDocument') && (
            <p id={`${id('idDocument')}-error`} className={styles.error}>
              {shown('idDocument')}
            </p>
          )}
        </div>

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
          <button type="submit" className="btn btn--primary" disabled={sending || preparing || !applyBaseUrl} aria-busy={sending}>
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
