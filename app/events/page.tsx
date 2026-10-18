import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { Events } from '@/components/sections/Events'
export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; cursor?: string }>
}) {
  const query = await searchParams
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        <Events
          full
          period={query.period === 'past' ? 'past' : 'upcoming'}
          cursor={typeof query.cursor === 'string' ? query.cursor : undefined}
        />
      </main>
      <SiteFooter />
    </>
  )
}
