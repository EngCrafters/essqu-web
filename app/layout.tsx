import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans_Arabic, Manrope, Space_Grotesk } from 'next/font/google'
import { I18nProvider } from '@/components/i18n/I18nProvider'
import { getRegistrationBaseUrl } from '@/lib/core-api/events.server'
import { MemberAccountProvider } from '@/lib/member-auth/account'
import { getMemberAuthConfig } from '@/lib/member-auth/config.server'
import { getI18n } from '@/lib/i18n/server'
import '@/styles/globals.css'

// Only the weights the design uses. (Turbopack's loader rejects range strings like '500 700'.)
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-manrope',
  display: 'swap',
})

// The Arabic face: IBM Plex Sans Arabic shares Space Grotesk's engineered, open geometry and
// Manrope's calm texture. It sets the whole Arabic site and the Arabic names on the English one.
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-arabic',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getI18n()
  return {
    title: t.meta.title,
    description: t.meta.description,
    openGraph: {
      title: t.meta.title,
      description: t.meta.description,
      type: 'website',
      locale: locale === 'ar' ? 'ar_OM' : 'en_GB',
    },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f7f8f2',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, dir, t } = await getI18n()
  return (
    // data-scroll-behavior lets Next jump instantly on route changes (e.g. /about#structure):
    // a smooth scroll would be cancelled when ScrollTrigger refreshes on the new page.
    <html
      lang={locale}
      dir={dir}
      data-scroll-behavior="smooth"
      className={`${spaceGrotesk.variable} ${manrope.variable} ${plexArabic.variable}`}
    >
      <body>
        <I18nProvider locale={locale}>
          <a href="#main" className="skip-link">
            {t.common.skipToContent}
          </a>
          {/* The signed-in account for the navbar and profile (Supabase session in this browser). */}
          <MemberAccountProvider settings={getMemberAuthConfig()} coreBase={getRegistrationBaseUrl()}>
            {children}
          </MemberAccountProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
