import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import features from '@/config/site-features.json' with { type: 'json' }
import { COMING_SOON, isComingSoon } from '@/content/site'
import {
  correctionProblem,
  draftProblems,
  editOf,
  isEmail,
  photoProblem,
  profileControls,
  toOwnProfile,
  MAX_PHOTO_BYTES,
} from '@/lib/core-api/member-profile'
import { initials } from '@/lib/member-auth/initials'
import { safeMemberReturn } from '@/lib/member-auth/return-path'
import { PAGE_IDS, parseSiteFeatures, SITE_FEATURES } from '@/lib/site-features'

const valid = {
  pages: { projects: 'active', events: 'active', register: 'active', profile: 'active', members: 'coming-soon', network: 'coming-soon', certificates: 'coming-soon' },
  profile: { allowPhotoUpload: true, allowProfileEditing: false },
}

describe('config/site-features.json', () => {
  it('is the source of every page state and profile switch', () => {
    assert.deepEqual(SITE_FEATURES, parseSiteFeatures(features))
    assert.deepEqual(
      COMING_SOON,
      PAGE_IDS.filter((id) => SITE_FEATURES.pages[id] === 'coming-soon'),
    )
    for (const id of PAGE_IDS) assert.equal(isComingSoon(id), SITE_FEATURES.pages[id] === 'coming-soon')
  })

  it('reads a complete configuration', () => {
    const parsed = parseSiteFeatures(valid)
    assert.equal(parsed.pages.profile, 'active')
    assert.equal(parsed.pages.members, 'coming-soon')
    assert.deepEqual(parsed.profile, { allowPhotoUpload: true, allowProfileEditing: false })
  })

  it('fails the build on a typo instead of opening a page', () => {
    assert.throws(() => parseSiteFeatures({ ...valid, pages: { ...valid.pages, events: 'on' } }), /pages\.events/)
    assert.throws(() => parseSiteFeatures({ ...valid, pages: { ...valid.pages, profil: 'active' } }), /unknown pages profil/)
    assert.throws(() => parseSiteFeatures({ ...valid, pages: { ...valid.pages, profile: undefined } }), /pages\.profile/)
    assert.throws(() => parseSiteFeatures({ ...valid, profile: { allowPhotoUpload: 'yes', allowProfileEditing: true } }), /allowPhotoUpload/)
    assert.throws(() => parseSiteFeatures(null), /required/)
  })
})

describe('navbar avatar initials', () => {
  it('takes the first and last names, in any script', () => {
    assert.equal(initials('Synthetic Test Member', 'x@squ.edu.om'), 'SM')
    assert.equal(initials('عضو تجريبي', 'x@squ.edu.om'), 'عت')
    assert.equal(initials('Single', 'x@squ.edu.om'), 'S')
  })

  it('falls back to the email, never to nothing', () => {
    assert.equal(initials(null, 'member@squ.edu.om'), 'M')
    assert.equal(initials('   ', ''), '·')
  })
})

describe('sign-in return to the profile', () => {
  it('allows exactly /profile', () => {
    assert.equal(safeMemberReturn('/profile'), '/profile')
    for (const bad of ['/profile?x=1', '/profile/../admin', '//evil.example/profile', 'https://evil.example/profile', '/profile#settings'])
      assert.equal(safeMemberReturn(bad), null, bad)
  })
})

describe('profile edits', () => {
  // The categories and institutions Core publishes (migration 0033), as the page receives them.
  const options = {
    categories: [
      { id: 'university_student', label: { en: 'University Student', ar: 'طالب جامعي' }, institution: 'required' as const, academicYear: true },
      { id: 'graduate', label: { en: 'Graduate / Alumni', ar: 'خرّيج' }, institution: 'optional' as const, academicYear: false },
      { id: 'academic', label: { en: 'Academic / Researcher', ar: 'أكاديمي' }, institution: 'none' as const, academicYear: false },
    ],
    institutions: [{ id: 'squ', name: { en: 'SQU', ar: 'جامعة السلطان قابوس' }, country: 'OM' }],
    consentVersion: '2026-11-v2',
    approval: 'review' as const,
    accountActivation: 'email_confirmation' as const,
  }
  const draft = { phone: '+968 9123 4567',
    category: 'university_student',
    institution: 'squ',
    institutionName: '',
    academicYear: '3', discipline: 'electrical', interests: ['cad' as const, 'embedded' as const],
  }

  it('accepts a complete draft, and an empty phone', () => {
    assert.deepEqual(draftProblems(draft, options), {})
    assert.deepEqual(draftProblems({ ...draft, phone: '' }, options), {})
  })

  it('applies the rules Core applies, by category', () => {
    assert.deepEqual(Object.keys(draftProblems({ ...draft, phone: '91234567' }, options)), ['phone'])
    assert.deepEqual(Object.keys(draftProblems({ ...draft, academicYear: '6' }, options)), ['academicYear'])
    assert.deepEqual(Object.keys(draftProblems({ ...draft, discipline: 'aerospace' }, options)), ['discipline'])
    assert.deepEqual(Object.keys(draftProblems({ ...draft, interests: ['cad', 'data', 'power', 'hse', 'quality'] }, options)), ['interests'])
    assert.deepEqual(Object.keys(draftProblems({ ...draft, interests: ['cad', 'cad'] }, options)), ['interests'])
    assert.deepEqual(Object.keys(draftProblems({ ...draft, category: 'astronaut' }, options)), ['category'])
    assert.deepEqual(Object.keys(draftProblems({ ...draft, institution: '' }, options)), ['institution'])
    assert.deepEqual(Object.keys(draftProblems({ ...draft, institution: 'other', institutionName: 'X' }, options)), ['institutionName'])
    assert.deepEqual(draftProblems({ ...draft, institution: 'other', institutionName: 'Imperial College London' }, options), {})
    // A graduate's alma mater is optional and no year is asked for.
    assert.deepEqual(draftProblems({ ...draft, category: 'graduate', institution: '', academicYear: '' }, options), {})
    assert.deepEqual(draftProblems({ ...draft, category: 'academic', institution: '', academicYear: '' }, options), {})
  })

  it('sends only the details the category collects', () => {
    assert.deepEqual(editOf({ ...draft, category: 'academic', institution: 'other', institutionName: 'Stale' }, options), {
      phone: '+96891234567',
      category: 'academic',
      institution: '',
      institutionName: '',
      academicYear: null,
      discipline: 'electrical',
      interests: ['cad', 'embedded'],
    })
    assert.equal(editOf({ ...draft, institutionName: 'Stale' }, options)!.institutionName, '')
    assert.equal(editOf({ ...draft, category: 'astronaut' }, options), null)
  })

  it('checks a correction before a reviewer sees it', () => {
    assert.equal(correctionProblem('university_id', '12345678'), null)
    assert.equal(correctionProblem('university_id', '12a45678'), 'university_id')
    assert.equal(correctionProblem('university_id', '12345'), 'university_id')
    assert.equal(correctionProblem('full_name', 'Synthetic Member'), null)
    assert.equal(correctionProblem('full_name', ' '), 'full_name')
    assert.equal(correctionProblem('full_name', 'Name\u0007'), 'full_name')
  })

  it('changes the sign-in email to any valid address, personal or institutional (Core ADR 0025)', () => {
    assert.ok(isEmail('s123@squ.edu.om'))
    assert.ok(isEmail('aisha.alhinai@gmail.com'))
    assert.ok(!isEmail('not-an-email'))
    assert.ok(!isEmail('a@localhost'))
    assert.ok(!isEmail(`${'a'.repeat(250)}@x.om`))
  })

  it('previews only a JPEG or PNG within the size limit', () => {
    assert.equal(photoProblem({ type: 'image/jpeg', size: 1024 }), null)
    assert.equal(photoProblem({ type: 'image/png', size: MAX_PHOTO_BYTES }), null)
    assert.equal(photoProblem({ type: 'image/png', size: MAX_PHOTO_BYTES + 1 }), 'invalid')
    assert.equal(photoProblem({ type: 'image/svg+xml', size: 1024 }), 'invalid')
    assert.equal(photoProblem({ type: 'image/gif', size: 1024 }), 'invalid')
    assert.equal(photoProblem({ type: 'image/jpeg', size: 0 }), 'invalid')
  })
})

describe("Core's profile answer", () => {
  const answer = {
    code: 'SUCCESS',
    name: 'Synthetic Member',
    email: 'synthetic@squ.edu.om',
    signInEmail: 'synthetic@squ.edu.om',
    universityId: '12345678',
    academicYear: 2,
    discipline: 'civil',
    interests: ['cad', 'unknown-interest'],
    phone: null,
    hasPhoto: true,
    photoVersion: '33333333-3333-4333-8333-333333333333',
    status: 'member',
    memberSince: '2026-09-01T08:00:00Z',
    updatedAt: null,
    application: { status: 'approved', submittedAt: '2026-08-20T08:00:00Z', verifiedAt: null, decidedAt: '2026-08-30T08:00:00Z', activatedAt: '2026-09-01T08:00:00Z' },
    changeRequests: [
      { field: 'full_name', status: 'pending', requestedValue: 'Synthetic Member Two', requestedAt: '2026-10-01T08:00:00Z', decidedAt: null },
      { field: 'email', status: 'pending', requestedValue: 'x', requestedAt: '2026-10-01T08:00:00Z', decidedAt: null },
    ],
    features: { photoUploads: true, profileEditing: false },
  }

  it('keeps only what it can render safely', () => {
    const profile = toOwnProfile(answer)!
    assert.equal(profile.discipline, 'civil')
    assert.deepEqual(profile.interests, ['cad'])
    assert.deepEqual(
      profile.changeRequests.map((r) => r.field),
      ['full_name'],
    )
    assert.deepEqual(profile.features, { photoUploads: true, profileEditing: false })
  })

  it('shows a control only when the website and Core both allow it', () => {
    const on = { allowPhotoUpload: true, allowProfileEditing: true }
    const coreOn = { photoUploads: true, profileEditing: true }
    assert.deepEqual(profileControls(on, coreOn), { canEdit: true, canUpload: true })
    assert.deepEqual(profileControls({ ...on, allowPhotoUpload: false }, coreOn), { canEdit: true, canUpload: false })
    assert.deepEqual(profileControls(on, { ...coreOn, photoUploads: false }), { canEdit: true, canUpload: false })
    assert.deepEqual(profileControls({ ...on, allowProfileEditing: false }, coreOn), { canEdit: false, canUpload: true })
    assert.deepEqual(profileControls(on, { ...coreOn, profileEditing: false }), { canEdit: false, canUpload: true })
  })

  it('reads the category, institution and SQU badge, and accepts a member with no student ID', () => {
    const profile = toOwnProfile({
      ...answer,
      universityId: null,
      category: 'graduate',
      categoryLabel: { en: 'Graduate / Alumni', ar: 'خرّيج' },
      institution: null,
      institutionName: 'University of Leeds',
      squVerified: true,
    })!
    assert.equal(profile.universityId, null)
    assert.equal(profile.category, 'graduate')
    assert.deepEqual(profile.categoryLabel, { en: 'Graduate / Alumni', ar: 'خرّيج' })
    assert.equal(profile.institutionName, 'University of Leeds')
    assert.equal(profile.squVerified, true)
    // An answer from before migration 0033 still renders: no category, not verified.
    const legacy = toOwnProfile(answer)!
    assert.equal(legacy.universityId, '12345678')
    assert.equal(legacy.category, null)
    assert.equal(legacy.squVerified, false)
    assert.equal(toOwnProfile({ ...answer, squVerified: 'yes' })!.squVerified, false)
  })

  it('treats a missing switch as off, and a malformed answer as unavailable', () => {
    assert.deepEqual(toOwnProfile({ ...answer, features: undefined })!.features, { photoUploads: false, profileEditing: false })
    assert.equal(toOwnProfile({ ...answer, discipline: 'aerospace' })!.discipline, null)
    assert.equal(toOwnProfile({ ...answer, name: 7 }), null)
    assert.equal(toOwnProfile(null), null)
  })
})
