import type { CSSProperties } from 'react'
import type { Certificate } from '@/content/platform/certificates'
import type { Dictionary, Localized } from '@/lib/i18n'
import { formatMonthYear } from '@/lib/format'
import styles from './Certificates.module.css'

/**
 * A prototype certificate. Deliberately not a facsimile of anything official: no university
 * crest or wordmark, no signatures, a generic seal, and a repeated PROTOTYPE watermark plus a
 * banner across the top, so a screenshot can never pass for a real document.
 */
export function CertificateDocument({
  cert,
  memberName,
  t,
  l,
  intl,
  size = 'full',
}: {
  cert: Certificate
  memberName: Localized
  t: Dictionary
  l: <T>(v: Localized<T>) => T
  intl: string
  size?: 'full' | 'thumb'
}) {
  const c = t.platform.certificatesPage
  return (
    <div className={styles.doc} data-size={size} data-status={cert.status}>
      <div className={styles.docBanner} aria-hidden={size === 'thumb' || undefined}>
        {c.watermark}
      </div>
      <div className={styles.docWatermark} aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} style={{ '--row': i } as CSSProperties}>
            {c.watermark} · {c.watermark}
          </span>
        ))}
      </div>
      <div className={styles.docFrame}>
        <span className={styles.docCorner} data-at="ts" aria-hidden="true" />
        <span className={styles.docCorner} data-at="te" aria-hidden="true" />
        <span className={styles.docCorner} data-at="bs" aria-hidden="true" />
        <span className={styles.docCorner} data-at="be" aria-hidden="true" />
        <p className={styles.docIssuer}>{c.presentedBy}</p>
        <p className={styles.docKind}>{c.kind[cert.kind]}</p>
        <p className={styles.docLabel}>{c.awardedTo}</p>
        <p className={styles.docName}>{l(memberName)}</p>
        <p className={styles.docLabel}>{c.event}</p>
        <p className={styles.docEvent}>{l(cert.event)}</p>
        <div className={styles.docFoot}>
          <span>
            <span className={styles.docFootLabel}>{c.eventDate}</span>
            {formatMonthYear(cert.eventDate, intl)}
          </span>
          <svg className={styles.docSeal} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
            <circle cx="32" cy="32" r="28" />
            <circle cx="32" cy="32" r="21" />
            <path d="M32 18l4 9 10 1-7.5 6.5 2.3 9.5L32 39l-8.8 5 2.3-9.5L18 28l10-1z" />
          </svg>
          <span>
            <span className={styles.docFootLabel}>{c.code}</span>
            <span className={styles.docCode}>{cert.code}</span>
          </span>
        </div>
      </div>
      {cert.status !== 'valid' && (
        <span className={styles.docStamp} aria-hidden={size === 'thumb' || undefined}>
          {c.status[cert.status]}
        </span>
      )}
    </div>
  )
}
