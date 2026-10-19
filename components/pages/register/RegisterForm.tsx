'use client'

import Link from 'next/link'
import { useId, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { useDemoSession } from '@/components/platform/DemoSession'
import { DisciplineSymbol } from '@/components/ui/DisciplineSymbol'
import { IconArrowRight } from '@/components/ui/icons'
import { DISCIPLINES, DISCIPLINE_BY_ID, type DisciplineId } from '@/content/disciplines'
import { DISCIPLINE_COLOR, SKILLS, type SkillId } from '@/content/platform/taxonomy'
import { DEMO_NOW } from '@/lib/data/clock'
import styles from './Register.module.css'
import { routes } from '@/lib/routes'

type Field = 'name' | 'email' | 'studentId' | 'year' | 'discipline' | 'interests' | 'consent'
type Errors = Partial<Record<Field, string>>

/** The ID the prototype treats as already registered, to demonstrate the duplicate check. */
const DUPLICATE_ID = '12345678'
const MAX_INTERESTS = 4

/**
 * The membership application. Validation runs on blur and on submit; a summary at the top lists
 * what needs attention and moves focus there. Nothing typed is stored or sent: on success the
 * session only records that the form was completed in this tab.
 */
export function RegisterForm() {
  const { t, l, locale } = useI18n()
  const c = t.platform.registerPage
  const session = useDemoSession()
  const uid = useId()
  const summaryRef = useRef<HTMLDivElement>(null)

  const [values, setValues] = useState({ name: '', email: '', studentId: '', year: '', discipline: '', consent: false })
  const [interests, setInterests] = useState<SkillId[]>([])
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [checking, setChecking] = useState(false)
  const [duplicate, setDuplicate] = useState(false)
  const [done, setDone] = useState(false)

  const validate = (): Errors => {
    const e: Errors = {}
    const name = values.name.trim()
    if (!name) e.name = c.errors.nameRequired
    else if (name.split(/\s+/).length < 2) e.name = c.errors.nameShort
    const email = values.email.trim().toLowerCase()
    if (!email) e.email = c.errors.emailRequired
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = c.errors.emailInvalid
    else if (!email.endsWith('squ.edu.om')) e.email = c.errors.emailDomain
    if (!values.studentId.trim()) e.studentId = c.errors.idRequired
    else if (!/^\d{6,10}$/.test(values.studentId.trim())) e.studentId = c.errors.idInvalid
    if (!values.year) e.year = c.errors.yearRequired
    if (!values.discipline) e.discipline = c.errors.disciplineRequired
    if (interests.length > MAX_INTERESTS) e.interests = c.errors.interestsMax
    if (!values.consent) e.consent = c.errors.consent
    return e
  }

  const errors = validate()
  const shown = (f: Field) => (submitted || touched[f] ? errors[f] : undefined)
  const errorCount = Object.keys(errors).length

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault()
    setSubmitted(true)
    setDuplicate(false)
    if (errorCount > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    setChecking(true)
    window.setTimeout(() => {
      setChecking(false)
      if (values.studentId.trim() === DUPLICATE_ID) {
        setDuplicate(true)
        requestAnimationFrame(() => summaryRef.current?.focus())
        return
      }
      session.completeMembership()
      setDone(true)
      window.scrollTo({ top: 0, behavior: 'auto' })
    }, 900)
  }

  const reset = () => {
    setValues({ name: '', email: '', studentId: '', year: '', discipline: '', consent: false })
    setInterests([])
    setTouched({})
    setSubmitted(false)
    setDuplicate(false)
    setDone(false)
  }

  const id = (f: Field) => `${uid}-${f}`
  const described = (f: Field, hint = true) => [hint ? `${id(f)}-hint` : '', shown(f) ? `${id(f)}-error` : ''].filter(Boolean).join(' ') || undefined
  const discipline = values.discipline as DisciplineId | ''
  const since = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-GB', { month: 'short', year: 'numeric' }).format(new Date(DEMO_NOW))

  const card = (
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

  if (done) {
    return (
      <div className={styles.success}>
        <div className={styles.successCopy}>
          <p className={styles.successMark} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </p>
          <h2 className={styles.successTitle} tabIndex={-1}>
            {c.successTitle}
          </h2>
          <p className={styles.successBody}>{c.successBody}</p>
          <h3 className={styles.nextTitle}>{c.nextTitle}</h3>
          <ol className={styles.next}>
            {c.next.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className={styles.successActions}>
            <Link href={routes.profile} className="btn btn--primary">
              {c.toProfile}
              <IconArrowRight className="btn__arrow" />
            </Link>
            <Link href={routes.events} className="btn btn--secondary">
              {c.explore}
            </Link>
            <button type="button" className="btn btn--quiet" onClick={reset}>
              {c.another}
            </button>
          </div>
          <p className={styles.successNote}>{c.toProfileNote}</p>
        </div>
        <div className={styles.cardCol}>{card}</div>
      </div>
    )
  }

  const visibleErrors = (Object.keys(errors) as Field[]).filter((f) => submitted && errors[f])

  return (
    <div className={styles.layout}>
      <form className={styles.form} onSubmit={onSubmit} noValidate aria-label={c.formLabel}>
        {(submitted && visibleErrors.length > 0) || duplicate ? (
          <div ref={summaryRef} className={styles.summary} tabIndex={-1} role="alert">
            {duplicate ? (
              <>
                <p className={styles.summaryTitle}>{c.duplicateTitle}</p>
                <p>{c.duplicateBody}</p>
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
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
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
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
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
          <div className={styles.field} data-invalid={Boolean(shown('studentId') || duplicate) || undefined}>
            <label htmlFor={id('studentId')}>{c.studentId}</label>
            <p id={`${id('studentId')}-hint`} className={styles.hint}>
              {c.studentIdHint}
            </p>
            <input
              id={id('studentId')}
              inputMode="numeric"
              autoComplete="off"
              dir="ltr"
              value={values.studentId}
              onChange={(e) => {
                setDuplicate(false)
                setValues((v) => ({ ...v, studentId: e.target.value.replace(/\s/g, '') }))
              }}
              onBlur={() => setTouched((x) => ({ ...x, studentId: true }))}
              aria-invalid={Boolean(shown('studentId') || duplicate)}
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
              onChange={(e) => setValues((v) => ({ ...v, year: e.target.value }))}
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
              onChange={(e) => setValues((v) => ({ ...v, discipline: e.target.value }))}
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
              onChange={(e) => setValues((v) => ({ ...v, consent: e.target.checked }))}
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
          <button type="submit" className="btn btn--primary" disabled={checking} aria-busy={checking}>
            {checking ? (
              <>
                <span className={styles.spinner} aria-hidden="true" />
                {c.checking}
              </>
            ) : (
              <>
                {c.submit}
                <IconArrowRight className="btn__arrow" />
              </>
            )}
          </button>
          <p className={styles.tip}>{c.demoTip}</p>
        </div>
      </form>
      <div className={styles.cardCol}>{card}</div>
    </div>
  )
}
