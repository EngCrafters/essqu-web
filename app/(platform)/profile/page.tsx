import type { Metadata } from 'next'
import { MemberProfile } from '@/components/pages/profile/MemberProfile'
import { ComingSoon } from '@/components/platform/ComingSoon'
import { isComingSoon } from '@/content/site'
import { getRegistrationBaseUrl } from '@/lib/core-api/events.server'
import { memberProfileCopy } from '@/lib/i18n/dictionaries/pages/member-profile'
import { getI18n } from '@/lib/i18n/server'
import { getMemberAuthConfig } from '@/lib/member-auth/config.server'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getI18n()
  return { title: `${memberProfileCopy[locale].profile.metaTitle} · ${t.site.name}`, robots: { index: false, follow: false }, referrer: 'no-referrer' }
}

/** The signed-in member's own profile. Its content is private, so it is read in the browser with the member's session. */
export default function ProfilePage() {
  if (isComingSoon('profile')) return <ComingSoon module="profile" />
  return <MemberProfile authSettings={getMemberAuthConfig()} coreBase={getRegistrationBaseUrl()} />
}
