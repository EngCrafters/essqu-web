# Routes

Every route in [`app/`](../../app/) at the documented commit (**Source**). All pages can be loaded
by anyone. Where a feature needs a signed-in member, the page asks the visitor to sign in, and
**Core enforces the rule on every request**. The website's checks only decide what to show.

"Switch" names the entry in [`config/site-features.json`](../../config/site-features.json). When
it is `coming-soon`, the page renders `ComingSoon` instead of its content.

## Pages

| Route                                 | File                                                                             | Switch         | Who can use it                                                            | Data source                                                                                         | Status                                         |
| ------------------------------------- | -------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `/`                                   | `app/page.tsx`                                                                   | none           | Everyone                                                                  | Core upcoming events (up to 4, `getHomeEvents`); content files for every other section              | Live; society figures are demonstration values |
| `/about`                              | `app/(platform)/about/page.tsx`                                                  | none           | Everyone                                                                  | Content files; yearly record from `content/platform/record.ts` (sample)                             | Live content with sample figures               |
| `/activities`                         | `app/(platform)/activities/page.tsx`                                             | none           | Everyone                                                                  | `getArchive()` from `content/activities.ts`                                                         | Live content (named "Archive")                 |
| `/disciplines`                        | `app/(platform)/disciplines/page.tsx`                                            | none           | Everyone                                                                  | Content files; Core published projects (`getProjects`); sample members (`getMembers`)               | Live, mixed with sample data                   |
| `/leadership`                         | `app/(platform)/leadership/page.tsx`                                             | none           | Everyone                                                                  | `content/structure.ts`                                                                              | Live content                                   |
| `/events`                             | `app/(platform)/events/page.tsx`                                                 | `events`       | Everyone                                                                  | Core: `GET /events?period=upcoming` and `period=past`, up to 5 pages each                           | Live                                           |
| `/events/[slug]`                      | `app/(platform)/events/[slug]/page.tsx`                                          | `events`       | Everyone; member registration needs sign-in and an active membership      | Core: `GET /events/{id}` plus the cached list for related events. `slug` is Core's event UUID.      | Live                                           |
| `/events/[slug]/attendance`           | `app/(platform)/events/[slug]/attendance/page.tsx`                               | `events`       | Signed-in member with a confirmed registration (enforced by Core)         | Core: `GET /events/{id}`; browser: `GET` and `POST /me/events/{id}/attendance`                      | Live; `noindex`, `no-referrer`                 |
| `/projects`                           | `app/(platform)/projects/page.tsx`                                               | `projects`     | Everyone                                                                  | Core: `GET /projects?offset=…`, 30 per page, every page read                                        | Live                                           |
| `/projects/[slug]`                    | `app/(platform)/projects/[slug]/page.tsx`                                        | `projects`     | Everyone                                                                  | Core: `GET /projects/{id}`. `slug` is Core's project UUID.                                          | Live                                           |
| `/projects/submit`                    | `app/(platform)/projects/submit/page.tsx`                                        | `projects`     | Signed-in, email-confirmed member with status `member` (enforced by Core) | Browser: `/me/projects*`, `/projects/{id}/media/{m}`                                                | Live; `noindex`, `no-referrer`                 |
| `/register`                           | `app/(platform)/register/page.tsx`                                               | `register`     | Anyone with an SQU email address                                          | Browser: `POST /membership-applications`, `POST /membership-applications/status`; Supabase `signUp` | Live                                           |
| `/login`                              | `app/(platform)/login/page.tsx`                                                  | none           | Anyone with a Supabase account in Core's project                          | Supabase Auth; then `GET /me/membership`                                                            | Live; `noindex`                                |
| `/forgot-password`                    | `app/(platform)/forgot-password/page.tsx`                                        | none           | Anyone                                                                    | Supabase `resetPasswordForEmail`                                                                    | Live; `noindex`                                |
| `/reset-password`                     | `app/(platform)/reset-password/page.tsx`                                         | none           | Holder of a recovery link verified in this page load                      | Supabase `verifyOtp` / `setSession`, then `updateUser`                                              | Live; `noindex`                                |
| `/profile`                            | `app/(platform)/profile/page.tsx`                                                | `profile`      | Signed-in member (Core answers `MEMBER_REQUIRED` otherwise)               | Browser: `/me/profile`, `/me/events`, `/me/projects`, `/me/profile/photo`, `/me/profile/changes`    | Live; `noindex`, `no-referrer`                 |
| `/profile/events`                     | `app/(platform)/profile/events/page.tsx`                                         | none           | Everyone                                                                  | Redirects to `/profile#events`                                                                      | Redirect                                       |
| `/members`, `/members/[id]`           | `app/(platform)/members/…`                                                       | `members`      | Everyone                                                                  | Sample records (`content/platform/members.ts`)                                                      | Coming Soon (prototype kept behind the switch) |
| `/network`, `/network/[id]`           | `app/(platform)/network/…`                                                       | `network`      | Everyone                                                                  | Sample records (`content/platform/graduates.ts`)                                                    | Coming Soon                                    |
| `/certificates`, `/certificates/[id]` | `app/(platform)/certificates/…`                                                  | `certificates` | Everyone                                                                  | Sample records (`content/platform/certificates.ts`)                                                 | Coming Soon                                    |
| `/dev/emblem`, `/dev/turntable`       | `app/dev/…`                                                                      | none           | Development only; 404 when `NODE_ENV=production`                          | Local 3D scenes                                                                                     | Tooling                                        |
| Any unknown path                      | `app/not-found.tsx`, `app/(platform)/not-found.tsx`, per-section `not-found.tsx` | none           | Everyone                                                                  | none                                                                                                | Live                                           |

Notes:

- **Event and project URLs use Core IDs.** `getCoreEvent` returns `not-found` without a request
  when the slug is not a UUID. A draft, archived or unknown event is also `not-found`, because
  Core answers all three with the same 404.
- **Unavailable versus not found.** When Core cannot be reached, event and project pages show an
  error state with a retry link instead of a 404.
- **Return paths after sign-in.** `/login?next=` accepts only `/profile`, `/projects/submit`,
  `/events/{uuid}` and `/events/{uuid}/attendance`
  ([`lib/member-auth/return-path.ts`](../../lib/member-auth/return-path.ts)). Anything else is
  ignored.
- **Preview states.** Listings accept `?state=loading|empty|error` for design review.

## Route handlers

| Method and path                        | File                                       | Behaviour                                                                                                                                                                                                                                                                                                         |
| -------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /media/events/{eventId}?v={file}` | `app/media/events/[eventId]/route.ts`      | Proxies Core's `GET /events/{id}/image` with no credential. Accepts only a UUID and a `v` of the form `<uuid>.jpg` or `<uuid>.png`. Passes on only `image/jpeg` or `image/png` up to 3 MiB. A versioned URL gets `public, max-age=300, s-maxage=300`, otherwise `max-age=60`. Core errors become 404, 502 or 503. |
| `GET /media/projects/{id}/{media}`     | `app/media/projects/[id]/[media]/route.ts` | Proxies Core's `GET /projects/{id}/media/{media}` with no credential, so only images in a **published** snapshot load. Streams at most 3 MiB, accepts only JPEG or PNG, and answers `no-store`.                                                                                                                   |

Both handlers return 404 when Core is not configured. Private project images (drafts) are fetched
directly by the browser with the member's token and shown as object URLs
([`lib/core-api/member-projects.ts`](../../lib/core-api/member-projects.ts),
`projectImageRequest`), never through these proxies.

## Navigation

The navbar ([`components/layout/SiteHeader.tsx`](../../components/layout/SiteHeader.tsx)) shows
Events, Archive, Projects, Disciplines and About, plus a Community menu (Members, Leadership,
Network, Certificates). Modules that are Coming Soon are tagged "Soon".

The account menu ([`components/layout/AccountMenu.tsx`](../../components/layout/AccountMenu.tsx))
follows the Supabase session:

| Visitor                                              | Account menu shows                                                                                  |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Signed out                                           | Join (desktop); Join and Sign in (phone menu)                                                       |
| Approved member                                      | Profile, settings, my events, submit a project (each hidden when its page is Coming Soon), Sign out |
| Applicant                                            | A link to `/login`, which shows the application status                                              |
| Account with neither (a dashboard user, for example) | A link to `/register`                                                                               |

Showing a menu item grants nothing. Core decides on every request.
