# Friend API migration report: `essqu-web` → `ESWebsite`

Date: 19 October 2026 · Branch: `migration/friend-api-integration` (from `feat/core-api-integration` at `da4f07c`) · Core (`engsoc-platform`): unchanged

**Result: migrated and verified against a synthetic Core. The real Core was only probed read-only, with no credentials.**

## 1. Starting point

| | `ESWebsite` (destination) | `essqu-web` (source) |
| --- | --- | --- |
| Design | Current design: GSAP, 3D scenes, timeline, registration panel and dialog, five Coming Soon modules | Older design (imported at the shared commit `17bdcc4`) |
| Core layer | `lib/core-api/`: config modes, server client (4 s timeout, one retry, 30 s Next.js cache with tags), schema validation, adapter to the site's view models, browser registration, 66 `node:test` tests | `lib/core-api/`: server reads (8 s timeout, `no-store`), validation, browser registration with 409 `reason`, a copy table, Vitest + Playwright, CI |
| Built against | The **local** Core checkout `feat/landing-integration-support` (`2202aef`) | The **deployed** Core, `origin/main` (`832b588`) |

The destination already had a fuller integration than the source, so this was a gap-closing migration, not a transplant.

## 2. Gap found: the deployed Core moved on

Core `origin/main` (live at `https://engsoc-platform.vercel.app/v1`) adds an optional `reason` to registration 409s (`1eac4db`): `already-registered`, `already-waitlisted`, `event-full`, `registration-closed`, `registration-available`. The `code` stays `conflict`, and older Core omits the reason. The destination treated every 409 as one generic message, so a visitor told "the event is full" had no way to join the waitlist without reloading the page.

## 3. What was migrated (adapted to the destination's own types and components)

| Change | Files |
| --- | --- |
| Parse the 409 `reason` (only on a conflict, only from the published vocabulary) and carry it on the conflict outcome | `lib/core-api/types.ts`, `schemas.ts`, `registration.ts` |
| Send a fresh `X-Request-Id` per registration so Core can correlate failures. Guarded: none on plain-HTTP origins, where `crypto.randomUUID` doesn't exist (the source would fail there) | `lib/core-api/registration.ts` |
| The panel follows Core's reason using **existing** states only: full → the dialog becomes the existing waitlist dialog (joined only by a second, explicit submit); a place is free → back to registering; closed → the existing closed state and a disabled submit; already registered or waitlisted → said plainly | `components/pages/events/RegistrationPanel.tsx` |
| After a 429 with `Retry-After`, a resubmit within the window is answered locally instead of being sent and refused again | same |
| Five new EN/AR messages; the general conflict message stays for older Core or an unknown reason | `lib/i18n/dictionaries/pages/events.ts` (additive) |
| Ignore every `.env*` except the example, plus `.vercel` (only `.env*.local` was ignored before) | `.gitignore` |
| Document the live pre-domain Core URL and Core's CORS allow-list requirement | `.env.example` |
| Tests: reasons, unknown reason, request-id format, end-to-end reason parsing | `tests/core-api/registration.test.ts`, `schemas.test.ts` |

No markup, CSS, layout, animation, route or asset changed.

## 4. Deliberately not migrated

| Source item | Why |
| --- | --- |
| `app/events/*`, `components/events/RegistrationForm*`, `components/sections/Events.tsx` | Old design. The destination's own pages are already wired to Core. |
| `NEXT_PUBLIC_CORE_API_BASE_URL` | The server passes `CORE_API_BASE_URL` to the panel, so one variable serves both uses and can't drift. A leftover value in the Vercel project is ignored. |
| `@vercel/oidc` preview token | Only needed for a Landing **preview** reading a **protected** Core preview alias. Core's staging alias has a protection exception, so bearer-key reads work there. The token can't be verified locally, and it would add a runtime dependency. Add it only if a protected Core preview must be read. |
| `/events?period=&cursor=` page links | Would need new UI. The destination reads up to 100 upcoming events and the 20 most recent past events. |
| Vitest, Playwright, Prettier, CI workflow, `next build --webpack` | The destination's tests run on `node:test` with no extra dependencies. The Playwright spec targets the old UI. Webpack was the friend's workaround for a Next 16.4.2 Turbopack font issue, and the destination is on 16.3.6. |
| Server-read `X-Request-Id` | Deliberately omitted by the destination (it would make every cache key unique). Core generates and logs one. |

## 5. Environment

No new variables. Production needs `CORE_API_BASE_URL=https://engsoc-platform.vercel.app/v1` (later `https://api.essqu.com/v1`) and the server-only `CORE_EVENTS_API_KEY`. **Core must list this site's exact origin in `CORE_API_ALLOWED_ORIGINS`.** Live Core currently allows `https://essqu-web.vercel.app` and `https://essqu.com`, but not `localhost`, and not any other Vercel domain this site might be deployed to.

## 6. Verification

| Level | Done | Result |
| --- | --- | --- |
| Static | typecheck, lint, `git diff --check`, production build (Turbopack) | All clean, in the project directory after cleanup |
| Unit | `npm test` | 70/70 (66 before) |
| Mocked API, real browser | Production build + synthetic Core v1 over HTTP (CORS, bearer check, every 409 reason, 422, 429 with `Retry-After`, 503) + Chrome | **67/67 checks.** The same suite on the baseline: 45 pass, all failures in the new behaviours (its two 404 checks used an incorrect status-code assumption, corrected before the final run) |
| Key exposure | Every browser response and request scanned, plus the built client bundle | Key absent (543 responses, 1,431 requests, 0 bundle hits). The browser talks to Core only for registration (`OPTIONS`/`POST`). |
| Local Core + temporary Postgres | Not run | — |
| Staging Core / Supabase | Not run (no staging key on this machine) | **Unverified** |
| Production Core | Read-only, unauthenticated probe only | `GET /v1/events` → documented 401 problem JSON. Preflight allows `X-Request-Id` and exposes `Retry-After`. No authenticated read and no registration was made. |

**Visual regression:** 14 pages (home, `/events`, four event-detail states, all five Coming Soon pages, `/profile`, `/profile/events`, `/about`) in English and Arabic at 1440 px and 390 px, captured with reduced motion and WebGL canvases masked. Baseline and migration builds are **pixel-identical (0 px) with an identical DOM on all 56 captures**. A first pass showed noise from footer logos that hadn't finished loading. The capture was fixed to wait for every image, and re-baselined before comparing. The new messages, which only appear after a 409, were checked by screenshot: they use the existing dialog title, button and error line, in correct RTL.

## 7. Coming Soon and inactive design protection

A SHA-256 manifest of 179 files was taken before any edit (the protected routes and their components, `components/platform`, `content/`, `styles/`, `public/`, `lib/data`, `lib/i18n`, the layout and shared sections). Afterwards, 178 were byte-identical. The one difference is the events copy file above (11 lines added, none changed). `/projects`, `/members`, `/network`, `/certificates` and `/register` still render Coming Soon. `/profile` is still the prototype. None of them sends any request to Core.

## 8. Cleanup of `essqu-web`

**Deleted** after the checks above. Before deletion: its history matched GitHub (`EngCrafters/essqu-web` `main` = `8d94a2b`), with no unpushed commits, no stashes and no ignored files. Nothing in the destination referenced it. Its only unique file, `ESSQU_TEAMMATE_UI_AGENT_MASTER_PROMPT.md`, was copied byte-for-byte to `ESSQU/` first. While present, the folder also broke this site's typecheck and lint, because the root `tsconfig`/ESLint globs picked up its Vitest and Playwright files.

## 9. Open items

1. **Upgrade Next.js to 16.4.2 in a separate change.** 16.3.6 is affected by GHSA-cjq9-62q9-8jv4 (high, SSRF in Image Optimization) and related advisories. `npm audit` also flags `sharp` and `source-map-js`. Re-run the visual comparison afterwards.
2. Staging verification with a staging-only key: an authenticated read, and one real registration against staging Core.
3. Add this site's deployed origin to Core's `CORE_API_ALLOWED_ORIGINS` (Core configuration, owned by Core).
4. Pre-existing, unchanged: an English title inside the Arabic "you're reserving a place at …" sentence puts the full stop on the wrong side (a bidi issue; isolating the title would fix it).
5. `integration/` docs are deleted in the working tree (uncommitted, by the owner's choice). `lib/core-api/README.md` and `.env.example` still link to two of them.
6. `next/font/google` downloads fonts at build time. One build here failed transiently on that download and passed on retry.

### Core data the design could use later (Core API change requests, not made here)

Core v1 publishes no event image, capacity or count, type, end time, programme or discipline. The destination keeps that design code dormant: `adapter.ts` sends empty values and the components hide those sections. Each would need a new optional field in Core's `Event` schema.
