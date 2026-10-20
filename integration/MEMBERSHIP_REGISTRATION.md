# Membership registration: `/register` → Core review

Date: 20 October 2026 · Branches: website `feat/membership-registration`, Core
`feat/uc01-membership-applications` · **Nothing pushed, merged or deployed.**

`/register` is open. It sends a real membership application, with a photo or scan of the
applicant's SQU student ID card, to the Core platform. There the society reviews it, and
membership starts only after approval. Core's decision record is ADR 0017, and its data and
security contract is `docs/UC-01_Membership_Applications.md` (both in `engsoc-platform`).

## A. Architecture

```text
Browser (/register)
  ├─ photo → re-encoded to JPEG in the browser (≤ 2000 px, metadata dropped); PDF sent as is
  ├─ POST {CORE_API_BASE_URL}/membership-applications   multipart, no key, no cookie
  │     201 {status: pending_review, statusToken}   409 already-applied | already-member
  │     422 field errors   413 too large   429 Retry-After   5xx/network → "couldn't be sent"
  └─ POST {CORE_API_BASE_URL}/membership-applications/status   {statusToken} in the body
        200 {status: pending_review | approved | rejected, submittedAt, activated}

Core
  private.membership_applications + private.membership_documents (one transaction)
  /admin/membership  →  review  →  approval  →  activation: members row + Supabase invitation
```

- The website's server only passes Core's public base URL to the page
  (`getRegistrationBaseUrl()`, the same one event registration uses). No website server code
  handles the application, the file or the token, and there is no new environment variable.
- `lib/core-api/membership.ts` holds everything browser-side:
  - `prepareDocument`: checks the file signature and size, and re-encodes photos.
  - `membershipFormData`: the exact fields Core accepts, with consent version `2026-10-v1`.
  - `submitMembershipApplication`: one XHR with upload progress, 90 s timeout, never retried.
  - `membershipOutcomeFor`: maps Core's answer to an outcome.
  - `fetchApplicationStatus`.
  - Token storage: `remember…`, `recall…`, `forgetApplication`.
- `components/pages/register/RegisterForm.tsx` keeps the original form and member card. It adds
  the ID card field, Core's errors, the upload progress and the status views.

## B. Access control

- **Applicant.** Anonymous. The request carries no credential, cookie or IP address. Core takes
  the client IP from Vercel's edge and allows five applications per IP per hour. The status token
  is the applicant's only handle. It is 256 bits, returned once, and kept only in that browser's
  `localStorage` (`es-membership-application`); it never goes in a URL. Core stores only its hash.
- **Reviewers.** Everything happens in Core's dashboard, behind Supabase Auth:
  - the Society Affairs committee manager (committee slug `society-affairs`);
  - Board Administration (Senior Management);
  - Technical.
  Other committee managers and organisational titles get nothing. Final approval follows a policy
  the owner has **not yet confirmed**; until it is recorded, Core refuses approval and
  activation, so no account can be created.
- **Website.** It has no review surface, no list, no document access and no key for any of this.
  Core's CORS allowlist (`CORE_API_ALLOWED_ORIGINS`) must list the site's exact origin, as it
  already does for event registration.

## C. Database

Nothing is stored by the website. Core keeps:

- the application: the form fields, consent version and time, review state, reviewer IDs, an
  internal note of at most 500 characters, and the activation link;
- the ID document, in a private table reachable only through fixed routines. It is not in a
  storage bucket and has no URL. Core **deletes it at approval or rejection**.

On activation Core writes the `members` row and sends the standard Supabase invitation, so the
person sets their own password. It grants no administrative access. Audit rows identify the
application by ID only. Migration `0025_membership_applications` creates all of this. It has been
applied only to disposable local databases.

## D. UI

- **Unchanged:** the fields, layout, hero, the member card that fills as you type, the error
  summary and focus behaviour, and both languages.
- **Removed:** the prototype's duplicate-ID demo (`12345678`), its "prototype" note, and the
  link to the sample profile. "Member since" now shows the current month. The card's member
  number reads "Assigned on approval".
- **Added:**
  - an **SQU student ID card** field (JPG, PNG, WebP or PDF, up to 4 MB) with a thumbnail,
    replace/remove, the prepared size, and a plain explanation of why the card is needed, who
    sees it and when it is deleted;
  - upload progress on the submit button;
  - Core's field errors mapped onto the form;
  - notices for an existing application, an existing member, the rate limit and an outage;
  - the success state "Application received" with the three next steps.
- **Returning visitors** see "under review" or "approved" from their stored token. After a
  rejection they see a short note above a fresh form. Internal notes and reviewer identities are
  never shown.
- **Coming Soon:** `register` was removed from `COMING_SOON`, so the header's "Soon" tag for
  `/register` disappears. `/projects`, `/members`, `/network` and `/certificates` stay Coming
  Soon, and the prototype `/profile` pages are untouched. Since the real form no longer marks the
  demo session as a member, the profile's "after the membership form" note no longer appears.
- Event registration is unchanged.

## E. Testing

- `npm test`: 79 tests pass. `tests/core-api/membership.test.ts` covers signature sniffing,
  re-encoding (the original file is never sent), size limits, the exact form fields, every Core
  status mapping, the status call (token in the body, no credentials) and token storage. Lint
  and typecheck pass, and so does the production build.
- **Cross-project browser run.** This website's production build ran against Core's production
  build on a disposable PostgreSQL, using synthetic identities and generated card images and
  PDFs only, in system Chrome. It checked:
  - the page opens with no Coming Soon section;
  - an empty submit lists all seven errors and sends nothing;
  - a GIF named `.png` and a text file are refused in the browser;
  - a 2400 × 1500 PNG with a metadata marker arrives as a 2000 × 1250 JPEG without the marker or
    the original file name, with no cookie or authorization header;
  - the stored row is `pending_review` and the token is stored only as a hash;
  - the audit row and the browser storage hold no personal data;
  - reloading shows "under review", and the status call keeps the token out of the URL;
  - both duplicate reasons return 409 with the notice;
  - a PDF is stored byte for byte, and a PDF with `/OpenAction /JavaScript` is refused with
    nothing stored;
  - the sixth attempt in an hour returns 429 with the notice;
  - the Core lifecycle: a Media manager is refused; approval is refused while the policy is
    unset; Board cannot set the policy and Technical can; Society Affairs verifies but cannot
    give final approval under `two_step`; Board approves and the document is deleted; activation
    needs the invitation, then writes the member with no admin access; a second activation is a
    no-op; rejection deletes the document;
  - the website then shows "approved", and for the rejected PDF application it shows the
    rejection note without the internal note;
  - Arabic is right-to-left with Arabic errors;
  - 360 px Arabic and 390 px English have no horizontal overflow, and the file button is 48 px
    tall;
  - `/projects`, `/members`, `/network` and `/certificates` still show Coming Soon, and
    `/profile` returns 200;
  - an event registration still completes;
  - neither server's log holds an email, name or student ID.
- **Not verified:** the signed-in Core dashboard with real Supabase Auth, a real invitation
  email, and anything on staging or production.

## Deployment order (each step needs the owner's approval)

1. Core first: merge, apply migration 0025 to staging, verify, then production (Core's
   `docs/UC-01_Membership_Applications.md` §12).
2. Then this website. If the website goes live before Core has the endpoints, `/register` still
   works as a page, but every submission ends in "couldn't be sent just now", with nothing saved.
3. The owner records the approval policy in Core. Until then, applications collect and can be
   reviewed or rejected, but nobody can be approved or activated.

## Open decisions (owner)

1. Approval policy: `two_step` (verify, then a different Senior Management reviewer approves) or
   `single_step`.
2. Confirm the form rules: SQU email only; student ID 6–10 digits; year and discipline required;
   interests optional (up to four).
3. Retention for undecided applications (proposed: 180 days, then rejected as expired).
4. University privacy approval of the consent wording and of keeping card images until decision.
5. Whether Technical reviews applications, or only acts in emergencies.
