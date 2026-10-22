import type { Metadata } from 'next'
import Link from 'next/link'
import { PlatformHero } from '@/components/platform/Platform'
import { ProjectSubmission } from '@/components/pages/projects/ProjectSubmission'
import { ComingSoon } from '@/components/platform/ComingSoon'
import { isComingSoon } from '@/content/site'
import { getRegistrationBaseUrl } from '@/lib/core-api/events.server'
import { getMemberAuthConfig } from '@/lib/member-auth/config.server'
import { getI18n } from '@/lib/i18n/server'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: 'no-referrer' }

export default async function SubmitProjectPage() {
  if (isComingSoon('projects')) return <ComingSoon module="projects" />
  const { l } = await getI18n()
  return (
    <>
      <PlatformHero
        eyebrow={l({ en: 'The Engineering Society · Project workspace', ar: 'الجمعية الهندسية · مساحة المشاريع' })}
        title={l({ en: 'Build something worth sharing.', ar: 'اصنع ما يستحق المشاركة.' })}
        lead={
          <p>
            {l({
              en: 'From the first sketch to a reviewed project. Save your progress, tell your team’s story, and follow every decision in one place.',
              ar: 'من الرسم الأول إلى المشروع المعتمد. احفظ تقدمك، وشارك قصة فريقك، وتابع كل قرار في مكان واحد.',
            })}
          </p>
        }
        layout="stack"
        tone="paper"
        trail={<Link href="/projects">{l({ en: '← Projects', ar: 'المشاريع ←' })}</Link>}
      />
      <ProjectSubmission authSettings={getMemberAuthConfig()} baseUrl={getRegistrationBaseUrl()} />
    </>
  )
}
