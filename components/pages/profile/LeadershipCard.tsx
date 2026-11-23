'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  fetchLeadershipOptions,
  fetchOwnLeadership,
  requestLeadership,
  teamStillOffered,
  type LeadershipLevel,
  type LeadershipOptions,
  type OwnLeadership,
  type TeamName,
} from '@/lib/core-api/member-roles'
import { memberProfileCopy } from '@/lib/i18n/dictionaries/pages/member-profile'
import type { MemberAuthSettings } from '@/lib/member-auth/client'
import { CardFailure, CardLoading, RolePathText, day, type CardLoad } from './RoleCardParts'
import m from './MemberProfile.module.css'

/** Codes meaning the committee/team structure changed under the member: offer it again. */
const STRUCTURE_CHANGED = ['HIERARCHY_MISMATCH', 'TEAM_INACTIVE', 'COMMITTEE_ARCHIVED', 'NOT_FOUND']

/**
 * "Committee leadership" (Core ADRs 0025 and 0026), on its own: it loads `GET /me/leadership` and
 * nothing else, so a problem with SQU verification never hides it, and the other way round. A
 * member requests Chief or Assistant Chief of a committee itself, or of one of its teams when the
 * committee has active teams. Appointments and requests show the reviewers' decisions with the
 * reason they gave. An approved position gives dashboard access only through the permissions
 * assigned to its committee or team (Core ADR 0027); the card shows which positions do. When the
 * administrators close requests, the card says so and keeps showing positions and requests.
 */
export function LeadershipCard({ authSettings, coreBase }: { authSettings: MemberAuthSettings; coreBase: string }) {
  const { locale, intl } = useI18n()
  const c = memberProfileCopy[locale].profile.roles.leadership
  const id = useId()
  const [load, setLoad] = useState<CardLoad<OwnLeadership>>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    void fetchOwnLeadership(authSettings, coreBase).then((result) => {
      if (!cancelled) setLoad(result.ok ? { kind: 'ready', data: result.data } : { kind: 'failed', requestId: result.requestId ?? null })
    })
    return () => {
      cancelled = true
    }
  }, [authSettings, coreBase, attempt])

  return (
    <section id="leadership" className={m.card} aria-labelledby={`${id}-title`} aria-busy={load.kind === 'loading'}>
      <div className={m.cardHead}>
        <h2 id={`${id}-title`} className={m.cardTitle}>
          {c.title}
        </h2>
      </div>
      <p className={m.note}>{c.intro}</p>
      {load.kind === 'loading' ? (
        <CardLoading text={c.loading} />
      ) : load.kind === 'failed' ? (
        <CardFailure
          message={c.unavailable}
          requestId={load.requestId}
          onRetry={() => {
            setLoad({ kind: 'loading' })
            setAttempt((n) => n + 1)
          }}
        />
      ) : (
        <LeadershipDetails roles={load.data} authSettings={authSettings} coreBase={coreBase} intl={intl} onChange={(data) => setLoad({ kind: 'ready', data })} />
      )}
    </section>
  )
}

function LeadershipDetails({
  roles,
  authSettings,
  coreBase,
  intl,
  onChange,
}: {
  roles: OwnLeadership
  authSettings: MemberAuthSettings
  coreBase: string
  intl: string
  onChange: (roles: OwnLeadership) => void
}) {
  const { l, locale } = useI18n()
  const c = memberProfileCopy[locale].profile.roles.leadership
  const id = useId()
  const firstRef = useRef<HTMLSelectElement>(null)
  const inFlight = useRef(false)
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<LeadershipOptions | null | 'failed'>(null)
  const [optionsAttempt, setOptionsAttempt] = useState(0)
  const [committee, setCommittee] = useState('')
  const [level, setLevel] = useState<LeadershipLevel | ''>('')
  const [team, setTeam] = useState('')
  const [position, setPosition] = useState('')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const limited = roles.limits.recentRequests >= roles.limits.requestsPer30Days

  useEffect(() => {
    if (!open || options) return
    let cancelled = false
    void fetchLeadershipOptions(authSettings, coreBase).then((result) => {
      if (!cancelled) setOptions(result.ok ? result.data : 'failed')
    })
    return () => {
      cancelled = true
    }
  }, [open, options, optionsAttempt, authSettings, coreBase])
  useEffect(() => {
    if (open && options && options !== 'failed' && options.requestsOpen) firstRef.current?.focus()
  }, [open, options])

  const loaded = options && options !== 'failed' ? options : null
  // Only what the current options still offer counts as chosen. A committee with no active teams
  // offers committee leadership only; a team counts only for team leadership in its committee.
  const chosenCommittee = loaded?.committees.some((x) => x.id === committee) ? committee : ''
  const teams = loaded?.committees.find((x) => x.id === chosenCommittee)?.teams ?? []
  const chosenLevel: LeadershipLevel | '' = !chosenCommittee ? '' : teams.length === 0 ? 'committee' : level
  const chosenTeam = chosenLevel === 'team' && teamStillOffered(loaded, chosenCommittee, team) ? team : ''
  const teamDropped = Boolean(loaded && chosenLevel === 'team' && team && !chosenTeam)
  const problems = {
    committee: !chosenCommittee,
    level: Boolean(chosenCommittee) && !chosenLevel,
    team: chosenLevel === 'team' && !chosenTeam,
    position: !position,
  }
  const teamLabel = (name: TeamName) => (locale === 'ar' && name.ar ? name.ar : name.en)
  const active = roles.appointments.filter((a) => a.active)
  const ended = roles.appointments.filter((a) => !a.active)
  const empty = roles.appointments.length === 0 && roles.requests.length === 0
  const requestsOpen = roles.requestsOpen && (!loaded || loaded.requestsOpen)

  const close = () => {
    setOpen(false)
    setCommittee('')
    setLevel('')
    setTeam('')
    setPosition('')
    setTouched(false)
    setProblem(null)
  }
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (inFlight.current) return
    setTouched(true)
    setProblem(null)
    if (problems.committee || problems.level || problems.team || problems.position) return
    inFlight.current = true
    setBusy(true)
    const outcome = await requestLeadership(authSettings, coreBase, {
      committeeId: chosenCommittee,
      teamId: chosenLevel === 'team' ? chosenTeam : null,
      position,
    })
    inFlight.current = false
    setBusy(false)
    if (outcome.ok) {
      close()
      setSent(true)
      onChange(outcome.data)
      return
    }
    const known = c.errors as Record<string, string>
    setProblem(known[outcome.code] ?? c.errors.failed)
    // Requests were closed meanwhile, or the structure changed: load the current state again.
    if (outcome.code === 'REQUESTS_CLOSED') onChange({ ...roles, requestsOpen: false })
    if (STRUCTURE_CHANGED.includes(outcome.code)) {
      setTeam('')
      setOptions(null)
    }
  }

  return (
    <>
      <p className={m.note}>
        {c.dashboard}: {roles.dashboardAccess ? c.dashboardYes : c.dashboardNo}. {c.dashboardNote}
      </p>

      {empty ? (
        <p>{c.empty}</p>
      ) : (
        <div className={m.field}>
          <h3 className={m.groupLabel}>{c.positions}</h3>
          {active.length === 0 ? (
            <p className={m.note}>{c.none}</p>
          ) : (
            <ul className={m.rows}>
              {active.map((a) => (
                <li key={a.id} className={m.roleRow}>
                  <RolePathText path={a} />
                  <span className={m.note}>
                    {c.since(day(a.appointedAt, intl))} · {a.grantsAccess ? c.grantsAccess : c.noAccess}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {ended.length > 0 ? (
            <ul className={m.rows}>
              {ended.map((a) => (
                <li key={a.id} className={m.roleRow} data-ended="">
                  <RolePathText path={a} />
                  <span className={m.note}>
                    {a.endedAt ? c.ended(day(a.endedAt, intl)) : null}
                    {a.endReason ? (
                      <>
                        {' · '}
                        {c.reason} <span dir="auto">{a.endReason}</span>
                      </>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      {roles.requests.length > 0 ? (
        <div className={m.field}>
          <h3 className={m.groupLabel}>{c.requests}</h3>
          <ul className={m.rows}>
            {roles.requests.map((q) => (
              <li key={q.id} className={m.roleRow}>
                <span className={m.roleHead}>
                  <RolePathText path={q} />
                  <span className={m.status} data-tone={q.status === 'approved' ? 'good' : q.status === 'pending' ? 'wait' : q.status === 'rejected' ? 'bad' : undefined}>
                    {c.status[q.status]}
                  </span>
                </span>
                <span className={m.note}>{c.submitted(day(q.submittedAt, intl))}</span>
                {q.rejectionReason ? (
                  <span className={m.note}>
                    {c.reason} <span dir="auto">{q.rejectionReason}</span>
                  </span>
                ) : null}
                {q.cancellationReason ? <span className={m.note}>{c.cancelled[q.cancellationReason]}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {sent ? (
        <p className={`preview-note ${m.saved}`} role="status">
          <span className="status-dot" aria-hidden="true" />
          <span>{c.sent}</span>
        </p>
      ) : null}

      {!requestsOpen ? (
        <p className="preview-note" role="status">
          <span className="status-dot" aria-hidden="true" />
          <span>{c.closed}</span>
        </p>
      ) : open ? (
        <form className={m.form} onSubmit={onSubmit} noValidate aria-busy={busy}>
          {options === null ? (
            <CardLoading text={c.loadingOptions} />
          ) : options === 'failed' ? (
            <div className={m.emptyBox} role="alert">
              <p>{c.optionsUnavailable}</p>
              <button
                type="button"
                className="btn btn--secondary btn--compact"
                onClick={() => {
                  setOptions(null)
                  setOptionsAttempt((n) => n + 1)
                }}
              >
                {memberProfileCopy[locale].profile.roles.retry}
              </button>
            </div>
          ) : options.committees.length === 0 || options.positions.length === 0 ? (
            <p className={m.note}>{c.noOptions}</p>
          ) : (
            <>
              <div className={m.field} data-invalid={(touched && problems.committee) || undefined}>
                <label htmlFor={`${id}-committee`}>{c.committee}</label>
                <select
                  ref={firstRef}
                  id={`${id}-committee`}
                  value={chosenCommittee}
                  onChange={(e) => {
                    // Another committee: the level and team chosen for the previous one start again.
                    setCommittee(e.target.value)
                    setLevel('')
                    setTeam('')
                    setProblem(null)
                  }}
                  aria-invalid={Boolean(touched && problems.committee)}
                  aria-describedby={touched && problems.committee ? `${id}-committee-error` : undefined}
                >
                  <option value="">{c.committeePlaceholder}</option>
                  {options.committees.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
                {touched && problems.committee ? (
                  <p id={`${id}-committee-error`} className={m.problem}>
                    {c.errors.committee}
                  </p>
                ) : null}
              </div>

              {chosenCommittee ? (
                teams.length === 0 ? (
                  <p className={m.note} role="status">
                    {c.noTeams}
                  </p>
                ) : (
                  <fieldset className={m.field} data-invalid={(touched && problems.level) || undefined}>
                    <legend>{c.level}</legend>
                    <div className={m.chips}>
                      {(['committee', 'team'] as const).map((value) => (
                        <label key={value} className={m.pick}>
                          <input
                            type="radio"
                            name={`${id}-level`}
                            value={value}
                            checked={chosenLevel === value}
                            onChange={() => {
                              // Another level: a team chosen for team leadership starts again.
                              setLevel(value)
                              setTeam('')
                              setProblem(null)
                            }}
                          />
                          <span>{value === 'committee' ? c.levelCommittee : c.levelTeam}</span>
                        </label>
                      ))}
                    </div>
                    {chosenLevel ? <p className={m.hint}>{chosenLevel === 'committee' ? c.levelCommitteeHint : c.levelTeamHint}</p> : null}
                    {touched && problems.level ? <p className={m.problem}>{c.errors.level}</p> : null}
                  </fieldset>
                )
              ) : null}

              {chosenLevel === 'team' ? (
                <div className={m.field} data-invalid={(touched && problems.team) || undefined}>
                  <label htmlFor={`${id}-team`}>{c.team}</label>
                  <select
                    id={`${id}-team`}
                    value={chosenTeam}
                    onChange={(e) => {
                      setTeam(e.target.value)
                      setProblem(null)
                    }}
                    aria-invalid={Boolean(touched && problems.team)}
                    aria-describedby={touched && problems.team ? `${id}-team-error` : undefined}
                  >
                    <option value="">{c.teamPlaceholder}</option>
                    {teams.map((x) => (
                      <option key={x.id} value={x.id}>
                        {teamLabel(x.name)}
                      </option>
                    ))}
                  </select>
                  {touched && problems.team ? (
                    <p id={`${id}-team-error`} className={m.problem}>
                      {c.errors.team}
                    </p>
                  ) : teamDropped ? (
                    <p className={m.note} role="status">
                      {c.teamGone}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <fieldset className={m.field} data-invalid={(touched && problems.position) || undefined}>
                <legend>{c.position}</legend>
                <div className={m.chips}>
                  {options.positions.map((p) => (
                    <label key={p.id} className={m.pick}>
                      <input type="radio" name={`${id}-position`} value={p.id} checked={position === p.id} onChange={() => setPosition(p.id)} />
                      <span>{l(p.label)}</span>
                    </label>
                  ))}
                </div>
                {touched && problems.position ? <p className={m.problem}>{c.errors.position}</p> : null}
              </fieldset>
              <p className={m.note}>
                {c.note} {c.oneEach} {c.limit(roles.limits.requestsPer30Days)}
              </p>
            </>
          )}
          <div className={m.actions}>
            {loaded && loaded.committees.length > 0 ? (
              <button type="submit" className="btn btn--primary btn--compact" disabled={busy}>
                {busy ? c.sending : c.submit}
              </button>
            ) : null}
            <button type="button" className="btn btn--secondary btn--compact" onClick={close} disabled={busy}>
              {c.cancel}
            </button>
          </div>
          {problem ? (
            <p className={m.problem} role="alert">
              {problem}
            </p>
          ) : null}
        </form>
      ) : (
        <div className={m.actions}>
          <button
            type="button"
            className="btn btn--primary btn--compact"
            disabled={limited}
            onClick={() => {
              setSent(false)
              setOpen(true)
            }}
          >
            {c.request}
          </button>
          {limited ? <p className={m.note}>{c.errors.RATE_LIMITED}</p> : null}
        </div>
      )}
    </>
  )
}
