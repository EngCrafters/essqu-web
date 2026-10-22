import type { Metadata } from 'next'
import { ResetPasswordForm } from '@/components/pages/account/ResetPasswordForm'
import styles from '@/components/pages/register/Register.module.css'
import { PlatformHero } from '@/components/platform/Platform'
import { getMemberAuthConfig } from '@/lib/member-auth/config.server'
import { getI18n } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  const c = t.platform.accountPage.reset
  return { title: c.metaTitle, description: c.metaDescription, robots: { index: false } }
}

export default async function ResetPasswordPage() {
  const { t } = await getI18n()
  const c = t.platform.accountPage.reset
  return (
    <>
      <PlatformHero eyebrow={c.eyebrow} title={c.title} lead={<p>{c.lead}</p>} layout="stack" tone="paper" />
      <section className={styles.section} aria-label={c.formLabel}>
        <div className="container">
          <ResetPasswordForm authSettings={getMemberAuthConfig()} />
        </div>
      </section>
    </>
  )
}
