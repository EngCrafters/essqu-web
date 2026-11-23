import 'server-only'
import { cache } from 'react'
import { getCoreConfig } from './config.server'
import { toMembershipOptions, type MembershipOptions } from './membership-options'

/** Reference data changes only with a Core migration; five minutes of caching is plenty. */
export const MEMBERSHIP_OPTIONS_REVALIDATE_SECONDS = 300

/**
 * The membership categories and institutions from Core, read on the server for /register and
 * /profile. Public data: no key is sent. `null` means unavailable (Core not configured, down, or
 * answering something unexpected); the pages then say applications can't be sent right now.
 */
export const getMembershipOptions = cache(async (): Promise<MembershipOptions | null> => {
  const config = getCoreConfig()
  if (config.mode !== 'core') return null
  try {
    const response = await fetch(`${config.baseUrl}/membership-options`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: MEMBERSHIP_OPTIONS_REVALIDATE_SECONDS },
      redirect: 'error',
      signal: AbortSignal.timeout(config.timeoutMs),
    })
    if (!response.ok) return null
    return toMembershipOptions(await response.json())
  } catch {
    return null
  }
})
