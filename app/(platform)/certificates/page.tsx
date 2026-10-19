import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CertificateVault, type VerificationRecord } from '@/components/pages/certificates/CertificateVault'
import styles from '@/components/pages/certificates/Certificates.module.css'
import { SampleNotice } from '@/components/platform/Platform'
import { CERTIFICATES } from '@/content/platform/certificates'
import { getCertificate, getCertificates, getCurrentMember } from '@/lib/data'
import { ComingSoon } from '@/components/platform/ComingSoon'
import { isComingSoon } from '@/content/site'
import { getI18n } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  if (isComingSoon('certificates')) return { title: t.platform.comingSoon.metaTitle(t.platform.comingSoon.modules.certificates.name), description: t.platform.comingSoon.modules.certificates.note }
  return { title: t.platform.certificatesPage.metaTitle, description: t.platform.certificatesPage.metaDescription, robots: { index: false } }
}

export default async function CertificatesPage({ searchParams }: { searchParams: Promise<{ state?: string; verify?: string }> }) {
  // Not open yet: the Coming Soon page stands in, and the full page below stays ready.
  if (isComingSoon('certificates')) return <ComingSoon module="certificates" />
  const { t, l } = await getI18n()
  const c = t.platform.certificatesPage
  const [{ state, verify }, me, mine] = await Promise.all([searchParams, getCurrentMember(), getCertificates()])
  // The public verification index: only what a verification result may show.
  const index = (await Promise.all(CERTIFICATES.map((x) => getCertificate(x.id)))).flatMap((x): VerificationRecord[] =>
    x ? [{ id: x.id, code: x.code, status: x.status, kind: x.kind, event: x.event, issued: x.issued, memberName: x.memberName }] : [],
  )
  const valid = mine.filter((x) => x.status === 'valid').length

  return (
    <>
      <header className={styles.vaultHero}>
        <div className={`container ${styles.vaultHeroGrid}`}>
          <div>
            <p className={`${styles.eyebrow} intro-item`}>{c.eyebrow}</p>
            <h1 className={`${styles.title} intro-item`}>{c.title}</h1>
            <p className={`${styles.lead} intro-item`}>{c.lead}</p>
            <p className={styles.prototype}>
              <span className="status-dot" aria-hidden="true" />
              <span>
                <strong>{c.prototypeStrong}</strong> {c.prototypeBody}
              </span>
            </p>
          </div>
          <div className={`${styles.plate} intro-item`}>
            <svg className={styles.dial} viewBox="0 0 84 84" aria-hidden="true" focusable="false">
              <circle cx="42" cy="42" r="38" />
              <g className={styles.dialFace}>
                <circle cx="42" cy="42" r="26" />
                <path className={styles.dialTicks} d="M42 8v8M42 68v8M8 42h8M68 42h8M18 18l6 6M60 60l6 6M66 18l-6 6M24 60l-6 6" />
                <path d="M42 42L42 22" />
              </g>
            </svg>
            <div className={styles.plateOwner}>
              <span className={styles.plateLabel}>{c.owner}</span>
              <span className={styles.plateName}>{l(me.member.name)}</span>
              <span className={styles.plateCount}>{c.count(valid)}</span>
            </div>
          </div>
        </div>
      </header>
      <section className={styles.vault} aria-label={c.title}>
        <div className="container">
          <Suspense fallback={null}>
            <CertificateVault certificates={mine} memberName={me.member.name} index={index} state={state} initialCode={verify} />
          </Suspense>
          <SampleNotice />
        </div>
      </section>
    </>
  )
}
