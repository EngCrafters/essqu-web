import type { Metadata } from 'next'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { DemoSessionProvider } from '@/components/platform/DemoSession'
import { NotFoundView } from '@/components/platform/NotFoundView'
import { getI18n } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.platform.notFound.metaTitle, robots: { index: false } }
}

/** Any unknown address: the same page, with the platform's header and footer around it. */
export default function NotFound() {
  return (
    <DemoSessionProvider>
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        <NotFoundView />
      </main>
      <SiteFooter />
    </DemoSessionProvider>
  )
}
