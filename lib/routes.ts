import type { DisciplineId } from '@/content/disciplines'

/**
 * Every internal address the site builds, in one place, so a record is reached by the same URL
 * from every page that mentions it. Records keep the identifiers their data already uses:
 * event and project slugs, member, graduate and certificate ids, and the discipline ids that
 * the filters (`?discipline=`) and the Disciplines page's sections (`#mechanical`) share.
 */
export const routes = {
  home: '/',
  about: '/about',
  activities: '/activities',
  events: '/events',
  projects: '/projects',
  disciplines: '/disciplines',
  leadership: '/leadership',
  members: '/members',
  network: '/network',
  certificates: '/certificates',
  profile: '/profile',
  profileEvents: '/profile/events',
  register: '/register',
  login: '/login',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',

  event: (slug: string) => `/events/${slug}`,
  project: (slug: string) => `/projects/${slug}`,
  member: (id: string) => `/members/${id}`,
  graduate: (id: string) => `/network/${id}`,
  certificate: (id: string) => `/certificates/${id}`,
  /** A discipline's own section of the Disciplines page; arriving there turns its exhibit. */
  discipline: (id: DisciplineId) => `/disciplines#${id}`,
  activity: (id: string) => `/activities?category=${id}`,
} as const

/** The section a path belongs to, for the navbar's current-page mark (`/events/x` → `/events`). */
export const isWithin = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`)
