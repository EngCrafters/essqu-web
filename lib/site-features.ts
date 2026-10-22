import features from '@/config/site-features.json' with { type: 'json' }

/**
 * The one developer-controlled switchboard (config/site-features.json): which selected pages are
 * open and which profile features the website offers. It is static and built in, never read from
 * the dashboard or a database. It never replaces Core's own authorization: Core still checks
 * every request, and refuses profile edits and photo uploads with its own matching switches
 * (MEMBER_PROFILE_EDITING, MEMBER_PHOTO_UPLOADS) when they are off.
 */
export const PAGE_IDS = ['projects', 'events', 'register', 'profile', 'members', 'network', 'certificates'] as const
export type PageId = (typeof PAGE_IDS)[number]
export type PageState = 'active' | 'coming-soon'

export type SiteFeatures = {
  pages: Record<PageId, PageState>
  profile: { allowPhotoUpload: boolean; allowProfileEditing: boolean }
}

/** Throws on a typo, so a broken configuration fails the build instead of opening a page. */
export function parseSiteFeatures(value: unknown): SiteFeatures {
  const v = value as { pages?: Record<string, unknown>; profile?: Record<string, unknown> } | null
  if (!v || typeof v !== 'object' || !v.pages || typeof v.pages !== 'object' || !v.profile || typeof v.profile !== 'object')
    throw new Error('config/site-features.json: "pages" and "profile" are required')
  const pages = {} as Record<PageId, PageState>
  for (const id of PAGE_IDS) {
    const state = v.pages[id]
    if (state !== 'active' && state !== 'coming-soon') throw new Error(`config/site-features.json: pages.${id} must be "active" or "coming-soon"`)
    pages[id] = state
  }
  const unknown = Object.keys(v.pages).filter((k) => !(PAGE_IDS as readonly string[]).includes(k))
  if (unknown.length) throw new Error(`config/site-features.json: unknown pages ${unknown.join(', ')}`)
  for (const key of ['allowPhotoUpload', 'allowProfileEditing'])
    if (typeof v.profile[key] !== 'boolean') throw new Error(`config/site-features.json: profile.${key} must be true or false`)
  return { pages, profile: { allowPhotoUpload: v.profile.allowPhotoUpload as boolean, allowProfileEditing: v.profile.allowProfileEditing as boolean } }
}

export const SITE_FEATURES = parseSiteFeatures(features)
