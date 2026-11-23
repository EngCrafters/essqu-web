# Core API consumption

How the website calls Core and Supabase. This document covers the **consumer side** only. Request
and response contracts, status codes and database effects are canonical in Core's
[API reference](https://github.com/EngCrafters/engsoc-platform/blob/main/docs/reference/api.md)
and [`openapi.v1.yaml`](https://github.com/EngCrafters/engsoc-platform/blob/main/docs/api/openapi.v1.yaml).

## Module structure

```text
lib/core-api/
  config.server.ts     reads CORE_API_* once: mode "core" or "unconfigured" (with a problem name)
  client.server.ts     the only server-side HTTP call: Bearer key, timeout, one safe retry, data cache, safe logs
  events.server.ts     listCoreEvents(), getCoreEvent(), getRegistrationBaseUrl()
  projects.server.ts   getPublishedProjects(), getPublishedProject()   (no credential, no-store)
  schemas.ts           runtime validation of Core JSON (events, problems, registration status)
  adapter.ts           Core event DTO → the site's EventView / HomeEvent
  errors.ts            CoreErrorKind and retry rules
  types.ts             wire types for events, problems and registration
  registration.ts      browser: guest registration
  membership.ts        browser: membership application (category fields) and status token
  membership-options.ts          categories and institutions: types and validation (Core ADR 0025)
  membership-options.server.ts   getMembershipOptions(): GET /membership-options, no key, cached 5 min
  member-roles.ts      browser: SQU verification and leadership (two independent profile cards)
  member-events.ts     browser: memberCall() helper, member attendance and registration
  member-profile.ts    browser: own profile, photo, corrections, own registrations
  member-projects.ts   browser: own projects and project images
  projects.ts          strict project content schema shared by the public and member paths
  projects-public.ts   public project snapshot → the site's Project model
lib/member-auth/
  config.server.ts     reads SUPABASE_URL and SUPABASE_ANON_KEY (validated)
  client.ts            browser Supabase client (implicit flow, custom storage), sign-up helper
  membership.ts        GET /me/membership → OwnMembership
  account.tsx          navbar account store
```

Pages and components never call `fetch` for Core data on the server. They go through
`lib/data` or these modules.

## Base URL, credentials and headers

| Call type                     | Runs in        | Base URL                                          | Credential                                      | Notes                                                                                 |
| ----------------------------- | -------------- | ------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| Event list and detail         | Website server | `CORE_API_BASE_URL`                               | `Authorization: Bearer <CORE_EVENTS_API_KEY>`   | `Accept: application/json`; no `X-Request-Id`, so cache keys stay stable              |
| Published projects and images | Website server | `CORE_API_BASE_URL`                               | none                                            | `cache: 'no-store'`, `redirect: 'error'`                                              |
| Event cover proxy             | Website server | `CORE_API_BASE_URL`                               | none                                            | `credentials: 'omit'`, `redirect: 'error'`                                            |
| Guest registration            | Browser        | `CORE_API_BASE_URL`, passed to the page as a prop | none                                            | `credentials: 'omit'`, `mode: 'cors'`, fresh `X-Request-Id`                           |
| Membership application        | Browser        | same                                              | none                                            | `XMLHttpRequest`, `withCredentials = false`                                           |
| Membership status             | Browser        | same                                              | the status token in the JSON body               | never in a URL                                                                        |
| `/me/*` member calls          | Browser        | same                                              | `Authorization: Bearer <Supabase access token>` | `credentials: 'omit'`; the token comes from `supabase.auth.getSession()` at call time |
| Supabase Auth                 | Browser        | `SUPABASE_URL`                                    | `SUPABASE_ANON_KEY` (public)                    | `@supabase/supabase-js` with `flowType: 'implicit'`, `detectSessionInUrl: false`      |

`getRegistrationBaseUrl()` returns the normalized base URL in `core` mode and `null` otherwise.
Every browser flow is disabled when it is `null`. No browser call sends cookies, so Core's CORS
allows no credentials.

## Endpoints the website calls

| Website caller                                                      | Method and Core path                           | Purpose                                                               |
| ------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------- |
| `events.server.ts` `listCoreEvents`                                 | `GET /events?period=upcoming\|past&cursor=…`   | Published events, 20 per page                                         |
| `events.server.ts` `getCoreEvent`                                   | `GET /events/{eventId}`                        | One published event                                                   |
| `app/media/events/[eventId]/route.ts`                               | `GET /events/{eventId}/image?v=…`              | Event cover bytes                                                     |
| `registration.ts` `submitRegistration`                              | `POST /events/{eventId}/registrations`         | Guest registration                                                    |
| `membership-options.server.ts` `getMembershipOptions`               | `GET /membership-options`                      | Categories, institutions, consent version, `approval` (`automatic` or `review`, wording only) (server; `/register`, `/profile`) |
| `membership.ts` `submitMembershipApplication`                       | `POST /membership-applications`                | Membership application (text fields only; no ID, no card); 201 `status` is `approved` under Core's automatic policy |
| `membership.ts` `setUpImmediateAccount`                             | `POST /membership-applications/account`        | Immediate account activation (Core ADR 0030): one-time sign-in token  |
| `membership.ts` `fetchApplicationStatus`                            | `POST /membership-applications/status`         | Applicant's status by token                                           |
| `member-auth/membership.ts` `fetchOwnMembership`                    | `GET /me/membership`                           | Is this account a member or an applicant?                             |
| `member-events.ts` `fetchMemberEvent`; `AttendanceConfirmation.tsx` | `GET /me/events/{eventId}/attendance`          | Verified profile, own registration, check-in state                    |
| `AttendanceConfirmation.tsx`                                        | `POST /me/events/{eventId}/attendance`         | Confirm attendance with the live code                                 |
| `RegistrationPanel.tsx`                                             | `POST /me/events/{eventId}/registrations`      | Member registration                                                   |
| `RegistrationPanel.tsx`; `member-profile.ts` `saveOwnProfile`       | `PATCH /me/profile`                            | Save the phone, or the editable profile fields                        |
| `member-profile.ts` `fetchOwnProfile`; `account.tsx`                | `GET /me/profile`                              | Own profile and Core's feature switches                               |
| `member-profile.ts` `requestCorrection`                             | `POST /me/profile/changes`                     | Request a name (or legacy student ID) correction                               |
| `member-roles.ts` `fetchOwnSqu`                                     | `GET /me/verification`                         | Own SQU verification (the SQU card)                                                                                             |
| `member-roles.ts` `fetchOwnLeadership`                              | `GET /me/leadership`                           | Own appointments (each with `grantsAccess`, Core ADR 0027), requests, limits and dashboard access (leadership card)             |
| `membership-options.ts` `fetchMembershipOptions`                    | `GET /membership-options`                      | "Try again" on `/register` after the server could not load the options                                                          |
| `member-roles.ts` `submitSquEvidence`                               | `POST /me/verification/squ`                    | SQU student number and ID card evidence (multipart)                                                                             |
| `member-roles.ts` `fetchLeadershipOptions`                          | `GET /me/leadership/options`                   | Committees with active teams; requestable positions                                                                             |
| `member-roles.ts` `requestLeadership`                               | `POST /me/leadership/requests`                 | Request Chief or Assistant Chief of a committee (`teamId: null`) or of one of its teams                                         |
| `member-email.ts` `fetchEmailPreferences`                           | `GET /me/email-preferences`                    | Whether the member receives the society's optional announcements (Core ADR 0028)                                                |
| `member-email.ts` `saveEmailPreferences`                            | `PATCH /me/email-preferences`                  | `{announcements: boolean}`; optimistic switch, put back if Core refuses                                                         |
| `member-profile.ts` `fetchOwnRegistrations`                         | `GET /me/events`                               | Own registrations                                                     |
| `member-profile.ts` `sendPhoto`; `account.tsx`                      | `GET`, `PUT`, `DELETE /me/profile/photo`       | Own photo                                                             |
| `projects.server.ts` `getPublishedProjects`                         | `GET /projects?offset=…`                       | Published catalogue, 30 per page                                      |
| `projects.server.ts` `getPublishedProject`                          | `GET /projects/{id}`                           | One published project                                                 |
| `app/media/projects/[id]/[media]/route.ts`; `member-projects.ts`    | `GET /projects/{id}/media/{media}`             | Project image: public if published, otherwise with the member's token |
| `member-projects.ts` `fetchMemberProjects`                          | `GET /me/projects`, `GET /me/projects/{id}`    | Own projects with history                                             |
| `member-projects.ts` `writeMemberProject`                           | `POST /me/projects`, `PATCH /me/projects/{id}` | Create, save, submit                                                  |
| `member-projects.ts` `projectImageRequest`                          | `POST /me/projects/{id}/media`                 | Upload an image                                                       |
| `ProjectSubmission.tsx`                                             | `DELETE /me/projects/{id}/media/{media}`       | Remove an unused image                                                |

The website does **not** call `GET /health`.

## Validation and transformation

- **Events.** `schemas.ts` validates each event. An invalid event is dropped and counted in a log
  line; an invalid envelope fails the read as `invalid-response`. `getCoreEvent` also rejects a
  record whose `id` differs from the requested one. `adapter.ts` maps:
  - `committeeName` to a known committee or a plain name;
  - `availability` to the panel state;
  - `coverImageUrl` to `/media/events/{id}?v=…`.
- **Projects.** `parsePublishedProjects` accepts only `{id, revision, content}` per record, a strict
  content schema, at most 30 per page and no duplicates. Any violation fails the whole response
  closed. The catalogue rejects inconsistent paging (`total`, `hasMore`).
- **Member data.** `toOwnProfile`, `isMemberProfile`, `isProjectRecord` and `isProjectList` check
  every field before rendering.
- **Problems.** Core errors are RFC 9457 problem documents. `parseProblem` reads `code`,
  `reason` (409 only) and `errors[]`. Member calls use `errors[0].code`, or `reason`, or `code`.

## Errors, retries, timeouts and caching

| Call                       | Timeout                                         | Retry                                                                       | Cache                                                                                        |
| -------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Event reads                | `CORE_API_TIMEOUT_MS` (default 4000, 500–15000) | Once after 300 ms on a 5xx or network error, never on 401, 403 or a timeout | Next.js data cache, `CORE_EVENTS_REVALIDATE_SECONDS` (default 30, 0–300; 0 means `no-store`) |
| Project reads              | `CORE_API_TIMEOUT_MS`                           | none                                                                        | `no-store`                                                                                   |
| Event cover proxy          | 15 s                                            | none                                                                        | CDN: 300 s with a version, 60 s without                                                      |
| Guest registration         | 15 s                                            | never                                                                       | `no-store`                                                                                   |
| Membership options         | `CORE_API_TIMEOUT_MS`                           | none                                                                        | Next.js data cache, 300 s; `null` (form unavailable) on any failure                          |
| Membership application     | 90 s                                            | never                                                                       | not applicable                                                                               |
| SQU verification evidence  | 60 s                                            | never                                                                       | `no-store`                                                                                   |
| Membership status, `/me/*` | 10–15 s (photos and project images 30 s)        | never                                                                       | `no-store`                                                                                   |

`errors.ts` maps statuses to `not-found`, `unauthorized`, `forbidden`, `rate-limited`,
`unavailable` (any 5xx), `bad-status`, `invalid-response`, `timeout` and `network`. Pages only
distinguish "ok", "not found" and "unavailable". The finer kinds go to logs.

## Logging

Server reads log one JSON line per failure, or per request when `CORE_API_DEBUG=true`:
`{source:"core-api", route, status, latencyMs, requestId, kind, attempt}`. The route is a template
(`GET /events/{eventId}`), never a real ID or cursor. Keys, response bodies and visitor details are
never logged. An unconfigured deployment logs `{"source":"core-api","unconfigured":"<problem>"}`
once per server process.

## Direct Supabase access

The website uses Supabase **Auth only**, from the browser, with the public anon key:

- `signUp`, `signInWithPassword`, `resend`, `verifyOtp` and `setSession`;
- `getSession`, `signOut`, `resetPasswordForEmail` and `updateUser`.

It never queries Supabase tables or Storage, holds no service-role key and has no database
connection. Everything that touches data goes through Core, which verifies the access token with
Supabase (`auth.getUser`) and then applies its own database rules.

## Tests

**Tests** (not executed during this task):

- `tests/core-api/*.test.ts`: configuration, the client, schemas, the adapter, registration,
  membership, member projects, public projects, errors and event enhancements;
- `tests/data/*.test.ts`: the events data layer in core, unconfigured and development modes;
- `tests/member-auth/*.test.ts`: password rule, Auth links, errors, membership status,
  configuration and profile helpers;
- `tests/security/headers.test.ts`.
