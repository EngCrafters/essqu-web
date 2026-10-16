import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CertificateActions } from '@/components/pages/certificates/CertificateActions'
import { CertificateDocument } from '@/components/pages/certificates/CertificateDocument'
import { CERT_TONE } from '@/components/pages/certificates/tone'
import styles from '@/components/pages/certificates/Certificates.module.css'
import { Breadcrumbs } from '@/components/platform/Breadcrumbs'
import { StatusBadge } from '@/components/platform/Platform'
import { getCertificate } from '@/lib/data'
import { formatMonthYear } from '@/lib/format'
import { getI18n } from '@/lib/i18n/server'
import { routes } from '@/lib/routes'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const [{ t, l }, cert] = await Promise.all([getI18n(), getCertificate(id)])
  const c = t.platform.certificatesPage
  return { title: cert ? `${l(cert.event)} · ${c.eyebrow}` : c.metaTitle, robots: { index: false } }
}

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [i18n, cert] = await Promise.all([getI18n(), getCertificate(id)])
  if (!cert) notFound()
  const { t, l, intl } = i18n
  const c = t.platform.certificatesPage

  return (
    <section className={styles.detail} aria-labelledby="cert-title">
      <div className="container">
        <Breadcrumbs trail={[{ href: routes.certificates, label: t.platform.nav.certificates }]} current={l(cert.event)} />
        <div className={styles.detailGrid}>
          <div className={styles.stage}>
            <CertificateDocument cert={cert} memberName={cert.memberName} t={t} l={l} intl={intl} />
          </div>
          <aside className={styles.panel}>
            <h1 id="cert-title" className={styles.panelTitle}>
              {l(cert.event)}
            </h1>
            <div className={styles.verification}>
              <p className={styles.verificationHead}>
                {c.verification}
                <StatusBadge tone={CERT_TONE[cert.status]}>{c.status[cert.status]}</StatusBadge>
              </p>
              <p className={styles.verificationNote}>
                {cert.status === 'valid' ? `${c.statusNote.valid} ${c.verifiedOn}` : cert.status === 'pending' ? c.pendingBody : c.revokedBody}
              </p>
            </div>
            <dl className={styles.facts}>
              <div>
                <dt>{c.awardedTo}</dt>
                <dd>
                  <Link href={routes.member(cert.member)}>{l(cert.memberName)}</Link>
                </dd>
              </div>
              <div>
                <dt>{c.kindFilter}</dt>
                <dd>{c.kind[cert.kind]}</dd>
              </div>
              <div>
                <dt>{c.event}</dt>
                <dd>{cert.eventSlug ? <Link href={routes.event(cert.eventSlug)}>{l(cert.event)}</Link> : l(cert.event)}</dd>
              </div>
              <div>
                <dt>{c.issued}</dt>
                <dd>{formatMonthYear(cert.issued, intl)}</dd>
              </div>
              <div>
                <dt>{c.code}</dt>
                <dd className={styles.fileCode} style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)' }}>
                  {cert.code}
                </dd>
              </div>
            </dl>
            {cert.status === 'valid' && <CertificateActions code={cert.code} />}
            <p className="preview-note">
              <span className="status-dot" aria-hidden="true" />
              <span>
                <strong>{c.prototypeStrong}</strong> {c.prototypeBody}
              </span>
            </p>
          </aside>
        </div>
      </div>
    </section>
  )
}
