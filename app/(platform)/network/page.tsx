import type { Metadata } from 'next'
import { Suspense } from 'react'
import { GraduateNetwork } from '@/components/pages/network/GraduateNetwork'
import { PlatformHero, SampleNotice } from '@/components/platform/Platform'
import { getGraduates } from '@/lib/data'
import { ComingSoon } from '@/components/platform/ComingSoon'
import { isComingSoon } from '@/content/site'
import { getI18n } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  if (isComingSoon('network')) return { title: t.platform.comingSoon.metaTitle(t.platform.comingSoon.modules.network.name), description: t.platform.comingSoon.modules.network.note }
  return { title: t.platform.networkPage.metaTitle, description: t.platform.networkPage.metaDescription }
}

export default async function NetworkPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  // Not open yet: the Coming Soon page stands in, and the full page below stays ready.
  if (isComingSoon('network')) return <ComingSoon module="network" />
  const { t } = await getI18n()
  const c = t.platform.networkPage
  const [{ state }, graduates] = await Promise.all([searchParams, getGraduates()])
  return (
    <>
      <PlatformHero eyebrow={c.eyebrow} title={c.title} lead={<p>{c.lead}</p>} layout="stack" tone="blueprint">
        <p className="preview-note" style={{ marginBottom: 'var(--space-3)' }}>
          <span className="status-dot" aria-hidden="true" />
          <span>{c.privacy}</span>
        </p>
        <SampleNotice />
      </PlatformHero>
      <Suspense fallback={null}>
        <GraduateNetwork graduates={graduates} state={state} />
      </Suspense>
    </>
  )
}
