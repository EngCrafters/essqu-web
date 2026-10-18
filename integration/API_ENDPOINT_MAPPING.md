# API endpoint mapping

Core API v1 base: `CORE_API_BASE_URL` (production `https://api.essqu.com/v1`). Every endpoint below
was verified against the Core source (`engsoc-platform/app/v1/**`, `lib/api/*`, `lib/events`,
`lib/registrations`, migration `0007_uc02_public_event_reads.sql`), not only its documentation.

## Feature → endpoint

| Frontend feature | API endpoint | Method | Integration location | Status |
| --- | --- | --- | --- | --- |
| Homepage `#events`: featured + "Also coming up" (up to 4) | `/events?period=upcoming` | GET (server, Bearer key) | `components/sections/Events.tsx` ← `getHomeEvents()` ← `listCoreEvents('upcoming')` | **Integrated** |
| `/events` timeline, hero featured card and hero figures | `/events?period=upcoming` (≤ 5 pages) + `/events?period=past` (1 page) | GET (server) | `app/(platform)/events/page.tsx` ← `getEventsTimeline()` ← `listCoreEvents('all')` | **Integrated** |
| `/events/[slug]` detail and metadata | `/events/{eventId}` | GET (server) | `app/(platform)/events/[slug]/page.tsx` ← `getEventPage()` ← `getCoreEvent()` | **Integrated** |
| `/events/[slug]` related events | (reuses the cached timeline list) | none extra | `getEventPage()` → `relatedTo()` (same committee) | **Integrated** |
| Registration / join waitlist | `/events/{eventId}/registrations` | POST (browser, no key, no cookie) | `components/pages/events/RegistrationPanel.tsx` → `lib/core-api/registration.ts` | **Integrated** |
| Registration CORS preflight | `/events/{eventId}/registrations` | OPTIONS (browser, automatic) | — | **Integrated** (Core allowlist) |
| Cancel registration, "your events", check-in pass | — | — | prototype only (sample events) | **Not available in Core v1** |
| Member profile, attendance (`/profile`, `/profile/events`) | — | — | sample prototype | **Not available** (Core UC-01 deferred) |
| Projects, members, graduates, certificates | — | — | Coming Soon pages | **Not in scope** (protected; no API) |
| Society figures, disciplines figures, yearly record | — | — | labelled demo/sample content | **Not available** (no endpoint) |

No admin or write endpoint is called; Core v1 has none for the public.

## Field mapping (Core `Event` → site view model)

| Core field | Type | `EventView` (events pages) | `HomeEvent` (homepage) | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | `slug` (the URL: `/events/{id}`) | `id` | Non-UUID addresses are 404 without a request |
| `title` | string | `title` `{en, ar}` = same text | `title` | Single-language text shown as written in both locales |
| `description` | string | `summary` = first line (≤ 280 chars, else shortened); `about` = remaining lines (or all, if shortened) | `description` = summary | Every non-empty line is a paragraph, matching Core's own pre-wrapped rendering |
| `eventDate` | ISO 8601 + offset | `start` | `start` | Start only; shown in Oman time; `end` absent → start time alone |
| `location` | string \| null | `location` or `null` → location row/segment omitted | same | |
| `committeeName` | string | `organizer` (site committee id) if it exactly matches a `content/structure.ts` committee (EN or AR), else `organizerName` | — | No fuzzy matching |
| `availability` | `open` \| `waitlist` \| `closed` | `registration` | `registration` | Drives the status badge and the action; past events show "Completed" |
| — | — | `type`, `end`, `capacity`, `registered`, `waitlist`, `attended`, `image`, `activity`, `disciplines` (`[]`), `schedule` (`[]`) | `type`, `end` | Not published by Core: left out, never invented |
| — | — | `drawing` | `drawing` | Design asset chosen from the id |
| — | — | `sample: false` | `sample: false` | Hides every "Sample" label and notice |

## Registration request and outcomes

Request body (exactly; Core rejects any other key, including an IP address):

```json
{ "attendeeName": "…", "attendeeEmail": "…", "intent": "register" | "join_waitlist" }
```

| Core response | Website outcome | Shown to the visitor (EN; AR equivalents in `pages/events.ts`) |
| --- | --- | --- |
| `201 { data: { status: "confirmed" } }` | confirmed | "You're registered" + "Your place is confirmed under the name and email you entered." |
| `201 { data: { status: "waitlisted" } }` | waitlisted | "You're on the waitlist" + waitlist-order note |
| `409 conflict` | conflict | "This registration couldn't be completed. You may already be registered…, or the last place or registration may have just closed. Refresh…" |
| `422 invalid-fields` (+ `errors[].field`) | invalid | Field marked, "Check your name and email, then try again." |
| `404 not-found` | not-found | "This event is no longer open for registration." |
| `429 rate-limited` (+ `Retry-After`) | rate-limited | "Too many registration attempts… try again in N minutes" |
| `503`, `400`, `403`, `413`, `415`, network, timeout, CORS refusal | unavailable | "Your registration couldn't be confirmed just now. Please try again in a moment." |

Core deliberately collapses already-registered / already-waitlisted / full / closed into one
`conflict` code (it must not confirm that an email is registered). The website therefore shows one
honest message for all of them rather than guessing which.

## Event read errors

| Core response | Website result |
| --- | --- |
| `200` valid | rendered |
| `200` malformed envelope | `unavailable` (logged `invalid-response`) |
| `200` with one malformed event | that event dropped (logged count), the rest rendered |
| `404` (detail) | event not-found page |
| `401` / `403` | `unavailable` (logged; key problem), not retried |
| `503` / dropped connection | retried once after 300 ms, then `unavailable` |
| timeout (4 s) | `unavailable`, not retried |

## Gaps and recommended Core extensions

Each item needs an ADR and an ER-diagram entry in Core before any schema change
(engsoc-platform `CLAUDE.md`: "Never add a column or table that isn't backed by a written
decision"). None was added here. All would be additive within v1 (new optional fields).

| Gap | Website element waiting for it | Suggested v1-compatible addition |
| --- | --- | --- |
| Event end time | time range on cards, detail and homepage | optional `endDate` |
| Event type | type chip, type filter, homepage "Featured · Workshop" | optional `type` from a fixed vocabulary |
| Disciplines | discipline chips and filter; Disciplines page event counts | optional `disciplines[]` (the site's ids) |
| Event image | photographs on cards and detail (drawings stand in) | optional `image { url, width, height, alt }` + `images.remotePatterns` for its host |
| Bilingual title/description | Arabic/English versions of Core text | optional `titleAr` / `descriptionAr` |
| Programme | detail "Programme" section | optional `schedule[]` |
| Seats/capacity display | seat bar, capacity dial | Core keeps capacity and counts private **by decision**; only an owner decision could publish e.g. a coarse "places left" |
| Cancel registration; "my events" | panel actions, `/profile/events` | needs member accounts (UC-01) or a signed cancellation link |
| Projects, members, certificates, statistics APIs | Coming Soon modules; society figures | future use cases (UC-01, UC-03–UC-07) |
