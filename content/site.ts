import type { Localized } from '@/lib/i18n'
import { routes } from '@/lib/routes'

/**
 * Site-wide wiring. Anything marked `null` has no verified destination yet; components hide or
 * downgrade the related UI instead of rendering a broken link. The society's name, tagline and
 * description are interface copy and live in lib/i18n/dictionaries.
 */

/**
 * One navigation for every page, the homepage included. The primary pages sit in the bar, in
 * the homepage's section order (labels: `t.nav.links[id]`); the community pages share one
 * grouped menu (labels: `t.platform.nav[id]`). The brand mark is Home.
 */
export const PRIMARY_PAGES = [
  { href: routes.events, id: 'events' },
  { href: routes.activities, id: 'activities' },
  { href: routes.projects, id: 'projects' },
  { href: routes.disciplines, id: 'disciplines' },
  { href: routes.about, id: 'about' },
] as const

export const COMMUNITY_PAGES = [
  { href: routes.members, id: 'members' },
  { href: routes.leadership, id: 'leadership' },
  { href: routes.network, id: 'network' },
  { href: routes.profile, id: 'profile' },
  { href: routes.certificates, id: 'certificates' },
] as const

/** The footer's map of the site, in three groups (labels: `t.footer.groups[id]`). */
export const FOOTER_GROUPS = [
  {
    id: 'society',
    links: [
      { href: routes.about, label: 'about' },
      { href: routes.leadership, label: 'leadership' },
      { href: routes.disciplines, label: 'disciplines' },
    ],
  },
  {
    id: 'explore',
    links: [
      { href: routes.activities, label: 'activities' },
      { href: routes.events, label: 'events' },
      { href: routes.projects, label: 'projects' },
    ],
  },
  {
    id: 'community',
    links: [
      { href: routes.members, label: 'members' },
      { href: routes.network, label: 'network' },
      { href: routes.certificates, label: 'certificates' },
      { href: routes.register, label: 'register' },
    ],
  },
] as const

/**
 * Platform modules that are not open yet. Their pages show a Coming Soon state instead of the
 * full implementation, which stays in place: remove an id here to bring its page back.
 *
 * `register` is open: membership applications go to the Core platform for review (ADR 0017 in
 * engsoc-platform). Its Coming Soon state stays available by adding the id back.
 */
export const COMING_SOON: readonly UpcomingModule[] = ['projects', 'members', 'network', 'certificates']

export type UpcomingModule = 'projects' | 'members' | 'network' | 'certificates' | 'register'

export const isComingSoon = (module: UpcomingModule) => COMING_SOON.includes(module)

/** The module behind a navigation address, if that address is one of the upcoming modules. */
export const upcomingAt = (href: string) => COMING_SOON.find((m) => href === `/${m}`)

export const SITE = {
  /** No sign-in destination exists yet, so the navbar omits sign-in. */
  signInUrl: null as string | null,

  /**
   * Draft 1 used an invented email address. Only add entries here once the society
   * confirms them; the footer renders nothing otherwise.
   */
  contact: [] as { label: Localized; href: string }[],
} as const
