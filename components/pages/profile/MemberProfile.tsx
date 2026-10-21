'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { DisciplineLink } from '@/components/ui/DisciplineLink'
import { IconArrowRight } from '@/components/ui/icons'
import { DISCIPLINE_BY_ID } from '@/content/disciplines'
import { DISCIPLINE_COLOR, SKILLS } from '@/content/platform/taxonomy'
import { isComingSoon } from '@/content/site'
import { fetchMemberProjects, type ProjectRecord } from '@/lib/core-api/member-projects'
import {
  fetchOwnProfile,
  fetchOwnRegistrations,
  profileControls,
  requestCorrection,
  saveOwnProfile,
  sendPhoto,
  type OwnProfile,
  type OwnRegistration,
} from '@/lib/core-api/member-profile'
import { formatMonthYear } from '@/lib/format'
import { memberProfileCopy } from '@/lib/i18n/dictionaries/pages/member-profile'
import type { MemberAuthSettings } from '@/lib/member-auth/client'
import { useMemberAccount } from '@/lib/member-auth/account'
import { routes } from '@/lib/routes'
import { SITE_FEATURES } from '@/lib/site-features'
import { AccountSettings } from './AccountSettings'
import { PhotoControl, type PhotoOutcome } from './PhotoControl'
import { ProfileDetails } from './ProfileDetails'
import p from './Profile.module.css'
import m from './MemberProfile.module.css'

type Loaded = { key: string; loadedAt: number; profile: OwnProfile | null; registrations: OwnRegistration[] | null; projects: ProjectRecord[] | null }

const TZ = 'Asia/Muscat'
const dayFormats = new Map<string, Intl.DateTimeFormat>()
function formatDay(iso: string, intl: string) {
  let f = dayFormats.get(intl)
  if (!f) dayFormats.set(intl, (f = new Intl.DateTimeFormat(intl, { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' })))
  return f.format(new Date(iso))
}
function datePad(iso: string, intl: string) {
  const d = new Date(iso)
  return {
    day: new Intl.DateTimeFormat(intl, { timeZone: TZ, day: 'numeric' }).format(d),
    month: new Intl.DateTimeFormat(intl, { timeZone: TZ, month: 'short' }).format(d),
  }
}
const earliest = (dates: (string | null | undefined)[]) => dates.filter((d): d is string => !!d).sort()[0] ?? null

/**
 * The signed-in member's own profile, on the design of the public profile (ProfileView): the
 * hero, the journey route, the figures at a glance, then what only the member sees and can change.
 * Everything comes from Core with the member's own session (ADR 0023); signing in alone shows
 * nothing, and an applicant sees only where their application stands.
 */
export function MemberProfile({ authSettings, coreBase }: { authSettings: MemberAuthSettings | null; coreBase: string | null }) {
  const { locale } = useI18n()
  const c = memberProfileCopy[locale].profile
  const { account, refresh } = useMemberAccount()
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const memberId = account.status === 'signed-in' && account.kind === 'member' ? account.userId : null
  const key = memberId ? `${memberId}:${attempt}` : null
  const projectsOn = !isComingSoon('projects')

  useEffect(() => {
    if (!key || !authSettings || !coreBase) return
    let cancelled = false
    void (async () => {
      const [profile, registrations, projects] = await Promise.all([
        fetchOwnProfile(authSettings, coreBase),
        fetchOwnRegistrations(authSettings, coreBase),
        projectsOn ? fetchMemberProjects(authSettings, coreBase) : null,
      ])
      if (cancelled) return
      // Approval withdrawn or the session ended elsewhere: let the account store catch up.
      if (!profile.ok && (profile.status === 401 || profile.status === 403)) void refresh()
      setLoaded({
        key,
        loadedAt: Date.now(),
        profile: profile.ok ? profile.data : null,
        registrations: registrations.ok ? registrations.data : null,
        projects: projects?.ok ? projects.data.projects : null,
      })
    })()
    return () => {
      cancelled = true
    }
  }, [key, authSettings, coreBase, projectsOn, refresh])

  const current = loaded && loaded.key === key ? loaded : null
  const ready = current?.profile ? current : null

  // The navbar's "My events" and "Account settings" land here before the sections exist.
  useEffect(() => {
    if (!ready) return
    const target = window.location.hash.slice(1)
    if (target) document.getElementById(target)?.scrollIntoView()
  }, [ready])

  if (account.status === 'signed-out')
    return (
      <Gate title={c.signedOut.title} body={c.signedOut.body}>
        <Link href={`${routes.login}?next=${encodeURIComponent(routes.profile)}`} className="btn btn--primary">
          {c.signedOut.action}
          <IconArrowRight className="btn__arrow" />
        </Link>
        <Link href={routes.register} className="btn btn--secondary">
          {memberProfileCopy[locale].join.register}
        </Link>
      </Gate>
    )
  if (account.status === 'signed-in' && account.kind === 'applicant')
    return (
      <Gate title={c.applicant.title} body={c.applicant.body}>
        <Link href={routes.login} className="btn btn--primary">
          {c.applicant.action}
          <IconArrowRight className="btn__arrow" />
        </Link>
      </Gate>
    )
  if (account.status === 'signed-in' && account.kind === 'none')
    return (
      <Gate title={c.none.title} body={c.none.body}>
        <Link href={routes.register} className="btn btn--primary">
          {c.none.action}
          <IconArrowRight className="btn__arrow" />
        </Link>
      </Gate>
    )
  if (account.status !== 'signed-in' || !memberId || (!current && authSettings && coreBase)) return <Loading label={c.loading} />
  if (!ready || !authSettings || !coreBase)
    return (
      <Gate title={c.unavailable} body="">
        <button type="button" className="btn btn--primary" onClick={() => setAttempt((n) => n + 1)}>
          {c.retry}
        </button>
      </Gate>
    )

  return (
    <OwnProfileView
      key={memberId}
      data={ready as Loaded & { profile: OwnProfile }}
      setProfile={(profile) => setLoaded((x) => x && { ...x, profile })}
      authSettings={authSettings}
      coreBase={coreBase}
      email={account.email}
      photoUrl={account.photoUrl}
      refresh={refresh}
    />
  )
}

function Gate({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  const { locale } = useI18n()
  return (
    <header className={p.hero} style={{ '--key': 'var(--brand-primary)' } as CSSProperties}>
      <div className="container">
        <p className={p.badge}>{memberProfileCopy[locale].profile.you}</p>
        <div className={m.gate}>
          <h1 className={m.gateTitle}>{title}</h1>
          {body && <p className={m.gateBody}>{body}</p>}
          <div className={m.gateActions}>{children}</div>
        </div>
      </div>
    </header>
  )
}

function Loading({ label }: { label: string }) {
  return (
    <header className={p.hero} style={{ '--key': 'var(--brand-primary)' } as CSSProperties} aria-busy="true">
      <div className="container">
        <p className={p.badge}>{label}</p>
        <div className={p.heroGrid}>
          <span className={m.portrait} aria-hidden="true" />
          <div className={p.who} aria-hidden="true">
            <span className={m.skeleton} style={{ width: 'min(22rem, 70vw)', height: '3rem' }} />
            <span className={m.skeleton} style={{ width: 'min(16rem, 50vw)' }} />
            <span className={m.skeleton} style={{ width: 'min(12rem, 40vw)' }} />
          </div>
        </div>
      </div>
    </header>
  )
}

function OwnProfileView({
  data,
  setProfile,
  authSettings,
  coreBase,
  email,
  photoUrl,
  refresh,
}: {
  data: Loaded & { profile: OwnProfile }
  setProfile: (profile: OwnProfile) => void
  authSettings: MemberAuthSettings
  coreBase: string
  email: string
  photoUrl: string | null
  refresh: () => Promise<void>
}) {
  const { t, l, locale, intl } = useI18n()
  const c = memberProfileCopy[locale].profile
  const router = useRouter()
  const { signOut } = useMemberAccount()
  const [editing, setEditing] = useState(false)
  const profile = data.profile
  const registrations = data.registrations ?? []
  const projects = data.projects ?? []
  const projectsOn = !isComingSoon('projects')
  const eventsOn = !isComingSoon('events')
  const { canEdit, canUpload } = profileControls(SITE_FEATURES.profile, profile.features)
  const keyColor = profile.discipline ? DISCIPLINE_COLOR[profile.discipline] : 'var(--brand-primary)'
  const now = data.loadedAt // upcoming and past as of loading, not of each render
  const attended = registrations.filter((r) => r.attended)
  const upcoming = registrations.filter((r) => Date.parse(r.eventDate) >= now).reverse()
  const past = registrations.filter((r) => Date.parse(r.eventDate) < now)
  const memberSince = profile.application?.activatedAt ?? profile.memberSince

  const sendPhotoFile = async (file: File | null): Promise<PhotoOutcome> => {
    const result = await sendPhoto(authSettings, coreBase, file)
    if (!result.ok) return [413, 415, 422].includes(result.status) ? 'invalid' : 'failed'
    setProfile({ ...profile, hasPhoto: Boolean(file) })
    await refresh() // the navbar and this portrait read the new photo from Core
    return file ? 'saved' : 'removed'
  }
  const keepFeatures = (next: OwnProfile) => ({ ...next, features: profile.features })

  const firstEvent = attended.reduce<OwnRegistration | null>((a, r) => (!a || (r.checkedInAt ?? r.eventDate) < (a.checkedInAt ?? a.eventDate) ? r : a), null)
  const firstProjectDate = earliest(projects.map((x) => earliest(x.history.map((h) => h.occurredAt)) ?? x.updatedAt))
  const firstProject = projects.find((x) => (earliest(x.history.map((h) => h.occurredAt)) ?? x.updatedAt) === firstProjectDate) ?? null
  const app = profile.application
  const stations: { id: string; name: string; date: string | null; reached: boolean; label?: string; href?: string }[] = [
    { id: 'applied', name: c.activity.applied, date: app?.submittedAt ?? null, reached: true },
    { id: 'verified', name: c.activity.verified, date: app?.verifiedAt ?? null, reached: true },
    { id: 'approved', name: c.activity.approved, date: app?.decidedAt ?? null, reached: true },
    { id: 'member', name: c.activity.member, date: memberSince, reached: true },
    {
      id: 'event',
      name: c.activity.firstEvent,
      date: firstEvent ? (firstEvent.checkedInAt ?? firstEvent.eventDate) : null,
      reached: Boolean(firstEvent),
      label: firstEvent?.title,
      href: firstEvent && eventsOn ? routes.event(firstEvent.eventId) : undefined,
    },
    ...(projectsOn
      ? [{ id: 'project', name: c.activity.firstProject, date: firstProjectDate, reached: Boolean(firstProject), label: firstProject ? l(firstProject.content.title) : undefined, href: firstProject ? routes.projectSubmit : undefined }]
      : []),
  ]

  return (
    <>
      <header className={p.hero} style={{ '--key': keyColor } as CSSProperties}>
        <div className="container">
          <p className={p.badge}>{c.you}</p>
          <div className={p.heroGrid}>
            <PhotoControl name={profile.name} email={email} photoUrl={profile.hasPhoto ? photoUrl : null} canUpload={canUpload} send={sendPhotoFile} />
            <div className={p.who}>
              <h1 className={`${p.name} intro-item`} dir="auto">
                {profile.name}
              </h1>
              <p className={`${p.headline} intro-item`} style={{ '--i': 1 } as CSSProperties}>
                {memberSince ? c.memberSince(formatMonthYear(memberSince.slice(0, 10), intl)) : null}
                {profile.status === 'graduate' ? ` · ${c.graduate}` : null}
              </p>
              {(profile.discipline || profile.academicYear) && (
                <p className={`${p.facts} intro-item`} style={{ '--i': 2 } as CSSProperties}>
                  <span className={p.key} aria-hidden="true" />
                  {profile.discipline && <DisciplineLink id={profile.discipline}>{l(DISCIPLINE_BY_ID[profile.discipline].name)}</DisciplineLink>}
                  {profile.discipline && profile.academicYear ? ' · ' : null}
                  {profile.academicYear ? t.platform.common.yearN(profile.academicYear) : null}
                </p>
              )}
              {profile.interests.length ? (
                <ul className={p.interests} aria-label={c.details.interests}>
                  {profile.interests.map((s) => (
                    <li key={s} className="chip">
                      {l(SKILLS[s])}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={p.small}>{c.noInterests}</p>
              )}
            </div>
            <div className={p.ownActions}>
              {canEdit && (
                <a
                  href="#details"
                  className="btn btn--primary btn--compact"
                  onClick={() => setEditing(true)}
                >
                  {c.actions.edit}
                </a>
              )}
              <a href="#events" className="btn btn--secondary btn--compact">
                {c.actions.events}
              </a>
              {projectsOn && (
                <a href="#projects" className="btn btn--secondary btn--compact">
                  {c.actions.projects}
                </a>
              )}
              <button
                type="button"
                className="btn btn--quiet btn--compact"
                onClick={async () => {
                  await signOut()
                  router.push(routes.home)
                }}
              >
                {c.actions.signOut}
              </button>
            </div>
          </div>
          <p className={p.privacyNote}>{c.privacy}</p>
        </div>
      </header>

      <section className={p.journey} aria-labelledby="activity-title" style={{ '--key': keyColor } as CSSProperties}>
        <div className="container">
          <h2 id="activity-title" className="section-title">
            {c.activity.title}
          </h2>
          <ol className={`${p.route} ${stations.length < 6 ? m.route5 : ''}`} aria-label={c.activity.label}>
            {stations.map((s, i) => (
              <li key={s.id} className={p.station} data-reached={s.reached || undefined} data-last={i === stations.length - 1 || undefined}>
                <span className={p.trace} data-part="rule" aria-hidden="true" />
                <span className={p.pad} aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className={p.stationText}>
                  <span className={p.stationName}>{s.name}</span>
                  <span className={p.stationDate}>{s.date ? formatDay(s.date, intl) : s.reached ? '' : c.activity.notYet}</span>
                  {s.label &&
                    (s.href ? (
                      <Link href={s.href} className={p.stationLabel} dir="auto">
                        {s.label}
                      </Link>
                    ) : (
                      <span className={p.stationLabel} dir="auto">
                        {s.label}
                      </span>
                    ))}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={p.glance} aria-label={c.activity.title}>
        <div className="container">
          <dl className={p.stats}>
            <div>
              <dt>{c.stats.events}</dt>
              <dd>{attended.length}</dd>
            </div>
            <div>
              <dt>{c.stats.registrations}</dt>
              <dd>{registrations.length}</dd>
            </div>
            {projectsOn && (
              <div>
                <dt>{c.stats.projects}</dt>
                <dd>{projects.length}</dd>
              </div>
            )}
          </dl>
        </div>
      </section>

      <section id="details" className={m.section} aria-labelledby="details-title">
        <div className="container">
          <div className={m.sectionHead}>
            <h2 id="details-title">{c.details.title}</h2>
          </div>
          <ProfileDetails
            profile={profile}
            canEdit={canEdit}
            editing={editing}
            setEditing={setEditing}
            save={async (edit) => {
              const result = await saveOwnProfile(authSettings, coreBase, edit)
              if (result.ok) setProfile(keepFeatures(result.data))
              return result
            }}
            requestChange={async (field, value) => {
              const result = await requestCorrection(authSettings, coreBase, field, value)
              if (result.ok) setProfile(keepFeatures(result.data))
              return result
            }}
          />
        </div>
      </section>

      <section className={m.section} aria-label={`${c.events.title} · ${c.projects.title}`} style={{ '--key': keyColor } as CSSProperties}>
        <div className={`container ${m.blocks}`}>
          <div id="events">
            <div className={m.sectionHead}>
              <h2>{c.events.title}</h2>
              {eventsOn && (
                <Link href={routes.events} className="btn btn--quiet btn--compact">
                  {c.events.browse}
                  <IconArrowRight className="btn__arrow" />
                </Link>
              )}
            </div>
            {data.registrations === null ? (
              <p className={m.problem}>{c.unavailable}</p>
            ) : registrations.length === 0 ? (
              <div className={m.emptyBox}>
                <p>{c.events.empty}</p>
              </div>
            ) : (
              <>
                {upcoming.length > 0 && <EventRows label={c.events.upcoming} rows={upcoming} linked={eventsOn} />}
                {past.length > 0 && <EventRows label={c.events.past} rows={past} linked={eventsOn} />}
              </>
            )}
          </div>
          {projectsOn && (
            <div id="projects">
              <div className={m.sectionHead}>
                <h2>{c.projects.title}</h2>
                <Link href={routes.projectSubmit} className="btn btn--quiet btn--compact">
                  {projects.length ? c.projects.open : c.projects.start}
                  <IconArrowRight className="btn__arrow" />
                </Link>
              </div>
              {data.projects === null ? (
                <p className={m.problem}>{c.unavailable}</p>
              ) : projects.length === 0 ? (
                <div className={m.emptyBox}>
                  <p>{c.projects.empty}</p>
                </div>
              ) : (
                <ul className={m.rows}>
                  {projects.map((x) => {
                    const published = x.publishedRevision !== null
                    const status = published ? 'published' : x.status
                    return (
                      <li key={x.id}>
                        <Link href={published ? `/projects/${x.id}` : routes.projectSubmit} className={m.rowLink}>
                          <span className={m.rowText} style={{ gridColumn: 'span 2' }}>
                            <span className={m.rowTitle} dir="auto">
                              {l(x.content.title) || '—'}
                            </span>
                            <span className={m.rowMeta}>{formatDay(x.updatedAt, intl)}</span>
                          </span>
                          <span className={m.status} data-tone={status === 'published' || status === 'approved' ? 'good' : status === 'rejected' ? 'bad' : status === 'draft' ? undefined : 'wait'}>
                            {c.projects.status[status]}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>

      <section id="settings" className={`${m.section} ${m.settings}`} aria-labelledby="settings-title">
        <div className="container">
          <div className={m.sectionHead}>
            <h2 id="settings-title">{c.settings.title}</h2>
          </div>
          <AccountSettings authSettings={authSettings} signInEmail={profile.signInEmail ?? email} />
        </div>
      </section>
    </>
  )
}

function EventRows({ label, rows, linked }: { label: string; rows: OwnRegistration[]; linked: boolean }) {
  const { locale, intl } = useI18n()
  const c = memberProfileCopy[locale].profile.events
  return (
    <>
      <h3 className={m.groupLabel}>{label}</h3>
      <ul className={m.rows}>
        {rows.map((r) => {
          const pad = datePad(r.eventDate, intl)
          const status = r.attended ? 'attended' : r.status
          const body = (
            <>
              <span className={m.datePad} aria-hidden="true">
                <span>
                  <strong>{pad.day}</strong>
                  <small>{pad.month}</small>
                </span>
              </span>
              <span className={m.rowText}>
                <span className={m.rowTitle} dir="auto">
                  {r.title}
                </span>
                <span className={m.rowMeta}>
                  {formatDay(r.eventDate, intl)}
                  {r.location ? ` · ${r.location}` : ''}
                  {r.checkedInAt ? ` · ${c.checkedIn(formatDay(r.checkedInAt, intl))}` : ''}
                </span>
              </span>
              <span className={m.status} data-tone={status === 'waitlisted' ? 'wait' : 'good'}>
                {c.status[status]}
              </span>
            </>
          )
          return (
            <li key={r.eventId}>
              {linked ? (
                <Link href={routes.event(r.eventId)} className={m.rowLink} data-attended={r.attended || undefined}>
                  {body}
                </Link>
              ) : (
                <div className={m.rowLink} data-attended={r.attended || undefined}>
                  {body}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
