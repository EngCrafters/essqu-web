# lib/core-api — the website's only door to the Core platform

Events and registrations belong to the **Core platform** (`engsoc-platform`, `api.essqu.com`).
This module is the one place the website reads events from and sends registrations to. Pages and
components never call `fetch` for Core data; they read through `lib/data` (`getHomeEvents`,
`getEventsTimeline`, `getEventPage`), which uses this module.

Contract: Core's `docs/api/openapi.v1.yaml` and `docs/api/LANDING_HANDOFF_V1.md`. Architecture and
decisions: [`integration/INTEGRATION_ARCHITECTURE.md`](../../integration/INTEGRATION_ARCHITECTURE.md).

```text
Core API v1 JSON ─► schemas.ts (validate) ─► adapter.ts (view model) ─► lib/data ─► pages
        ▲
 client.server.ts (GET: key, timeout, retry once on 503, Next.js data cache)

Browser form ─► registration.ts ─► POST {CORE_API_BASE_URL}/events/{id}/registrations (no key, no cookie)
```

| File | Runs on | Does |
| --- | --- | --- |
| `config.server.ts` | server | Reads and validates the environment once: `core`, `sample` or `unconfigured`. |
| `client.server.ts` | server | The only server-side HTTP call to Core: bearer key, 4 s timeout, one retry on 503 or a dropped connection, Next.js caching (30 s, tags `core-events` / `core-event:{id}`), safe logging. |
| `events.server.ts` | server | `listCoreEvents('upcoming' \| 'all')`, `getCoreEvent(id)`, `getRegistrationBaseUrl()`. Never throw: failures become `unavailable`. |
| `schemas.ts` | both | Runtime validation of Core's JSON; a bad event is dropped, a bad envelope is `invalid-response`. |
| `adapter.ts` | server | Core DTO → `EventView` / `HomeEvent`. Presentation only; invents nothing. |
| `registration.ts` | browser | Form checks matching Core's, the request body, one POST, Core's answer → an outcome. Never retried. |
| `errors.ts`, `types.ts` | both | Error vocabulary; the v1 wire types. |

## Modes

| Mode | When | Events | Registration |
| --- | --- | --- | --- |
| `core` | `CORE_API_BASE_URL` (with `/v1`, production `https://api.essqu.com/v1`) and `CORE_EVENTS_API_KEY` set | Core | Browser → Core |
| `unconfigured` | anything else, including `next dev` with nothing set (the problem is logged once) | "Events can't be shown right now" | none |

There is no sample mode: the public event pages never show the sample catalogue, in any
environment. There is no hard-coded Core URL, no fallback to one, and no `NEXT_PUBLIC_` variable.

## Rules

- Core is authoritative: the website decides nothing about places, waitlists or duplicates, and
  shows nothing Core didn't send (no capacity, counts, type, end time, programme or images).
- The key is attached in `client.server.ts` only; registration carries no secret.
- Nothing logged contains the key, a response body or a visitor's details.

## Tests

`npm test` (Node's built-in runner, no extra dependency): `tests/core-api/*` and `tests/data/*`.
