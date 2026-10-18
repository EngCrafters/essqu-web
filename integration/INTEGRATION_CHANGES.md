# Integration changes

| Repository | Branch | Base | State |
| --- | --- | --- | --- |
| ESWebsite | `feat/core-api-integration` | `main` @ `dec0605` | committed locally (`23d9704`…), **not pushed** |
| engsoc-platform | `feat/landing-integration-support` | `main` @ `15875f4` | `e0c7b02` (code + tests), `2202aef` (docs); committed locally, **not pushed** |

The engsoc-platform checkout was on `feat/public-api-v1`, which had already been merged into
`main`; `main` also carried later fixes (`403` for a scope-less key, the cutover runbook, Next.js
16.4.2). The backend branch therefore starts from `main`.

## Website (ESWebsite)

### What changed, in short

- A single integration module, `lib/core-api/`, is now the only place that talks to Core.
- `lib/data` gained three Core-aware accessors (`getHomeEvents`, `getEventsTimeline`,
  `getEventPage`) that return Core events, sample events (sample mode) or `unavailable`.
- The homepage events section, `/events` and `/events/[slug]` read through them. Their
  components keep their markup and leave out any element whose data an event doesn't have.
- The registration panel registers for real with Core for Core events. It keeps the prototype,
  untouched, for sample events.
- New interface copy in English and Arabic for the new states.

### New files

| File | Purpose |
| --- | --- |
| `lib/core-api/types.ts` | Core v1 wire types (Event, EventList, Problem, registration) |
| `lib/core-api/schemas.ts` | Runtime validation of Core's JSON |
| `lib/core-api/errors.ts` | `CoreApiError`, status → kind, retry rule |
| `lib/core-api/config.server.ts` | Environment → `core` / `sample` / `unconfigured` |
| `lib/core-api/client.server.ts` | Server-side GET: key, timeout, retry once, data cache, logs |
| `lib/core-api/events.server.ts` | `listCoreEvents`, `getCoreEvent`, `getRegistrationBaseUrl` |
| `lib/core-api/adapter.ts` | Core DTO → `EventView` / `HomeEvent` |
| `lib/core-api/registration.ts` | Browser registration: checks, body, POST, outcomes |
| `lib/core-api/README.md` | Module guide |
| `.env.example` | Variable names and meanings (no values) |
| `tests/core-api/*.test.ts`, `tests/data/*.test.ts`, `tests/support/*` | Unit and data-layer tests (Node's built-in runner) |
| `integration/*.md` | These documents |

### Modified files

| File | Change |
| --- | --- |
| `content/platform/events.ts` | New `EventView` (the shared view model, optional fields for what Core doesn't publish); `PlatformEvent` now narrows it; `isSampleEvent` guard; header note |
| `content/events.ts` | New `HomeEvent` type for the homepage; header note |
| `lib/data/index.ts` | `getHomeEvents`, `getEventsTimeline`, `getEventPage`, `RegistrationTransport`; related events by committee for Core events. Sample accessors unchanged |
| `lib/format.ts` | `eventTimes`, `eventTimesIsolated` (start time alone when no end), `omanMonthKey` |
| `components/platform/registration.ts` | `isPast`/`eventStatus` take an optional `now` (defaults to the prototype date) and tolerate missing counts; `seatsTaken` returns `null` without capacity |
| `components/sections/Events.tsx` | Data from `getHomeEvents`; sample note only in sample mode; unavailable state; action label from Core availability; location row and type only when present |
| `app/(platform)/events/page.tsx` | Data from `getEventsTimeline`; real "today" for Core; figures and sample notice only when applicable; Core outage → the timeline's existing error state |
| `app/(platform)/events/[slug]/page.tsx` | Data from `getEventPage`; unavailable state; type chip, location, About, Programme, disciplines and sample notice only when present; organiser from Core's committee |
| `components/pages/events/EventsTimeline.tsx` | `now` prop; Oman-time months; type/discipline filters and seat bars only when the data exists |
| `components/pages/events/FeaturedEvent.tsx` | `now` prop; seat bar and location only when present |
| `components/pages/events/RegistrationPanel.tsx` | Split into `SampleRegistration` (the prototype, verbatim) and `CoreRegistration` (name/email form in the same dialog, POST to Core, every outcome, focus management) |
| `components/pages/events/Events.module.css` | Form field styles mirroring the membership form; `:only-child` rule that keeps the featured card's action at the end when there is no seat bar; focus ring for the confirmation |
| `lib/i18n/dictionaries/en.ts`, `ar.ts` | `events.actions`, `events.unavailable` |
| `lib/i18n/dictionaries/pages/events.ts` | Core registration copy: form labels, privacy line, field errors, outcomes (EN + AR) |
| `package.json` | `test` script (no dependency added) |

### Not modified, on purpose

`content/site.ts` (`COMING_SOON`), every page and component under `projects`, `members`,
`network`, `certificates`, `register`, `profile`, `ComingSoon.*`, the hero and 3D scenes, motion
(`ScrollReveals`, GSAP timelines), navigation, layout, global styles and tokens, all editorial
content (`content/projects.ts`, `activities.ts`, `structure.ts`, `stats.ts`, `disciplines.ts`,
media). `next.config.ts` is unchanged: Core publishes no images, so no remote image hosts are
needed yet.

### Dependencies

None added. Tests run on Node's built-in test runner with type stripping (Node ≥ 22.6);
`server-only` is handled by Next.js itself.

### Environment variables (all server-only)

| Variable | Required | Default |
| --- | --- | --- |
| `CORE_API_BASE_URL` | for Core mode | none (no hard-coded URL) |
| `CORE_EVENTS_API_KEY` | for Core mode | none |
| `CORE_API_MODE` | no (`sample` to force samples; refused on Vercel production) | resolved automatically |
| `CORE_API_TIMEOUT_MS` | no | 4000 |
| `CORE_EVENTS_REVALIDATE_SECONDS` | no | 30 |
| `CORE_API_DEBUG` | no | off |

## Backend (engsoc-platform)

Both changes are additive within v1 (Core's contract rules: no field removed, no type or code
meaning changed). No schema, migration, RLS policy, grant, routine or authentication change.

| File | Change | Why |
| --- | --- | --- |
| `lib/api/cors.ts` | `Access-Control-Expose-Headers: Retry-After, X-Request-Id` on responses to an allowed origin | Core's handoff tells the website to honour `Retry-After` on 429, but a cross-origin browser cannot read a non-safelisted header unless it is exposed. Verified end to end: the website now tells the visitor how long to wait |
| `lib/api/dto.ts` | `fieldErrorsFor()` maps `invalid_name` → `attendeeName`, `invalid_email` → `attendeeEmail`, `invalid_intent` → `intent` | The handoff says "422: show `errors[].field`", but a value rejected by the domain (for example a malformed email) returned 422 with no `errors`. Only the caller's own input is named; nothing about the event or other registrations |
| `app/v1/events/[eventId]/registrations/route.ts` | Passes those field errors into the 422 problem | As above |
| `tests/api-routes.test.ts`, `tests/api-contract.test.ts` | Tests for both behaviours, including that a refused origin gets no exposed headers and non-validation failures carry no field detail | Lock the contract |
| `docs/api/openapi.v1.yaml`, `docs/api/LANDING_HANDOFF_V1.md` | Document both behaviours and `CORE_API_ALLOWED_ORIGINS` for local development | Keep the published contract truthful |
| `.env.example` | Document `CORE_API_ALLOWED_ORIGINS` and `CORE_API_HOST_ENFORCEMENT`, which the code already read but the example omitted | Discoverability |

### Considered and deliberately not changed

- **Distinguishing "already registered" from "full" in the 409.** Core collapses them on purpose
  (no email enumeration). The website shows one honest message.
- **Publishing capacity or registration counts.** Core keeps them private by decision.
- **New event fields** (end time, type, disciplines, image, Arabic text, programme). Each needs an
  ADR and ER-diagram entry first, per Core's `CLAUDE.md`. Recommended in
  [API_ENDPOINT_MAPPING.md](API_ENDPOINT_MAPPING.md#gaps-and-recommended-core-extensions).

## Database migrations

**None created, none required by this work.** Core's own pending migration
`0024_api_clients.sql` (the API-client registry behind the server key) is already in Core's
`main` and is **not yet applied to production** (gate A of
`engsoc-platform/docs/api/PRODUCTION_CUTOVER_RUNBOOK.md`). The website's Core mode cannot work in
production until gates A and B (migration plus production API client) are done. See
[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).
