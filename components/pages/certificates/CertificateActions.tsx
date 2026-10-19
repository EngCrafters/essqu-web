'use client'

import { useState } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import styles from './Certificates.module.css'

/** Mock download and a real "copy verification link". Nothing is generated or uploaded. */
export function CertificateActions({ code }: { code: string }) {
  const { t } = useI18n()
  const c = t.platform.certificatesPage
  const [note, setNote] = useState<string | null>(null)
  const flash = (text: string) => {
    setNote(text)
    window.setTimeout(() => setNote((n) => (n === text ? null : n)), 2600)
  }
  return (
    <div className={styles.actions}>
      <button type="button" className="btn btn--primary" onClick={() => flash(c.downloadNote)}>
        {c.download}
      </button>
      <button
        type="button"
        className="btn btn--secondary"
        onClick={async () => {
          const url = `${window.location.origin}/certificates?verify=${encodeURIComponent(code)}`
          try {
            await navigator.clipboard.writeText(url)
            flash(c.copied)
          } catch {
            flash(url)
          }
        }}
      >
        {c.share}
      </button>
      <p className={styles.actionNote} role="status" aria-live="polite">
        {note}
      </p>
    </div>
  )
}
