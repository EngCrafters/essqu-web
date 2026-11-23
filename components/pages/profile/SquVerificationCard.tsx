'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { DOCUMENT_ACCEPT, prepareDocument, type PreparedDocument } from '@/lib/core-api/membership'
import { STUDENT_NUMBER, fetchOwnSqu, submitSquEvidence, type SquState } from '@/lib/core-api/member-roles'
import { memberProfileCopy } from '@/lib/i18n/dictionaries/pages/member-profile'
import type { MemberAuthSettings } from '@/lib/member-auth/client'
import { CardFailure, CardLoading, day, type CardLoad } from './RoleCardParts'
import m from './MemberProfile.module.css'

const formatSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`)

/** The SQU status chip, also used by the profile header's "SQU Verified" stamp wording. */
export function SquStatusChip({ status }: { status: SquState['status'] }) {
  const { locale } = useI18n()
  const label = memberProfileCopy[locale].profile.roles.status[status]
  const tone = status === 'verified' ? 'good' : status === 'pending' ? 'wait' : status === 'not_verified' ? undefined : 'bad'
  return (
    <span className={m.status} data-tone={tone}>
      {label}
    </span>
  )
}

/**
 * "SQU student verification" (Core ADR 0025), on its own: it loads `GET /me/verification` and
 * nothing else, so a problem with committee leadership never hides it, and the other way round.
 * Optional; it changes nothing about membership. Reviewers' decisions appear here with the reason
 * they gave; the full student number and any reviewer note never reach this page.
 */
export function SquVerificationCard({ authSettings, coreBase }: { authSettings: MemberAuthSettings; coreBase: string }) {
  const { locale, intl } = useI18n()
  const s = memberProfileCopy[locale].profile.roles.squ
  const id = useId()
  const [load, setLoad] = useState<CardLoad<SquState>>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    void fetchOwnSqu(authSettings, coreBase).then((result) => {
      if (!cancelled) setLoad(result.ok ? { kind: 'ready', data: result.data } : { kind: 'failed', requestId: result.requestId ?? null })
    })
    return () => {
      cancelled = true
    }
  }, [authSettings, coreBase, attempt])

  const squ = load.kind === 'ready' ? load.data : null
  return (
    <section id="squ-verification" className={m.card} data-verified={squ?.status === 'verified' || undefined} aria-labelledby={`${id}-title`} aria-busy={load.kind === 'loading'}>
      <div className={m.cardHead}>
        <h2 id={`${id}-title`} className={m.cardTitle}>
          {s.title}
        </h2>
        {squ ? <SquStatusChip status={squ.status} /> : null}
      </div>
      <p className={m.note}>{s.intro}</p>
      {load.kind === 'loading' ? (
        <CardLoading text={s.loading} />
      ) : load.kind === 'failed' ? (
        <CardFailure
          message={s.unavailable}
          requestId={load.requestId}
          onRetry={() => {
            setLoad({ kind: 'loading' })
            setAttempt((n) => n + 1)
          }}
        />
      ) : (
        <SquDetails squ={load.data} authSettings={authSettings} coreBase={coreBase} intl={intl} onChange={(data) => setLoad({ kind: 'ready', data })} />
      )}
    </section>
  )
}

function SquDetails({
  squ,
  authSettings,
  coreBase,
  intl,
  onChange,
}: {
  squ: SquState
  authSettings: MemberAuthSettings
  coreBase: string
  intl: string
  onChange: (squ: SquState) => void
}) {
  const { locale } = useI18n()
  const s = memberProfileCopy[locale].profile.roles.squ
  const id = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const inFlight = useRef(false)
  const [number, setNumber] = useState('')
  const [card, setCard] = useState<{ name: string; size: number; prepared: PreparedDocument | null } | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const numberProblem = STUDENT_NUMBER.test(number.trim()) ? null : s.errors.number
  const cardProblem = !card?.prepared
    ? preparing
      ? null
      : s.errors.cardRequired
    : card.prepared.ok
      ? null
      : { required: s.errors.cardRequired, 'unsupported-type': s.errors.cardType, 'too-large': s.errors.cardTooLarge, unreadable: s.errors.cardUnreadable }[card.prepared.problem]

  const choose = async (file: File | undefined) => {
    setProblem(null)
    if (!file) return
    setPreparing(true)
    setCard({ name: file.name, size: file.size, prepared: null })
    const prepared = await prepareDocument(file)
    setPreparing(false)
    setCard({ name: file.name, size: prepared.ok ? prepared.blob.size : file.size, prepared })
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (inFlight.current || preparing) return
    setTouched(true)
    setProblem(null)
    if (numberProblem || cardProblem || !card?.prepared?.ok) return
    inFlight.current = true
    setBusy(true)
    const outcome = await submitSquEvidence(authSettings, coreBase, number, card.prepared)
    inFlight.current = false
    setBusy(false)
    if (outcome.ok) {
      setSent(true)
      setNumber('')
      setCard(null)
      setTouched(false)
      onChange(outcome.data)
      return
    }
    // A failure saved nothing (Core writes the request only after the file is stored), so the
    // member keeps what they entered and can send it again.
    const known: Record<string, string> = {
      ALREADY_PENDING: s.errors.ALREADY_PENDING,
      ALREADY_VERIFIED: s.errors.ALREADY_VERIFIED,
      RATE_LIMITED: s.errors.RATE_LIMITED,
      'too-large': s.errors.cardTooLarge,
      'unsupported-type': s.errors.cardType,
      invalid: s.errors.number,
    }
    setProblem(known[outcome.code] ?? (outcome.status === 413 ? s.errors.cardTooLarge : s.errors.failed))
  }

  return (
    <>
      {squ.status === 'not_verified' && !squ.submittedAt ? <p>{s.notStarted}</p> : null}
      {squ.status === 'pending' && squ.submittedAt ? <p>{s.pending(day(squ.submittedAt, intl))}</p> : null}
      {squ.status === 'verified' && squ.verifiedAt ? (
        <p>
          {s.verified(day(squ.verifiedAt, intl))}
          {squ.studentNumber ? (
            <span className={m.note} dir="ltr">
              {' '}
              {squ.studentNumber}
            </span>
          ) : null}
        </p>
      ) : null}
      {squ.status === 'rejected' ? (
        <p className={m.problem} role="status">
          {s.rejected} <span dir="auto">{squ.rejectionReason}</span>
        </p>
      ) : null}
      {squ.status === 'revoked' && squ.revokedAt ? (
        <p className={m.problem} role="status">
          {s.revoked(day(squ.revokedAt, intl))} <span dir="auto">{squ.revocationReason}</span>
        </p>
      ) : null}
      {sent ? (
        <p className={`preview-note ${m.saved}`} role="status">
          <span className="status-dot" aria-hidden="true" />
          <span>{s.sent}</span>
        </p>
      ) : null}
      {!squ.canSubmit && squ.nextSubmissionAt && squ.status !== 'verified' && squ.status !== 'pending' ? <p className={m.note}>{s.limit(day(squ.nextSubmissionAt, intl))}</p> : null}
      {squ.canSubmit ? (
        <form className={m.form} onSubmit={onSubmit} noValidate aria-busy={busy}>
          {squ.status === 'rejected' || squ.status === 'revoked' ? <p className={m.note}>{s.again}</p> : null}
          <div className={m.field} data-invalid={(touched && numberProblem) || undefined}>
            <label htmlFor={`${id}-number`}>{s.number}</label>
            <p id={`${id}-number-hint`} className={m.hint}>
              {s.numberHint}
            </p>
            <input
              id={`${id}-number`}
              inputMode="numeric"
              autoComplete="off"
              dir="ltr"
              maxLength={10}
              value={number}
              onChange={(e) => {
                setNumber(e.target.value.replace(/\s/g, ''))
                setProblem(null)
              }}
              aria-invalid={Boolean(touched && numberProblem)}
              aria-describedby={`${id}-number-hint${touched && numberProblem ? ` ${id}-number-error` : ''}`}
            />
            {touched && numberProblem ? (
              <p id={`${id}-number-error`} className={m.problem}>
                {numberProblem}
              </p>
            ) : null}
          </div>
          <div className={m.field} data-invalid={(touched && cardProblem) || undefined}>
            <span id={`${id}-card`} className={m.fieldLabel}>
              {s.card}
            </span>
            <p id={`${id}-card-hint`} className={m.hint}>
              {s.cardHint} {s.privacy}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept={DOCUMENT_ACCEPT}
              className={m.fileInput}
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                void choose(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <div className={m.upload}>
              <button
                type="button"
                className="btn btn--secondary btn--compact"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                aria-labelledby={`${id}-card ${id}-pick`}
                aria-describedby={`${id}-card-hint${touched && cardProblem ? ` ${id}-card-error` : ''}`}
              >
                <span id={`${id}-pick`}>{card ? s.replace : s.choose}</span>
              </button>
              <span className={m.fileName} dir="auto" aria-live="polite">
                {preparing ? s.preparing : card ? `${card.name}${card.prepared?.ok ? ` · ${s.ready(formatSize(card.size))}` : ''}` : s.noFile}
              </span>
              {card && !busy ? (
                <button type="button" className="btn btn--quiet btn--compact" onClick={() => setCard(null)}>
                  {s.remove}
                </button>
              ) : null}
            </div>
            {touched && cardProblem ? (
              <p id={`${id}-card-error`} className={m.problem}>
                {cardProblem}
              </p>
            ) : null}
          </div>
          <div className={m.actions}>
            <button type="submit" className="btn btn--primary btn--compact" disabled={busy || preparing}>
              {busy ? s.sending : s.submit}
            </button>
          </div>
          {problem ? (
            <p className={m.problem} role="alert">
              {problem}
            </p>
          ) : null}
        </form>
      ) : null}
    </>
  )
}
