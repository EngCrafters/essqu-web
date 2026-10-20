import type { Metadata } from 'next'
import { LoginView } from '@/components/pages/account/LoginView'
import styles from '@/components/pages/register/Register.module.css'
import { PlatformHero } from '@/components/platform/Platform'
import { getRegistrationBaseUrl } from '@/lib/core-api/events.server'
import { getMemberAuthConfig } from '@/lib/member-auth/config.server'
import { getI18n } from '@/lib/i18n/server'
import { safeEventReturn } from '@/lib/member-auth/return-path'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  const c = t.platform.accountPage.login
  return { title: c.metaTitle, description: c.metaDescription, robots: { index: false } }
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const returnTo = safeEventReturn((await searchParams).next)
  const { t } = await getI18n()
  const c = t.platform.accountPage.login
  return (
    <>
      <PlatformHero eyebrow={c.eyebrow} title={c.title} lead={<p>{c.lead}</p>} layout="stack" tone="paper" />
      <section className={styles.section} aria-label={c.formLabel}>
        <div className="container">
          {/* Supabase Auth checks the password; Core's public API says what the signed-in person is. */}
          <LoginView authSettings={getMemberAuthConfig()} coreBaseUrl={getRegistrationBaseUrl()} returnTo={returnTo} />
        </div>
      </section>
    </>
  )
}
