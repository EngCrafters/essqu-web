# Live Core events and deployment to the `essqu-web` Vercel project

Date: 19 October 2026 · Branch: `migration/friend-api-integration` · Nothing pushed or deployed.

## Live API: `https://api.essqu.com/v1`

Checked read-only, without a key and without any registration:

- DNS resolves to Vercel. `GET /v1/events` answers with Core's own `401` problem JSON (`code: unauthorized`, `WWW-Authenticate: Bearer`, a request id), so the domain is connected to Core.
- The registration preflight allows `https://essqu.com`, `https://www.essqu.com` and `https://essqu-web.vercel.app`, accepts `X-Request-Id` and exposes `Retry-After`. It does not allow `localhost`.
- The live site (essqu.com) already sends browser registrations to `https://api.essqu.com/v1`; this URL is visible in its public page payload.
- Authenticated reads were **not** made: the production key isn't on this machine and wasn't requested.

## What the site does now

- **Events come from Core only.** The homepage section, `/events` (past and upcoming) and every event page show Core's published events. Without Core (not configured, or unreachable) they say events can't be shown right now. Sample events are **never** shown, including under `next dev`; the old `CORE_API_MODE=sample` is no longer read.
- Homepage cards show the title, description, date and time in Oman time, location, the organising committee, Core's availability and a link to the event page.
- `/events` follows Core's cursor for past events too (up to 100 per period; a longer list is logged).
- `/disciplines` no longer shows per-discipline counts of sample events. That ledger line returns when a real count is passed.
- Registration runs from the event page's dialog, straight to Core: confirmed, waitlisted, every Core refusal reason, field errors, the 429 retry window and an unavailable state, in English and Arabic.
- Kept for later, not deleted: the sample records (still used by the prototype profile pages), the "Sample" labels, and the prototype registration with its seat gauge and check-in pass.

Verified against the three events Core publishes today. They were copied from the live site's public pages and served locally from a Core stand-in, because the production key isn't available here.

## Deploying to the existing Vercel project

**Environment variables (Production).** No new variables are needed, and no secret changes.

| Variable | Needed | Value |
| --- | --- | --- |
| `CORE_API_BASE_URL` | yes, server | `https://api.essqu.com/v1`. Confirm in the dashboard: this site uses it for reads **and** registration. |
| `CORE_EVENTS_API_KEY` | yes, server only | The existing key, unchanged. |
| `NEXT_PUBLIC_CORE_API_BASE_URL` | not read by this site | Leave it as is (harmless). |

**Preview.** For events on a Preview deployment, set Preview-scoped `CORE_API_BASE_URL` to the staging Core (`https://engsoc-platform-git-staging-eng-crafters.vercel.app/v1`) with a **staging** `events:read` key. Never use the production key. Without these, Preview shows the "can't be shown" state rather than samples. Registration on Preview works only from an origin listed in staging Core's `CORE_API_ALLOWED_ORIGINS` (the friend used `https://essqu-web-git-staging-eng-crafters.vercel.app`, the `staging` branch alias).

**Build.** Framework is Next.js with the default `npm run build` (Turbopack). It also builds with `next build --webpack`, in case the project overrides the command. Next.js 16 needs Node 20.9 or later.

**Git connection.** The project deploys from `EngCrafters/essqu-web`, but this site lives in `s3q/ESWebsite`. Each option below needs your approval:

1. Push this branch to `EngCrafters/essqu-web` as a new branch. Vercel builds a Preview, and production changes only when it is merged to `main`. The two histories share commit `17bdcc4`.
2. Reconnect the Vercel project to `s3q/ESWebsite`.
3. Deploy with the Vercel CLI. **Remove the local `essqu-web/` reference clone first:** the CLI uploads untracked files, and that folder breaks this site's TypeScript check.

**Before production**

- Next.js: the live site runs 16.4.2 and this site 16.3.6, so deploying downgrades the framework. 16.3.6 is affected by GHSA-cjq9-62q9-8jv4 (high, SSRF in Image Optimization) and related advisories. Several of those target self-hosting, but upgrading `next` and `eslint-config-next` to 16.4.2 first is recommended.
- Core content: two published past events look like test entries ("robtics", whose description is "kdshkdhskhfkdshkhdshkihsdfk", and «حفل استقبال الصعايدة٢», whose description links to `/admin/access`). The upcoming "Engineering Society Networking Evening" is set to **06:00** Oman time (`02:00Z`). The site shows what Core publishes, so check these in Core admin.

## Core fields that would switch on existing designs (requests, not changes)

The designs below are in the code today and hidden because Core v1 doesn't publish their data. Each would need a new optional field on Core's `Event`:

| Design waiting in the site | Field Core would need |
| --- | --- |
| Event photograph (instead of the generated drawing) | `image` (URL and alt text) |
| Event type label and the timeline's type filter | `type` (`workshop`, `talk`, `site-visit`, `competition`) |
| Time range and end time | `endDate` |
| Seat gauge, "N of M seats left", "open" counts | `capacity`, `registeredCount`, `waitlistCount` |
| Programme on the event page | `schedule[]` (`time`, `title`) |
| Discipline chips, the timeline's discipline filter, `/disciplines` event counts | `disciplines[]` |
| "Part of" activity link | `activityId` |
| Arabic title and description (Core text is single-language today) | `titleAr`, `descriptionAr` |
| Attendance on finished events | `attendedCount` |
