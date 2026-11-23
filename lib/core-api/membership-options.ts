/*
 * The membership form's choices, as Core publishes them (Core ADR 0025):
 *
 *   GET {CORE_API_BASE_URL}/membership-options   (public, no key, no cookie)
 *
 * Categories and institutions live in Core's database with stable ids and English and Arabic
 * labels. Each category says whether it asks for an institution (required for students,
 * optional for graduates' alma mater, none otherwise) and whether it asks for an academic year.
 * The form shows only the fields a category collects, and sends only those.
 *
 * `approval` (Core ADR 0029) says whether a valid registration becomes a membership at once
 * ('automatic') or waits for the society's review ('review'). It only chooses the page's wording;
 * Core decides at submission and reports the outcome. A Core that doesn't send it means 'review'.
 * `accountActivation` (Core ADR 0030), likewise for wording: 'immediate' means no confirmation
 * email; anything else means the usual email confirmation.
 */

export type Localized = { en: string; ar: string }
export type CategoryOption = { id: string; label: Localized; institution: 'required' | 'optional' | 'none'; academicYear: boolean }
export type InstitutionOption = { id: string; name: Localized; country: string }
export type MembershipApproval = 'automatic' | 'review'
export type AccountActivation = 'email_confirmation' | 'immediate'
export type MembershipOptions = {
  categories: CategoryOption[]
  institutions: InstitutionOption[]
  consentVersion: string
  approval: MembershipApproval
  accountActivation: AccountActivation
}

/** The form's value for "my university is not listed"; the name is then typed. */
export const OTHER_INSTITUTION = 'other'

const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown, max = 200): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max
const localized = (v: unknown): v is Localized => object(v) && text(v.en) && text(v.ar)

/** Core's answer → options, or null when it is not what Core publishes. Pure, so it is tested. */
export function toMembershipOptions(body: unknown): MembershipOptions | null {
  const data = object(body) && object(body.data) ? body.data : null
  if (!data || !Array.isArray(data.categories) || !Array.isArray(data.institutions) || typeof data.consentVersion !== 'string') return null
  if (!/^[a-z0-9.-]{1,40}$/.test(data.consentVersion)) return null
  const categories = data.categories.filter(
    (c): c is CategoryOption =>
      object(c) &&
      typeof c.id === 'string' &&
      /^[a-z][a-z_]{1,39}$/.test(c.id) &&
      localized(c.label) &&
      (c.institution === 'required' || c.institution === 'optional' || c.institution === 'none') &&
      typeof c.academicYear === 'boolean',
  )
  const institutions = data.institutions.filter(
    (i): i is InstitutionOption =>
      object(i) && typeof i.id === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(i.id) && i.id !== OTHER_INSTITUTION && localized(i.name) && typeof i.country === 'string',
  )
  if (categories.length === 0) return null
  return {
    categories: categories.map(({ id, label, institution, academicYear }) => ({ id, label: { en: label.en, ar: label.ar }, institution, academicYear })),
    institutions: institutions.map(({ id, name, country }) => ({ id, name: { en: name.en, ar: name.ar }, country })),
    consentVersion: data.consentVersion,
    approval: data.approval === 'automatic' ? 'automatic' : 'review',
    accountActivation: data.accountActivation === 'immediate' ? 'immediate' : 'email_confirmation',
  }
}

export const findCategory = (options: MembershipOptions | null, id: string) => options?.categories.find((c) => c.id === id) ?? null

/**
 * The same options read again from the applicant's browser, for the form's "Try again" after the
 * server could not load them. Public data: no key, no cookie; Core allows the site's origin. Null
 * on any failure, so the form keeps saying it could not load rather than showing a partial form.
 */
export async function fetchMembershipOptions(base: string, fetchImpl: typeof fetch = fetch): Promise<MembershipOptions | null> {
  try {
    const response = await fetchImpl(`${base}/membership-options`, {
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
      mode: 'cors',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return null
    return toMembershipOptions(await response.json())
  } catch {
    return null
  }
}
