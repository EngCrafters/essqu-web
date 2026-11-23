# Known gaps

Problems and open questions found while documenting the commit in [README](README.md#version-documented).
Nothing here was fixed as part of the documentation task. Each item says how it was established.

## Confirmed implementation issues and limitations

| #   | Finding                                                                                                                                                                                                                                                                                                              | Evidence                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | **Event data can be stale.** Event reads are cached for `CORE_EVENTS_REVALIDATE_SECONDS` (30 s by default) and nothing calls `revalidateTag`, even though the code tags responses for it. Core also sends `s-maxage=30, stale-while-revalidate=120` on event reads, so an edge cache in front of Core may add delay. | **Source** (`lib/core-api/client.server.ts`, `events.server.ts`); the edge effect is **Inferred** |
| 2   | **Event lists stop after five pages per period** (100 upcoming, 100 past). A truncated list is only logged.                                                                                                                                                                                                          | **Source** (`PAGE_LIMITS`)                                                                        |
| 3   | **The homepage projects section is static content** (`content/projects.ts`), separate from Core's published projects on `/projects`. The two can drift.                                                                                                                                                              | **Source**                                                                                        |
| 4   | **Sample data still appears on live pages**: `/disciplines` combines Core projects with sample members; `/about` shows a sample yearly record; the homepage society figures are demonstration values. Each is labelled on the page.                                                                                  | **Source**                                                                                        |
| 5   | **The retry rule is wider than its comment.** `isRetryable` retries any 5xx (`kindForStatus` maps every status ≥ 500 to `unavailable`), while the comments and module README say "503".                                                                                                                              | **Source** (`lib/core-api/errors.ts`)                                                             |
| 6   | **No browser end-to-end tests in this repository.** Cross-application browser suites live in Core (`tests/event-flow`, `tests/profile-flow`, `tests/project-flow`, `tests/admin-flow`).                                                                                                                              | **Source**                                                                                        |
| 7   | **Development Cycle 2 needs the new Core first** (Core ADRs 0025 and 0026). Committee-level leadership needs Core with migration 0034 (applied to staging on 2026-11-20): against an older Core the request form sends `teamId: null`, which it refuses. Against a Core or database without migration 0033 (staging was at schema 32 until 0033 was applied there on 2026-11-20), `/register` shows "The application form couldn’t be loaded" with Try again, and each profile card (SQU verification, committee leadership) shows its own error with a reference. | **Source** |
| 8   | **Verification and leadership decisions are not emailed.** Members see them on `/profile` at their next visit. | **Source**; Core ADR 0025 open decision 5 |

## Documentation inconsistencies

| #   | Where                                                  | Problem                                                                                                                                                                               |
| --- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Root `README.md`, "Run"                                | Says `npm run dev` shows sample events when `CORE_API_BASE_URL` is unset. There is no sample mode: event surfaces show "unavailable".                                                 |
| 2   | Root `README.md`, introduction                         | Says the site has no authentication of its own and that every non-event platform page runs on sample data. Member sign-in, profile, projects and submission are now real.             |
| 3   | Root `README.md`, "Coming soon"                        | Lists `/projects` as Coming Soon. It is active in `config/site-features.json`. It also points to `COMING_SOON` in `content/site.ts` as "the switch"; the switch is now the JSON file. |
| 4   | Root `README.md`, `lib/core-api/README.md`             | Link to `integration/INTEGRATION_ARCHITECTURE.md` and `integration/DEPLOYMENT_GUIDE.md`, which do not exist.                                                                          |
| 5   | `lib/core-api/README.md`                               | Describes `config.server.ts` as resolving `core`, `sample` or `unconfigured`; there are only two modes. It also omits the project and member modules.                                 |
| 6   | `integration/*.md`                                     | Dated reports that say "nothing pushed or deployed" and name feature branches that have since been merged. Treat them as history.                                                     |
| 7   | `package.json` `description`                           | Still says "landing page, Draft 2".                                                                                                                                                   |
| 8   | Core `docs/AUTH_AND_EMAIL.md` §9 versus `.env.example` | Core's guide suggests `http://localhost:3001` for the website in local development, while this repository's `.env.example` uses port 3001 for Core. Pick one convention.              |

## Unverified infrastructure settings

| #   | Setting                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Status                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1   | **Which Supabase project Production uses.** On 2026-10-24, the report-only CSP of `https://essqu.com` listed a Supabase origin whose project ID matches the project that Core's `docs/CURRENT_WORK.md` identifies as **staging**. Core's production pages referenced the same project. If intended, document it. If not, the website's `SUPABASE_URL`/`SUPABASE_ANON_KEY` and Core's Supabase and database variables need to point at the production project, together. | **Deployed** (read-only header check), intent **Unknown** |
| 2   | Vercel environment scopes for `essqu-web`: which variables exist in Production, Preview and Development, and when each deployment was created relative to variable changes.                                                                                                                                                                                                                                                                                             | **Unknown**: needs Vercel access                          |
| 3   | Production Supabase Auth settings: email sign-up and confirmation, minimum password length 8, redirect URLs for `/login` and `/reset-password` on every site origin, token-hash email templates. Core's documentation records staging as verified and production as not.                                                                                                                                                                                                | **Unknown**                                               |
| 4   | Core's production CORS allow-list. On 2026-10-22 a preflight to `/v1/me/membership` from `https://essqu.com` was allowed. Other origins (`www`, `essqu-web.vercel.app`) were not rechecked.                                                                                                                                                                                                                                                                             | Partly **Deployed**                                       |
| 5   | Preview deployments' Core and Supabase targets. Preview URLs require Vercel authentication, so they could not be inspected.                                                                                                                                                                                                                                                                                                                                             | **Unknown**                                               |
| 6   | The production `CORE_EVENTS_API_KEY` registration (environment, scope, expiry). Core's runbook records one active production client.                                                                                                                                                                                                                                                                                                                                    | **Unknown** here                                          |

## Missing features and incomplete flows

- `/members`, `/network` and `/certificates` (and their detail pages) are Coming Soon prototypes
  backed by sample records. No Core API exists for them.
- Core's event API publishes no event type, end time, capacity counts, programme, disciplines,
  Arabic text or attendance totals. The matching designs are present but hidden.
- Visitor and society statistics have no real data source.
- Social media links are unlinked until verified URLs are supplied (`content/social.ts`).

## Recommendations

These are suggestions, not decisions:

1. Correct the root `README.md` and `lib/core-api/README.md` items above and remove the dead links.
2. Resolve the production Supabase project question (item 1 above) with the owner, then record
   the intended mapping in Core's configuration reference.
3. If faster event updates are needed, add an authenticated revalidation hook. That needs a Core
   change to call it.
4. Add an `engines` field (Node 22) to `package.json` so local Node versions match CI.
5. Agree one local port convention for the two apps and update both repositories' examples.
