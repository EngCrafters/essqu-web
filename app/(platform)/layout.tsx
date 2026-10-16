import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { DemoSessionProvider } from '@/components/platform/DemoSession'

/**
 * Every page except the homepage. They share the site's navbar and footer with the homepage, and
 * the visitor's demo session (registrations, mentorship requests), which lives only in this
 * browser tab and is never sent anywhere.
 */
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoSessionProvider>
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
    </DemoSessionProvider>
  )
}
