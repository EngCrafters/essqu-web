import type { Metadata } from 'next'
import { Suspense } from 'react'
import { MembersNetwork } from '@/components/pages/members/MembersNetwork'
import { PlatformHero, SampleNotice } from '@/components/platform/Platform'
import { getMembers, getProjects } from '@/lib/data'
import { getI18n } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.platform.membersPage.metaTitle, description: t.platform.membersPage.metaDescription }
}

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { t } = await getI18n()
  const c = t.platform.membersPage
  const [{ state }, members, projects] = await Promise.all([searchParams, getMembers(), getProjects()])
  // Pairs of members who share at least one project.
  const pairs = new Set<string>()
  for (const p of projects)
    for (let i = 0; i < p.contributors.length; i++)
      for (let j = i + 1; j < p.contributors.length; j++) pairs.add([p.contributors[i], p.contributors[j]].sort().join('|'))
  const links = [...pairs].map((k) => k.split('|') as [string, string])

  return (
    <>
      <PlatformHero eyebrow={c.eyebrow} title={c.title} lead={<p>{c.lead}</p>} layout="stack" tone="surface">
        <p className="preview-note" style={{ marginBottom: 'var(--space-3)' }}>
          <span className="status-dot" aria-hidden="true" />
          <span>{c.privacy}</span>
        </p>
        <SampleNotice />
      </PlatformHero>
      <Suspense fallback={null}>
        <MembersNetwork members={members} links={links} state={state} />
      </Suspense>
    </>
  )
}
