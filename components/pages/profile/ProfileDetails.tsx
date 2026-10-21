'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { DISCIPLINE_BY_ID, DISCIPLINES, type DisciplineId } from '@/content/disciplines'
import { SKILLS, type SkillId } from '@/content/platform/taxonomy'
import { normalizePhone } from '@/lib/core-api/member-events'
import {
  MAX_INTERESTS,
  correctionProblem,
  draftOf,
  draftProblems,
  type CorrectionField,
  type EditField,
  type OwnProfile,
  type ProfileDraft,
  type ProfileEdit,
} from '@/lib/core-api/member-profile'
import type { MemberResult } from '@/lib/core-api/member-events'
import { memberProfileCopy } from '@/lib/i18n/dictionaries/pages/member-profile'
import m from './MemberProfile.module.css'

const VerifiedMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
)

/**
 * The member's details in two cards. Verified identity (name, SQU email, student ID) changes
 * only through a correction a reviewer approves; the rest the member edits here when allowed.
 */
export function ProfileDetails({
  profile,
  canEdit,
  editing,
  setEditing,
  save,
  requestChange,
}: {
  profile: OwnProfile
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

  const problems = draftProblems(draft)
  const shown = (f: EditField) => touched && problems[f]
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (Object.keys(problems).length) return
    setBusy(true)
    setResult(null)
    const outcome = await save({
      phone: draft.phone.trim() ? normalizePhone(draft.phone) : null,
      academicYear: Number(draft.academicYear),
      discipline: draft.discipline as DisciplineId,
      interests: draft.interests,
    })
    setBusy(false)
    setResult(outcome.ok ? 'saved' : 'failed')
    if (outcome.ok) setEditing(false)
  }

  const pendingFor = (field: CorrectionField) => profile.changeRequests.find((r) => r.field === field && r.status === 'pending')
  const decided = profile.changeRequests.find((r) => r.status !== 'pending')
  const empty = <dd data-empty="">{d.notAdded}</dd>

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
          <div>
            <dt>{d.studentId}</dt>
            <dd dir="ltr">
              {profile.universityId}
              {pendingFor('university_id') && <span className={m.pending}>{c.correction.pending(pendingFor('university_id')!.requestedValue)}</span>}
            </dd>
          </div>
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
              <div className={m.field} data-invalid={shown('discipline') || undefined}>
                <label htmlFor={`${id}-discipline`}>{d.discipline}</label>
                <select
                  ref={firstRef}
                  id={`${id}-discipline`}
                  value={draft.discipline}
                  onChange={(e) => setDraft((x) => ({ ...x, discipline: e.target.value }))}
                  aria-invalid={Boolean(shown('discipline'))}
                  aria-describedby={shown('discipline') ? `${id}-discipline-error` : undefined}
                >
                  <option value="">—</option>
                  {DISCIPLINES.map((x) => (
                    <option key={x.id} value={x.id}>
                      {l(x.name)}
                    </option>
                  ))}
                </select>
                {shown('discipline') && (
                  <p id={`${id}-discipline-error`} className={m.problem}>
                    {d.errors.discipline}
                  </p>
                )}
              </div>
              <div className={m.field} data-invalid={shown('academicYear') || undefined}>
                <label htmlFor={`${id}-year`}>{d.year}</label>
                <select
                  id={`${id}-year`}
                  value={draft.academicYear}
                  onChange={(e) => setDraft((x) => ({ ...x, academicYear: e.target.value }))}
                  aria-invalid={Boolean(shown('academicYear'))}
                  aria-describedby={shown('academicYear') ? `${id}-year-error` : undefined}
                >
                  <option value="">—</option>
                  {[1, 2, 3, 4, 5].map((y) => (
                    <option key={y} value={y}>
                      {t.platform.common.yearN(y)}
                    </option>
                  ))}
                </select>
                {shown('academicYear') && (
                  <p id={`${id}-year-error`} className={m.problem}>
                    {d.errors.academicYear}
                  </p>
                )}
              </div>
            </div>
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
                aria-describedby={`${id}-phone-hint${shown('phone') ? ` ${id}-phone-error` : ''}`}
              />
              {shown('phone') && (
                <p id={`${id}-phone-error`} className={m.problem}>
                  {d.errors.phone}
                </p>
              )}
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
                <dt>{d.discipline}</dt>
                {profile.discipline ? <dd>{l(DISCIPLINE_BY_ID[profile.discipline].name)}</dd> : empty}
              </div>
              <div>
                <dt>{d.year}</dt>
                {profile.academicYear ? <dd>{t.platform.common.yearN(profile.academicYear)}</dd> : empty}
              </div>
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
              <option value="university_id">{c.fields.university_id}</option>
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
              placeholder={field === 'full_name' ? profile.name : profile.universityId}
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
