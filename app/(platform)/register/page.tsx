import type { Metadata } from 'next'
import { MemberCardFlip } from '@/components/pages/register/MemberCardFlip'
import { RegisterForm } from '@/components/pages/register/RegisterForm'
import styles from '@/components/pages/register/Register.module.css'
import { PlatformHero } from '@/components/platform/Platform'
import { ComingSoon } from '@/components/platform/ComingSoon'
import { isComingSoon } from '@/content/site'
import { getI18n } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  if (isComingSoon('register')) return { title: t.platform.comingSoon.metaTitle(t.platform.comingSoon.modules.register.name), description: t.platform.comingSoon.modules.register.note }
  return { title: t.platform.registerPage.metaTitle, description: t.platform.registerPage.metaDescription }
}

export default async function RegisterPage() {
  const { t } = await getI18n()
  // Not open yet: the member card turns to show it. The form below stays ready.
  if (isComingSoon('register')) {
    const s = t.platform.comingSoon.register
    return <ComingSoon module="register" eyebrow={s.eyebrow} title={s.title} lead={s.lead} visual={<MemberCardFlip />} />
  }
  const c = t.platform.registerPage
  return (
    <>
      <PlatformHero eyebrow={c.eyebrow} title={c.title} lead={<p>{c.lead}</p>} layout="stack" tone="paper">
        <p className="preview-note">
          <span className="status-dot" aria-hidden="true" />
          <span>
            <strong>{c.prototypeStrong}</strong> {c.prototypeBody}
          </span>
        </p>
      </PlatformHero>
      <section className={styles.section} aria-label={c.formLabel}>
        <div className="container">
          <RegisterForm />
        </div>
      </section>
    </>
  )
}
