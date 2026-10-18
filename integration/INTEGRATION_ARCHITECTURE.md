# Website ↔ Core API — integration architecture

Status: **implemented** on branch `feat/core-api-integration` (website) with two additive Core
changes on `feat/landing-integration-support` (engsoc-platform). Core API version: **v1**
(`engsoc-platform/docs/api/openapi.v1.yaml`, contract revision engsoc-platform `main` @ `15875f4`
plus the additive commits `e0c7b02` and `2202aef` listed in
[INTEGRATION_CHANGES.md](INTEGRATION_CHANGES.md)).

## 1. Who owns what

```text
essqu.com         this repository (ESWebsite): design, pages, copy, EN/AR, presentation of events
api.essqu.com     engsoc-platform /v1: events, availability, registrations and every rule about them
admin.essqu.com   engsoc-platform admin: committees create, publish and manage events
```

| Concern | Owner |
| --- | --- |
| Whether an event exists and is public; its title, description, date, place, committee | Core |
| Availability (`open` / `waitlist` / `closed`), capacity, waitlist order, duplicates, rate limits | Core |
| Accepting or refusing a registration | Core |
| Administrators, authentication, authorization, audit | Core (admin.essqu.com) |
| Layout, motion, 3D, copy, Arabic/English, RTL, SEO, accessibility | Website |
| Turning Core's data into the existing pages, and failing gracefully when Core is down | Website |

The website holds no database credential, no Supabase key, no admin credential and no second copy
of event data. It decides nothing about places, waitlists or duplicates.

## 2. Scope: what is connected and what is deliberately not

Core v1 publishes **events** (list, detail) and **registration**. Nothing else exists in the API
(no projects, members, certificates, statistics, disciplines or media).

| Website area | State | Why |
| --- | --- | --- |
| Homepage `#events` | **Connected** | Next upcoming events from Core |
| `/events` timeline | **Connected** | Past and upcoming events from Core |
| `/events/[slug]` and its registration panel | **Connected** | Event detail from Core; registration posts to Core |
| `/projects`, `/members`, `/network`, `/certificates`, `/register` | **Untouched (Coming Soon)** | Protected; `COMING_SOON` in `content/site.ts` unchanged |
| Detail pages under them (`/projects/[slug]`, `/members/[id]`, `/network/[id]`, `/certificates/[id]`) | Untouched | Sample prototypes of Coming Soon modules; no Core API exists for them |
| `/profile`, `/profile/events` | Untouched (sample prototype) | Core has no member accounts yet (UC-01 deferred) |
| `/disciplines` figures, `/about` yearly record, homepage society figures | Untouched (labelled sample/demo) | No Core endpoint; inventing figures is not allowed |
| Homepage projects, activities/archive, leadership, disciplines, overview | Untouched (editorial) | Society-curated content and photographs, not operational data |

## 3. Data flow

```text
Event reads (server-to-server)
  Browser ──► essqu.com (Next.js server component)
                 └─ lib/data ──► lib/core-api/events.server.ts
                                   └─ client.server.ts ──GET + Bearer key──► api.essqu.com/v1/events…
                                   ◄── JSON ── schemas.ts (validate) ── adapter.ts (view model)
              ◄── HTML (same components, same design)

Registration (browser-to-Core)
  Browser at essqu.com ──POST /v1/events/{id}/registrations (JSON, no key, no cookie)──► api.essqu.com
                       ◄── 201 confirmed | waitlisted, or problem+json ──
```

Why reads are server-side: they need the `events:read` key, which must never reach a browser.
Why registration is browser-side: it needs no secret, and Core's per-IP rate limit must see the
visitor's own address. Routing it through the website's server would make every visitor look
like one IP. This follows Core's handoff document exactly.

There is no website API route or proxy for Core.

## 4. Module structure

```text
lib/core-api/
  config.server.ts     environment → mode (core | sample | unconfigured), validated once
  client.server.ts     the only server-side fetch to Core (key, timeout, retry, cache, logs)
  events.server.ts     listCoreEvents('upcoming' | 'all'), getCoreEvent(id), getRegistrationBaseUrl()
  schemas.ts           runtime validation of v1 JSON
  adapter.ts           CoreEvent → EventView (events pages) / HomeEvent (homepage)
  registration.ts      browser: form checks, body, POST, outcome mapping (never retried)
  errors.ts, types.ts  error vocabulary; v1 wire types
lib/data/index.ts      getHomeEvents(), getEventsTimeline(), getEventPage(slug): Core or sample
content/platform/events.ts   EventView (shared view model) and the sample catalogue
```

Components keep their existing markup. They receive the same view model whether an event came
from Core or from the sample catalogue, and leave out any element whose data an event doesn't have.

## 5. Modes and environment

| Mode | Resolved when | Events | Registration |
| --- | --- | --- | --- |
| `core` | `CORE_API_BASE_URL` (ends in `/v1`; https, or http on loopback) **and** `CORE_EVENTS_API_KEY` | Core | browser → Core |
| `sample` | `next dev` with no base URL, or `CORE_API_MODE=sample`; **refused when `VERCEL_ENV=production`** | `content/` samples, labelled "Sample" | the in-tab prototype (nothing sent) |
| `unconfigured` | anything else, including a production deployment missing either variable | "can't be shown right now" | none |

Server-only variables: `CORE_API_BASE_URL`, `CORE_EVENTS_API_KEY`, `CORE_API_MODE`,
`CORE_API_TIMEOUT_MS` (default 4000), `CORE_EVENTS_REVALIDATE_SECONDS` (default 30),
`CORE_API_DEBUG`. None is `NEXT_PUBLIC_`. The browser learns only Core's public base URL, passed as
a prop to the registration panel. That address is the public API, not a secret.

## 6. Rendering, caching and freshness

- Pages were already rendered per request (the language cookie). That is unchanged: every route
  is still `ƒ (Dynamic)` in the build output.
- Core reads use the Next.js data cache: `fetch(..., { next: { revalidate: 30, tags } })`,
  following Core's guidance of at most 30 seconds. Tags: `core-events` (every read) and
  `core-event:{id}` (a detail read), for `revalidateTag` if a webhook is ever added.
- Within one request, React `cache` memoises the reads, so a page and its `generateMetadata`
  share one round of calls.
- Lists: upcoming events follow Core's opaque cursor for up to 5 pages (100 events); past events
  stop at the 20 most recent, which is more than the timeline shows before "Show earlier events"
  folds them. No per-card detail request (no N+1).
- "Today" for Core events is the server's real time, computed once per request and passed to
  client components, so server and browser agree on what is past. Sample events keep the
  prototype's fixed date (`lib/data/clock.ts`). Months are computed in Oman time.

## 7. Failure handling

| Situation | Behaviour |
| --- | --- |
| Core down, slow (4 s timeout), 5xx, or malformed JSON | Homepage section: "Events can't be shown right now". `/events`: the timeline's existing error state with a retry. Event page: breadcrumb and the same error state. Rest of the site unaffected. |
| Key missing, revoked or wrong scope (401/403) | Same as above, plus a log line. Never retried. |
| Unknown, draft or archived event | 404 page for events (`not-found.tsx`), as Core answers 404 for all three. |
| One malformed event in a list | That event is dropped and counted in a log line; the rest render. |
| Registration: 409 / 404 / 422 / 429 / 503 / network / CORS | A localized message in the dialog. Never retried; the button is disabled while pending. |

Retries: a GET is retried once on 503 or a dropped connection, never on 401/403/404 and never
after a timeout (that would double page latency). POSTs are never retried.

## 8. Authentication and security

- No visitor authentication exists or was added: Core has no member accounts yet, and public
  content needs none. Administrators use Core's own admin at `admin.essqu.com`; the website stores
  no admin credential and calls no admin endpoint.
- Server-to-server reads use Core's scoped API-client token (`essq_live_…`/`essq_test_…`, scope
  `events:read`). Core stores only a hash; rotation needs no downtime (Core handoff, "Key rotation").
- Registration sends `credentials: 'omit'` and exactly the three fields Core accepts. Core
  enforces exact-origin CORS (`https://essqu.com`, `https://www.essqu.com`; no wildcard, no
  `*.vercel.app`), validation, rate limits and duplicates.
- Logs carry route, status, latency, attempt and Core's request id, never the key, a body, or a
  visitor's name or email. Typed names and emails are discarded after a successful registration.

## 9. Localization

Core's text is single-language (whatever the committee typed). It is shown as written in both
English and Arabic. All interface copy around it (labels, states, errors, outcomes) exists in both
languages (`lib/i18n/dictionaries/en.ts`, `ar.ts`, `pages/events.ts`); the Arabic dictionary is
typed against the English one, so a missing translation fails the build. A Core committee name
that exactly matches a committee in `content/structure.ts` (English or Arabic) is shown with the
site's bilingual name; any other is shown as Core wrote it. RTL/LTR and direction-aware layout are
untouched; email inputs are `dir="ltr"` as on the membership form.

## 10. What the view shows for a Core event

Core v1 publishes `id, title, description, eventDate, location, committeeName, availability`.
The pages therefore show: title, summary (first paragraph), full description, date, start time,
location (when set), organising committee, availability badge, registration. They **leave out**
what Core does not publish and the sample design showed: event type chip, end time, seat bar and
capacity dial, attendance count, discipline chips and filters, programme, photographs, check-in
pass, "your events" and cancellation. Each element is simply absent; nothing is invented. Each
event keeps a decorative drawing chosen from its id (drawings are design assets, `aria-hidden`).
Recommended Core extensions that would bring those elements back are listed in
[API_ENDPOINT_MAPPING.md](API_ENDPOINT_MAPPING.md#gaps-and-recommended-core-extensions).
