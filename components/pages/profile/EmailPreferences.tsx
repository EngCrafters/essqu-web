'use client'

import { useEffect, useId, useState } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { fetchEmailPreferences, saveEmailPreferences } from '@/lib/core-api/member-email'
import { memberProfileCopy } from '@/lib/i18n/dictionaries/pages/member-profile'
import type { MemberAuthSettings } from '@/lib/member-auth/client'
import m from './MemberProfile.module.css'

type Load = { kind: 'loading' } | { kind: 'failed' } | { kind: 'ready'; announcements: boolean }

/**
 * "Email announcements": whether the member receives the society's optional announcements from
 * the Email Centre. Core stores the choice; unsubscribe links in those emails change the same
 * setting. Membership is unaffected either way.
 */
export function EmailPreferences({ authSettings, coreBase }: { authSettings: MemberAuthSettings; coreBase: string }) {
  const { locale } = useI18n()
  const c = memberProfileCopy[locale].profile.settings
  const id = useId()
  const [load, setLoad] = useState<Load>({ kind: 'loading' })
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchEmailPreferences(authSettings, coreBase).then((result) => {
      if (cancelled) return
      setLoad(result.ok ? { kind: 'ready', announcements: result.data.announcements } : { kind: 'failed' })
    })
    return () => {
      cancelled = true
    }
  }, [authSettings, coreBase, attempt])

  const change = async (announcements: boolean) => {
    // One save at a time: a click while saving is ignored.
    if (saving) return
    // Shown at once; put back if Core does not save it.
    setLoad({ kind: 'ready', announcements })
    setSaving(true)
    setProblem(false)
    const result = await saveEmailPreferences(authSettings, coreBase, announcements)
    setSaving(false)
    if (result.ok) setLoad({ kind: 'ready', announcements: result.data.announcements })
    else {
      setLoad({ kind: 'ready', announcements: !announcements })
      setProblem(true)
    }
  }

  return (
    <section className={m.card} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className={m.cardTitle}>
        {c.announcementsTitle}
      </h3>
      <p className={m.note}>{c.announcementsBody}</p>
      {load.kind === 'loading' ? (
        <p className={m.note} role="status" aria-busy="true">
          {c.announcementsLoading}
        </p>
      ) : load.kind === 'failed' ? (
        <div role="alert">
          <p className={m.note}>{c.announcementsUnavailable}</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setLoad({ kind: 'loading' })
              setAttempt((n) => n + 1)
            }}
          >
            {c.announcementsRetry}
          </button>
        </div>
      ) : (
        <>
          <label className={m.checkRow}>
            <input
              type="checkbox"
              checked={load.announcements}
              aria-busy={saving}
              onChange={(event) => change(event.target.checked)}
              aria-describedby={`${id}-state`}
            />
            <span>{c.announcementsLabel}</span>
          </label>
          <p id={`${id}-state`} className={m.note} aria-live="polite">
            {saving ? c.announcementsSaving : load.announcements ? c.announcementsOn : c.announcementsOff}
          </p>
          {problem ? (
            <p className={m.note} role="alert">
              {c.announcementsFailed}
            </p>
          ) : null}
        </>
      )}
    </section>
  )
}
