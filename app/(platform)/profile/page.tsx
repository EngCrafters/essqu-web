import type { Metadata } from 'next'
import { ScrollReveals } from '@/components/motion/ScrollReveals'
import { ProfileView } from '@/components/pages/profile/ProfileView'
import { getCurrentMember } from '@/lib/data'
import { getI18n } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: `${t.platform.nav.profile} · ${t.site.name}`, robots: { index: false } }
}

/** The signed-in member's own profile. Until accounts exist, the prototype's sample member. */
export default async function ProfilePage() {
  const profile = await getCurrentMember()
  return (
    <>
      <ProfileView profile={profile} own />
      <ScrollReveals />
    </>
  )
}
