import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PlatformHero } from '@/components/platform/Platform'
import { AttendanceConfirmation } from '@/components/pages/events/AttendanceConfirmation'
import { getCoreEvent, getRegistrationBaseUrl } from '@/lib/core-api/events.server'
import { toEventView } from '@/lib/core-api/adapter'
import { getMemberAuthConfig } from '@/lib/member-auth/config.server'
import { getI18n } from '@/lib/i18n/server'
import { eventManagement } from '@/lib/i18n/dictionaries/pages/event-management'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: 'no-referrer' }
export default async function AttendancePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [{ locale }, result] = await Promise.all([getI18n(), getCoreEvent(slug)])
  const c = eventManagement[locale]
  if (result.status === 'not-found') notFound()
  return (
    <>
      <PlatformHero eyebrow="ESSQU" title={c.title} lead={<p>{c.lead}</p>} layout="stack" tone="paper" />
      <section className="container" style={{ paddingBlock: 'var(--space-10)' }}>
        {result.status === 'ok' ? (
          <AttendanceConfirmation event={toEventView(result.event)} authSettings={getMemberAuthConfig()} baseUrl={getRegistrationBaseUrl()} />
        ) : (
          <p role="alert">{c.unavailable}</p>
        )}
      </section>
    </>
  )
}
