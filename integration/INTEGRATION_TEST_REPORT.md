# Integration test report

Date: 2026-10-18. Machine: Windows 11, Node 22.18.0, Google Chrome (system install).
Website: `feat/core-api-integration`. Core: `feat/landing-integration-support`.

## Summary

| Area | Result |
| --- | --- |
| Website typecheck, lint, production build, `git diff --check` | **Pass** |
| Website unit/data-layer tests (`npm test`) | **66 / 66 pass** |
| Website sample mode vs `main` (design preservation) | **46 / 46 pages identical HTML; 16 / 16 screenshots pixel-identical** |
| Core unit + API + database/RLS suites (`npm test`) | **397 pass, 1 skipped** (39 files + 1 skipped) |
| Core browser suite (`test:e2e`) | **43 pass, 1 skipped** |
| Core lint, typecheck, format, `db:check`, production build | **Pass** |
| **Both applications together, real browser, real Core, real PostgreSQL 17** | **Pass** (details below) |
| Staging / production Core | **Not executed** (no credentials; production gates not applied) |

## How the end-to-end environment was built

- **Database:** PostgreSQL **17.10** (prebuilt Windows binaries from the npm package
  `@embedded-postgres/windows-x64`), run from a temporary directory on `127.0.0.1` only. Nothing
  was installed system-wide. Docker is not available on this machine, so Core's harnesses were
  pointed at it through their supported `TEST_DATABASE_URL` option.
- **Core:** a disposable `essqu_e2e` database built the way Core's own `scripts/api-http-e2e.mjs`
  builds one: bootstrap SQL, **all 25 migrations**, the eight live committees, synthetic events
  (open, capacity-1, Arabic, past, draft, archived) and one `events:read` API client (staging
  environment). Core ran with `next dev -p 3001` on the restricted **`app_runtime`** login, with
  `CORE_API_ALLOWED_ORIGINS=http://localhost:3000`.
- **Website:** production build (`next start -p 3000`) with `CORE_API_BASE_URL=http://127.0.0.1:3001/v1`
  and the key. Browser: system Chrome driven by the Playwright installed in engsoc-platform.
- No staging, production or real personal data was used. All names and emails were synthetic
  (`@example.test`).

## Core API verified directly (real routes, real routines)

| Check | Result |
| --- | --- |
| `GET /v1/events` without a key | `401` |
| With the key | `200`, `Cache-Control: public, s-maxage=30, stale-while-revalidate=120` |
| Upcoming list | 3 events; draft and archived absent; `nextCursor: null` |
| `period=past` | the past event only |
| Detail: published / draft / archived | `200` / `404` / `404` |
| Fields returned | exactly `availability, committeeName, description, eventDate, id, location, title` |
| Preflight from `http://localhost:3000` | `204`, allow-origin echoed, `Content-Type, X-Request-Id` allowed |
| Domain-rejected email (`not-an-email`) | `422` with `errors: [{ field: "attendeeEmail", code: "invalid" }]` (new) |
| Exposed headers | `Access-Control-Expose-Headers: Retry-After, X-Request-Id` (new) |

## Website ↔ Core, server-rendered

| Check | Result |
| --- | --- |
| Homepage `#events` shows Core's three upcoming events, featured + "Also coming up" | Pass |
| No draft/archived/past event on the homepage; no "Sample" note; no sample event | Pass |
| Action labels follow availability ("Register", "Join the waitlist") | Pass |
| `/events`: all four events (past + upcoming); no sample notice or sample events; type/discipline filters absent (Core has no such data) | Pass |
| Event page: title, summary, About, committee linked to the site's Media Committee; no Programme section; no sample notice | Pass |
| Unmatched committee ("Forum Committee") shown as written; no Location row when Core sends none | Pass |
| Draft, archived and sample-slug addresses → event not-found view, `noindex`, no draft content | Pass (HTTP status 200, see risks) |
| Arabic: `dir="rtl"`, `lang="ar"`, Arabic labels, "اللجنة الإعلامية" | Pass |
| API key absent from all HTML | Pass |

## Website ↔ Core, in the browser

| Scenario | Result |
| --- | --- |
| Empty submit | Both field errors shown, **no request sent**, focus on the name field |
| Valid registration | "You're registered"; **database row `confirmed`**; focus moves to the confirmation |
| Request sent | `POST http://127.0.0.1:3001/v1/events/{id}/registrations`, body exactly `{attendeeName, attendeeEmail, intent}`, **no Authorization header, no cookie** |
| Same email again | Conflict message (Core's 409), no retry |
| Capacity-1 event: visitor A | Confirmed |
| Visitor B while the page is still cached as "open" | Conflict message (Core refused: full) |
| After the 30 s cache | Badge "Waitlist open"; B joins → "You're on the waitlist"; **database: A `confirmed`, B `waitlisted`** |
| Sixth attempt from the same IP (Core limit: 5 per 10 min) | `429`; **"…try again in 10 minutes"** (Retry-After read cross-origin), Arabic "…بعد 10 دقائق" |
| Arabic dialog | Labels "الاسم الكامل" / "البريد الإلكتروني", email field `dir="ltr"`, RTL layout |
| Phone (390 px) `/events` and event page | No horizontal overflow |
| API key in any document, script or fetch response from the website | **Not found** |
| Console | Only Chrome's network log of the expected 409 responses |

Screenshots reviewed: homepage events section, `/events`, event page, dialog, conflict, confirmation,
waitlisted (EN), dialog and event page (AR), `/events` and event page (phone).

## Failure modes

| Situation | Result |
| --- | --- |
| Core unreachable (connection refused) | Homepage renders with "Events can't be shown right now"; `/events` shows the timeline's error state with retry and no figures; event page shows the error state; no sample events. One retry, then give up |
| Wrong/revoked key (real Core → 401) | Same states; **not retried**; log line carries Core's request id, never the key |
| Production with no configuration | Same states; no request made; no sample events |
| Core hangs (accepts, never answers) | Homepage returned in **4.03 s** with the unavailable message (`kind: timeout`, not retried) |
| Malformed responses, dropped events, id mismatch, cursor paging, page limits | Covered by unit tests |

## Design preservation (sample mode vs `main`)

`main` and the branch (with `CORE_API_MODE=sample`) were built and served in turn. 23 routes ×
EN/AR = 46 pages were compared as normalised HTML (scripts, build hashes and React text markers
removed). The routes include `/`, `/events`, five event pages, `?state=empty|error`,
`?discipline=`, `/profile`, `/profile/events`, `/disciplines`, `/about`, `/activities`,
`/leadership`, `/projects/vision-sorting-arm`, and every Coming Soon page (`/projects`,
`/members`, `/network`, `/certificates`, `/register`). Result: **all 46 identical**, with the same
status codes.

16 full-page screenshots (desktop + phone × EN + AR × `/events`, two event pages, the homepage
events section) with reduced motion, after scrolling the page and waiting for every image and
font: **0 differing pixels**.

## Issues found and corrected during testing

| Issue | Fix |
| --- | --- |
| Four test UUIDs all got the same decorative drawing (weak low bits in the hash) | FNV-1a with an avalanche step |
| `getEventPage` passed Core's internal failure reason through to pages | Normalised to `{ status }` |
| After a successful registration focus was lost (the dialog returned it to a button that had just been removed) | Focus moves to the confirmation in an effect |
| Sample mode differed from `main` by 28–382 px: changed text-node runs ("Featured · Workshop", "time · location") nudged glyphs by a subpixel | Original text runs restored → 0 px |
| Tests: a sibling request still in flight after a test reached the real network | Between tests `fetch` is an offline stub |
| Core: `Retry-After` unreadable by the browser; 422 from domain validation carried no field | Backend changes (INTEGRATION_CHANGES.md) |
| A first screenshot comparison flagged footer logos | Lazy-image timing, not code: captures now wait for every image (main vs main showed the same noise) |

## Not executed, and why

- **Staging or production Core.** No credentials were provided. Production gates A–E (migration
  0024, production API client, DNS, Auth redirects, backup) are owner actions not yet taken. The
  production URL `https://api.essqu.com/v1` was therefore not exercised.
- **Vercel Preview / production deploys.** Not authorized; nothing was pushed or deployed.
- **Core's live staging suites** (`npm run test:integration`): require staging Supabase
  credentials.
- **Core's Docker-based harness as written:** Docker is unavailable. The same suites ran against a
  local PostgreSQL 17.10 through the harness's `TEST_DATABASE_URL` option, and Core's Playwright
  suite ran with the installed Chrome instead of Playwright's bundled Chromium (via a temporary
  config override; Core's config file is unchanged).
- **Other browsers** (Safari, Firefox), real touch devices, screen-reader walkthroughs and
  Lighthouse/performance audits.

## Remaining risks

1. **Per-IP rate limit and campus networks.** Core allows 5 registration attempts per IP per 10
   minutes. If many students register from one university NAT address, real attempts will be
   refused (the website shows the wait message correctly). This is a Core policy decision
   (engsoc-platform ADR 0005) worth reviewing before a popular event.
2. **Cache freshness.** Event reads are cached for up to 30 s, so a cancelled or newly full event
   can show its previous state briefly; Core still decides every registration. After a cache
   period, Next.js serves the last good response while refreshing, so during a Core outage the
   website may keep showing the last-known events for a while instead of the unavailable state.
3. **Not-found status code.** Unknown, draft and archived event addresses render the not-found
   page with `noindex` but HTTP 200, because the platform layout streams a loading state first.
   This is the same on `main` (pre-existing) and was left unchanged.
4. **Single-language Core text.** Titles and descriptions appear as the committee typed them in
   both languages until Core supports bilingual fields.
5. **Preview deployments can't register against production Core** (exact-origin CORS, by design).
   Use a staging Core with a stable staging origin.
