'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { DISCIPLINE_BY_ID, DISCIPLINES } from '@/content/disciplines'
import { SKILLS, type SkillId } from '@/content/platform/taxonomy'
import {
  MAX_INTERESTS,
  correctionProblem,
  draftOf,
  draftProblems,
  editOf,
  type CorrectionField,
  type EditField,
  type OwnProfile,
  type ProfileDraft,
  type ProfileEdit,
} from '@/lib/core-api/member-profile'
import type { MemberResult } from '@/lib/core-api/member-events'
import { OTHER_INSTITUTION, findCategory, type MembershipOptions } from '@/lib/core-api/membership-options'
import { memberProfileCopy } from '@/lib/i18n/dictionaries/pages/member-profile'
import m from './MemberProfile.module.css'

const VerifiedMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
)

/**
 * The member's details in two cards. Verified identity (name, membership email, and a student ID
 * kept from the earlier SQU-only form) changes only through a correction a reviewer approves; the
 * rest the member edits here when allowed. The category decides which of the university, alma
 * mater and academic year apply (Core ADR 0025); changing it clears the ones whose meaning changed.
 */
export function ProfileDetails({
  profile,
  options,
  canEdit,
  editing,
  setEditing,
  save,
  requestChange,
}: {
  profile: OwnProfile
  options: MembershipOptions | null
  canEdit: boolean
  editing: boolean
  setEditing: (editing: boolean) => void
  save: (edit: ProfileEdit) => Promise<MemberResult<OwnProfile>>
  requestChange: (field: CorrectionField, value: string) => Promise<MemberResult<OwnProfile>>
}) {
  const { t, l, locale } = useI18n()
  const c = memberProfileCopy[locale].profile
  const d = c.details
  const id = useId()
  const [draft, setDraft] = useState<ProfileDraft>(() => draftOf(profile))
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<'saved' | 'failed' | null>(null)
  const firstRef = useRef<HTMLSelectElement>(null)

  // Opening the editor starts from what is saved and puts the cursor in it.
  const [wasEditing, setWasEditing] = useState(editing)
  if (wasEditing !== editing) {
    setWasEditing(editing)
    if (editing) {
      setDraft(draftOf(profile))
      setTouched(false)
      setResult(null)
    }
  }
  useEffect(() => {
    if (editing) firstRef.current?.focus()
  }, [editing])

  const problems = draftProblems(draft, options)
  const shown = (f: EditField) => touched && problems[f]
  const category = findCategory(options, draft.category)
  const asksInstitution = Boolean(category && category.institution !== 'none')
  const student = category?.institution === 'required'
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    const edit = editOf(draft, options)
    if (Object.keys(problems).length || !edit) return
    setBusy(true)
    setResult(null)
    const outcome = await save(edit)
    setBusy(false)
    setResult(outcome.ok ? 'saved' : 'failed')
    if (outcome.ok) setEditing(false)
  }

  const pendingFor = (field: CorrectionField) => profile.changeRequests.find((r) => r.field === field && r.status === 'pending')
  const decided = profile.changeRequests.find((r) => r.status !== 'pending')
  const empty = <dd data-empty="">{d.notAdded}</dd>
  const institutionLabel = profile.institution ? l(profile.institution) : profile.institutionName
  const error = (f: EditField, message: string) =>
    shown(f) ? (
      <p id={`${id}-${f}-error`} className={m.problem}>
        {message}
      </p>
    ) : null
  const describedBy = (f: EditField, hint = false) => [hint ? `${id}-${f}-hint` : '', shown(f) ? `${id}-${f}-error` : ''].filter(Boolean).join(' ') || undefined

  return (
    <div className={m.cards}>
      <section className={m.card} data-verified="" aria-labelledby={`${id}-verified`}>
        <div className={m.cardHead}>
          <h3 id={`${id}-verified`} className={m.cardTitle}>
            {d.verifiedTitle}
          </h3>
          <span className={m.stamp}>
            <VerifiedMark />
            {d.verified}
          </span>
        </div>
        <dl className={m.list}>
          <div>
            <dt>{d.fullName}</dt>
            <dd dir="auto">
              {profile.name}
              {pendingFor('full_name') && <span className={m.pending}>{c.correction.pending(pendingFor('full_name')!.requestedValue)}</span>}
            </dd>
          </div>
          <div>
            <dt>{d.email}</dt>
            <dd dir="ltr">{profile.email}</dd>
          </div>
          {profile.universityId ? (
            <div>
              <dt>{d.studentId}</dt>
              <dd dir="ltr">
                {profile.universityId}
                {pendingFor('university_id') && <span className={m.pending}>{c.correction.pending(pendingFor('university_id')!.requestedValue)}</span>}
              </dd>
            </div>
          ) : null}
        </dl>
        {decided && !pendingFor(decided.field) && (
          <p className={decided.status === 'approved' ? m.note : m.problem} role="status">
            {decided.status === 'approved' ? c.correction.approved : c.correction.rejected}
          </p>
        )}
        <p className={m.note}>{d.verifiedNote}</p>
        <CorrectionDialog profile={profile} requestChange={requestChange} />
      </section>

      <section className={m.card} aria-labelledby={`${id}-about`}>
        <div className={m.cardHead}>
          <h3 id={`${id}-about`} className={m.cardTitle}>
            {d.aboutTitle}
          </h3>
          {canEdit && !editing && (
            <button type="button" className="btn btn--secondary btn--compact" onClick={() => setEditing(true)}>
              {d.edit}
            </button>
          )}
        </div>
        {editing ? (
          <form className={m.form} onSubmit={onSubmit} noValidate aria-busy={busy}>
            <div className={m.row}>
              <div className={m.field} data-invalid={shown('category') || undefined}>
                <label htmlFor={`${id}-category`}>{d.category}</label>
                <select
                  ref={firstRef}
                  id={`${id}-category`}
                  value={draft.category}
                  onChange={(e) => {
                    const next = e.target.value
                    // Another category: the details whose meaning changed are cleared, never kept hidden.
                    setDraft((x) => (x.category === next ? x : { ...x, category: next, institution: '', institutionName: '', academicYear: '' }))
                  }}
                  aria-invalid={Boolean(shown('category'))}
                  aria-describedby={describedBy('category')}
                >
                  <option value="">—</option>
                  {options?.categories.map((x) => (
                    <option key={x.id} value={x.id}>
                      {l(x.label)}
                    </option>
                  ))}
                </select>
                {error('category', d.errors.category)}
              </div>
              <div className={m.field} data-invalid={shown('discipline') || undefined}>
                <label htmlFor={`${id}-discipline`}>{d.discipline}</label>
                <select
                  id={`${id}-discipline`}
                  value={draft.discipline}
                  onChange={(e) => setDraft((x) => ({ ...x, discipline: e.target.value }))}
                  aria-invalid={Boolean(shown('discipline'))}
                  aria-describedby={describedBy('discipline')}
                >
                  <option value="">—</option>
                  {DISCIPLINES.map((x) => (
                    <option key={x.id} value={x.id}>
                      {l(x.name)}
                    </option>
                  ))}
                </select>
                {error('discipline', d.errors.discipline)}
              </div>
            </div>
            {asksInstitution || category?.academicYear ? (
              <div className={m.row}>
                {asksInstitution ? (
                  <div className={m.field} data-invalid={shown('institution') || undefined}>
                    <label htmlFor={`${id}-institution`}>{student ? d.institution : d.almaMater}</label>
                    <select
                      id={`${id}-institution`}
                      value={draft.institution}
                      onChange={(e) => setDraft((x) => ({ ...x, institution: e.target.value, institutionName: e.target.value === OTHER_INSTITUTION ? x.institutionName : '' }))}
                      aria-invalid={Boolean(shown('institution'))}
                      aria-describedby={describedBy('institution')}
                    >
                      <option value="">{student ? d.institutionPlaceholder : d.almaMaterPlaceholder}</option>
                      {options?.institutions.map((x) => (
                        <option key={x.id} value={x.id}>
                          {l(x.name)}
                        </option>
                      ))}
                      <option value={OTHER_INSTITUTION}>{d.otherInstitution}</option>
                    </select>
                    {error('institution', d.errors.institution)}
                  </div>
                ) : null}
                {category?.academicYear ? (
                  <div className={m.field} data-invalid={shown('academicYear') || undefined}>
                    <label htmlFor={`${id}-year`}>{d.year}</label>
                    <select
                      id={`${id}-year`}
                      value={draft.academicYear}
                      onChange={(e) => setDraft((x) => ({ ...x, academicYear: e.target.value }))}
                      aria-invalid={Boolean(shown('academicYear'))}
                      aria-describedby={describedBy('academicYear')}
                    >
                      <option value="">—</option>
                      {[1, 2, 3, 4, 5].map((y) => (
                        <option key={y} value={y}>
                          {t.platform.common.yearN(y)}
                        </option>
                      ))}
                    </select>
                    {error('academicYear', d.errors.academicYear)}
                  </div>
                ) : null}
              </div>
            ) : null}
            {asksInstitution && draft.institution === OTHER_INSTITUTION ? (
              <div className={m.field} data-invalid={shown('institutionName') || undefined}>
                <label htmlFor={`${id}-institutionName`}>{d.institutionName}</label>
                <input
                  id={`${id}-institutionName`}
                  dir="auto"
                  maxLength={120}
                  autoComplete="organization"
                  value={draft.institutionName}
                  onChange={(e) => setDraft((x) => ({ ...x, institutionName: e.target.value }))}
                  aria-invalid={Boolean(shown('institutionName'))}
                  aria-describedby={describedBy('institutionName')}
                />
                {error('institutionName', d.errors.institutionName)}
              </div>
            ) : null}
            <div className={m.field} data-invalid={shown('phone') || undefined}>
              <label htmlFor={`${id}-phone`}>{d.phone}</label>
              <p id={`${id}-phone-hint`} className={m.hint}>
                {d.phoneHint}
              </p>
              <input
                id={`${id}-phone`}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                value={draft.phone}
                onChange={(e) => setDraft((x) => ({ ...x, phone: e.target.value }))}
                aria-invalid={Boolean(shown('phone'))}
                aria-describedby={describedBy('phone', true)}
              />
              {error('phone', d.errors.phone)}
            </div>
            <fieldset className={m.field} data-invalid={shown('interests') || undefined} aria-describedby={`${id}-interests-hint`}>
              <legend>{d.interests}</legend>
              <p id={`${id}-interests-hint`} className={m.hint}>
                {d.interestsHint}
              </p>
              <div className={m.chips}>
                {(Object.keys(SKILLS) as SkillId[]).map((s) => {
                  const on = draft.interests.includes(s)
                  return (
                    <label key={s} className={m.pick}>
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={!on && draft.interests.length >= MAX_INTERESTS}
                        onChange={(e) => setDraft((x) => ({ ...x, interests: e.target.checked ? [...x.interests, s] : x.interests.filter((i) => i !== s) }))}
                      />
                      <span>{l(SKILLS[s])}</span>
                    </label>
                  )
                })}
              </div>
              {shown('interests') && <p className={m.problem}>{d.errors.interests}</p>}
            </fieldset>
            <div className={m.actions}>
              <button type="submit" className="btn btn--primary btn--compact" disabled={busy}>
                {busy ? d.saving : d.save}
              </button>
              <button type="button" className="btn btn--secondary btn--compact" onClick={() => setEditing(false)} disabled={busy}>
                {d.cancel}
              </button>
            </div>
            {result === 'failed' && (
              <p className={m.problem} role="alert">
                {d.failed}
              </p>
            )}
          </form>
        ) : (
          <>
            <dl className={m.list}>
              <div>
                <dt>{d.category}</dt>
                {profile.categoryLabel ? <dd>{l(profile.categoryLabel)}</dd> : empty}
              </div>
              {institutionLabel ? (
                <div>
                  <dt>{profile.category === 'graduate' ? d.almaMater : d.institution}</dt>
                  <dd dir="auto">{institutionLabel}</dd>
                </div>
              ) : null}
              <div>
                <dt>{d.discipline}</dt>
                {profile.discipline ? <dd>{l(DISCIPLINE_BY_ID[profile.discipline].name)}</dd> : empty}
              </div>
              {profile.academicYear ? (
                <div>
                  <dt>{d.year}</dt>
                  <dd>{t.platform.common.yearN(profile.academicYear)}</dd>
                </div>
              ) : null}
              <div>
                <dt>{d.phone}</dt>
                {profile.phone ? <dd dir="ltr">{profile.phone}</dd> : empty}
              </div>
              <div>
                <dt>{d.interests}</dt>
                {profile.interests.length ? <dd>{profile.interests.map((s) => l(SKILLS[s])).join(' · ')}</dd> : empty}
              </div>
            </dl>
            {result === 'saved' && (
              <p className={`preview-note ${m.saved}`} role="status">
                <span className="status-dot" aria-hidden="true" />
                <span>{d.saved}</span>
              </p>
            )}
          </>
        )}
      </section>
    </div>
  )
}

/** A modal form: which verified detail is wrong and what it should be. */
function CorrectionDialog({ profile, requestChange }: { profile: OwnProfile; requestChange: (field: CorrectionField, value: string) => Promise<MemberResult<OwnProfile>> }) {
  const { locale } = useI18n()
  const c = memberProfileCopy[locale].profile.correction
  const id = useId()
  const ref = useRef<HTMLDialogElement>(null)
  const [field, setField] = useState<CorrectionField>('full_name')
  const [value, setValue] = useState('')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const open = () => {
    setField('full_name')
    setValue('')
    setTouched(false)
    setProblem(null)
    setSent(false)
    ref.current?.showModal()
  }
  const invalid = correctionProblem(field, value)
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (invalid) return
    setBusy(true)
    setProblem(null)
    const outcome = await requestChange(field, value.trim())
    setBusy(false)
    if (outcome.ok) {
      setSent(true)
      ref.current?.close()
    } else
      setProblem(
        outcome.code === 'UNCHANGED' || outcome.code === 'ALREADY_PENDING' ? c.errors[outcome.code] : outcome.code === 'VALIDATION_ERROR' ? c.errors[field] : c.errors.failed,
      )
  }
  const shownProblem = (touched && invalid && c.errors[invalid]) || problem

  return (
    <>
      <div className={m.actions}>
        <button type="button" className="btn btn--secondary btn--compact" onClick={open}>
          {c.action}
        </button>
      </div>
      {sent && (
        <p className={`preview-note ${m.saved}`} role="status">
          <span className="status-dot" aria-hidden="true" />
          <span>{c.sent}</span>
        </p>
      )}
      <dialog ref={ref} className={m.dialog} aria-labelledby={`${id}-title`}>
        <form className={`${m.dialogBody} ${m.form}`} onSubmit={onSubmit} noValidate aria-busy={busy}>
          <h2 id={`${id}-title`} className={m.dialogTitle}>
            {c.title}
          </h2>
          <p className={m.note}>{c.body}</p>
          <div className={m.field}>
            <label htmlFor={`${id}-field`}>{c.field}</label>
            <select id={`${id}-field`} value={field} onChange={(e) => setField(e.target.value as CorrectionField)}>
              <option value="full_name">{c.fields.full_name}</option>
              {/* A student ID exists only on records from the earlier SQU-only form. */}
              {profile.universityId ? <option value="university_id">{c.fields.university_id}</option> : null}
            </select>
          </div>
          <div className={m.field} data-invalid={shownProblem || undefined}>
            <label htmlFor={`${id}-value`}>{c.value}</label>
            <input
              id={`${id}-value`}
              value={value}
              dir={field === 'university_id' ? 'ltr' : 'auto'}
              inputMode={field === 'university_id' ? 'numeric' : 'text'}
              autoComplete="off"
              placeholder={field === 'full_name' ? profile.name : (profile.universityId ?? '')}
              onChange={(e) => {
                setValue(e.target.value)
                setProblem(null)
              }}
              aria-invalid={Boolean(shownProblem)}
              aria-describedby={shownProblem ? `${id}-value-error` : undefined}
            />
            {shownProblem && (
              <p id={`${id}-value-error`} className={m.problem}>
                {shownProblem}
              </p>
            )}
          </div>
          <div className={m.actions}>
            <button type="submit" className="btn btn--primary btn--compact" disabled={busy}>
              {busy ? c.sending : c.submit}
            </button>
            <button type="button" className="btn btn--secondary btn--compact" onClick={() => ref.current?.close()} disabled={busy}>
              {c.cancel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
