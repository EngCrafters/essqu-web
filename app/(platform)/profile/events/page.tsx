import { redirect } from 'next/navigation'
import { routes } from '@/lib/routes'

/** The member's events now live on the profile itself. */
export default function AttendancePage() {
  redirect(routes.profileEvents)
}
