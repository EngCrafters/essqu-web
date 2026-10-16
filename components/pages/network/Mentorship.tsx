'use client'

import { useState } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { useDemoSession } from '@/components/platform/DemoSession'
import { Modal, StatusBadge } from '@/components/platform/Platform'
import type { Graduate } from '@/content/platform/graduates'
import styles from './Network.module.css'

/**
 * A mentorship request, request → sent → accepted, kept in this tab's demo session so the same
 * state shows on the network's card and on the graduate's own profile.
 */
export function MentorshipStatus({ graduate, onAsk }: { graduate: Graduate; onAsk: () => void }) {
  const { t } = useI18n()
  const c = t.platform.networkPage
  const session = useDemoSession()
  const req = session.mentorship[graduate.id]
  if (req === 'accepted') {
    return (
      <div className={styles.reqState} role="status">
        <StatusBadge tone="positive">{c.accepted}</StatusBadge>
        <p className={styles.reqNote}>{c.acceptedNote}</p>
      </div>
    )
  }
  if (req === 'pending') {
    return (
      <div className={styles.reqState} role="status">
        <StatusBadge tone="waiting">{c.requested}</StatusBadge>
        <p className={styles.reqNote}>{c.pendingNote}</p>
        <button type="button" className={styles.quiet} onClick={() => session.withdrawMentorship(graduate.id)}>
          {c.withdraw}
        </button>
      </div>
    )
  }
  if (graduate.mentorship === 'closed') return <p className={styles.reqNote}>{c.closedNote}</p>
  return (
    <button type="button" className="btn btn--primary btn--compact" onClick={onAsk}>
      {c.request}
    </button>
  )
}

/** The request form: a topic and an optional note, neither sent anywhere. */
export function MentorshipDialog({ graduate, onClose }: { graduate: Graduate | null; onClose: () => void }) {
  const { t, l } = useI18n()
  const c = t.platform.networkPage
  const session = useDemoSession()
  const [topic, setTopic] = useState<keyof typeof c.topics>('career')
  return (
    <Modal
      open={Boolean(graduate)}
      onClose={onClose}
      title={graduate ? c.modalTitle(l(graduate.name)) : ''}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            {t.platform.common.cancel}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              if (graduate) session.requestMentorship(graduate.id, graduate.mentorship === 'open')
              onClose()
            }}
          >
            {c.send}
          </button>
        </>
      }
    >
      <fieldset className={styles.topics}>
        <legend>{c.topic}</legend>
        {(Object.keys(c.topics) as (keyof typeof c.topics)[]).map((k) => (
          <label key={k} className={styles.topic}>
            <input type="radio" name="topic" value={k} checked={topic === k} onChange={() => setTopic(k)} />
            <span>{c.topics[k]}</span>
          </label>
        ))}
      </fieldset>
      <label className={styles.note}>
        <span>{c.message}</span>
        <textarea rows={3} />
        <span className={styles.reqNote}>{c.messageHint}</span>
      </label>
      <p className="preview-note">
        <span className="status-dot" aria-hidden="true" />
        <span>{c.prototype}</span>
      </p>
    </Modal>
  )
}

/** On a graduate's profile: availability, the request state and its dialog together. */
export function MentorshipPanel({ graduate }: { graduate: Graduate }) {
  const { t } = useI18n()
  const c = t.platform.networkPage
  const [asking, setAsking] = useState(false)
  return (
    <div className={styles.mentorPanel}>
      <StatusBadge tone={graduate.mentorship === 'open' ? 'open' : graduate.mentorship === 'limited' ? 'waiting' : 'neutral'}>
        {c.availability[graduate.mentorship]}
      </StatusBadge>
      <MentorshipStatus graduate={graduate} onAsk={() => setAsking(true)} />
      <MentorshipDialog graduate={asking ? graduate : null} onClose={() => setAsking(false)} />
    </div>
  )
}
