'use client'

import { useI18n } from '@/components/i18n/I18nProvider'
import type { RolePath, TeamName } from '@/lib/core-api/member-roles'
import { memberProfileCopy } from '@/lib/i18n/dictionaries/pages/member-profile'
import m from './MemberProfile.module.css'

/**
 * Pieces shared by the profile's two independent cards, "SQU student verification" and
 * "Committee leadership". Each card loads its own Core endpoint and owns its loading, error and
 * empty states; nothing here fetches.
 */

const TZ = 'Asia/Muscat'
export const day = (iso: string, intl: string) => new Intl.DateTimeFormat(intl, { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))

/** A card's own load: loading, failed (with Core's request reference when it gave one), or ready. */
export type CardLoad<T> = { kind: 'loading' } | { kind: 'failed'; requestId: string | null } | { kind: 'ready'; data: T }

export function CardLoading({ text }: { text: string }) {
  return (
    <p className={m.note} role="status" aria-busy="true">
      {text}
    </p>
  )
}

/**
 * The card could not be loaded. The message is the real outcome, never placeholder data; the
 * reference matches the request id in Core's log line for the failing request.
 */
export function CardFailure({ message, requestId, onRetry }: { message: string; requestId: string | null; onRetry: () => void }) {
  const { locale } = useI18n()
  const r = memberProfileCopy[locale].profile.roles
  return (
    <div className={m.emptyBox} role="alert">
      <p>{message}</p>
      {requestId ? (
        <p className={m.note}>
          {r.reference} <bdi dir="ltr">{requestId.slice(0, 8)}</bdi>
        </p>
      ) : null}
      <button type="button" className="btn btn--secondary btn--compact" onClick={onRetry}>
        {r.retry}
      </button>
    </div>
  )
}

/**
 * The path in the reading direction of the page: "Committee → Position" for committee
 * leadership, "Committee → Team → Position" for team leadership (Core ADR 0026).
 */
export function RolePathText({ path }: { path: RolePath }) {
  const { l, locale } = useI18n()
  const arrow = locale === 'ar' ? '←' : '→'
  const team = (name: TeamName) => (locale === 'ar' && name.ar ? name.ar : name.en)
  return (
    <span className={m.path}>
      <bdi>{path.committee.name}</bdi> <span aria-hidden="true">{arrow}</span>{' '}
      {path.team ? (
        <>
          <bdi>{team(path.team.name)}</bdi> <span aria-hidden="true">{arrow}</span>{' '}
        </>
      ) : null}
      <bdi>{l(path.position.label)}</bdi>
    </span>
  )
}
