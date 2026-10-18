# Deployment guide — website + Core API

Target layout (engsoc-platform ADR 0016):

```text
essqu.com        → ESWebsite (separate Vercel project)
www.essqu.com    → 308 redirect to essqu.com
api.essqu.com    → engsoc-platform /v1   ┐ same Vercel project
admin.essqu.com  → engsoc-platform admin ┘
```

No secret values appear in this guide or in either repository. Keys are issued by the Core owner
and installed directly in Vercel.

## 1. Local development

### Website only (no Core)

```bash
cd ESWebsite
npm install
npm run dev            # http://localhost:3000: sample events, labelled "Sample"
```

With no `CORE_API_BASE_URL`, `next dev` uses the sample catalogue and the in-tab registration
prototype, exactly as before the integration.

### Website + a local Core

You need PostgreSQL 17 for Core: Docker Desktop (Core's test harness starts it) or any local
PostgreSQL 17 reachable on loopback.

1. **Core database.** Apply every migration in `engsoc-platform/db/migrations/` to a disposable
   local database, the same way Core's harness does (`tests/db/global-setup.ts`, or
   `scripts/api-http-e2e.mjs` with its `scripts/api-http-e2e-bootstrap.sql`). Give the
   `app_runtime` role a login password. Insert test events through Core's admin or as fixtures.
   **Never point this at staging or production.**
2. **A local API client** with the `events:read` scope (Core runbook, gate B, applied to your
   *local* database):

   ```sql
   insert into private.api_clients (name, key_prefix, key_hash, environment, scopes, active)
   values ('Local website', '<prefix>', '<sha256 of the full token>', 'staging', '{events:read}', true);
   ```

   Token format `essq_test_<prefix>_<32+ base64url chars>` (`essq_test_` = staging environment).
3. **Start Core on port 3001** (the website uses 3000):

   ```bash
   cd engsoc-platform
   APP_RUNTIME_DATABASE_URL=postgres://app_runtime:<password>@127.0.0.1:<port>/<db> \
   CORE_API_ALLOWED_ORIGINS=http://localhost:3000 \
   NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder \
   npx next dev -p 3001
   ```

   `next dev` matters: in development Core attributes local requests to `127.0.0.1` for its rate
   limiter. A production build trusts only Vercel's `x-vercel-forwarded-for` and refuses local
   registrations (fail-closed, by design). `GET http://127.0.0.1:3001/v1/events` without a key
   must answer `401`.
4. **Start the website** with `.env.local`:

   ```bash
   CORE_API_BASE_URL=http://127.0.0.1:3001/v1
   CORE_EVENTS_API_KEY=essq_test_<prefix>_<secret>
   ```

   then `npm run dev` (or `npm run build && npm start`). Open `http://localhost:3000` (use
   `localhost`, not `127.0.0.1`, so the browser's Origin matches Core's allowlist).

## 2. Environment variables

### Website (Vercel project: ESWebsite). All server-only, never `NEXT_PUBLIC_`

| Variable | Production | Preview | Notes |
| --- | --- | --- | --- |
| `CORE_API_BASE_URL` | `https://api.essqu.com/v1` | staging Core `/v1`, or unset with `CORE_API_MODE=sample` | must end in `/v1`; https only off-loopback |
| `CORE_EVENTS_API_KEY` | production key (`essq_live_…`), **Sensitive** | staging key (`essq_test_…`) | `events:read` scope only |
| `CORE_API_MODE` | unset | `sample` if no staging Core | `sample` is refused on Vercel production |
| `CORE_API_TIMEOUT_MS` | unset (4000) | unset | optional |
| `CORE_EVENTS_REVALIDATE_SECONDS` | unset (30) | unset | ≤ 30 per Core guidance |

Missing or invalid configuration in production gives an honest "events can't be shown right
now" on the event surfaces. It never falls back to sample events, and the rest of the site works.

### Core (Vercel project: engsoc-platform), as relevant to the website

| Variable | Value |
| --- | --- |
| `CORE_API_ALLOWED_ORIGINS` | unset in production (defaults to `https://essqu.com,https://www.essqu.com`); a staging Core lists the staging website's exact origin |
| `CORE_API_HOST_ENFORCEMENT` | `true` only after all hostnames are attached and verified (runbook gate C) |

Never give the website `DATABASE_URL`, `APP_RUNTIME_DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` or
any Core admin credential.

## 3. CORS and security

- Registration is a browser POST from `essqu.com` to `api.essqu.com`. Core allows **exact**
  origins only (no wildcard, no `*.vercel.app`). A Vercel preview URL of the website is therefore
  refused by production Core. Use a staging Core whose `CORE_API_ALLOWED_ORIGINS` lists a stable
  staging website hostname.
- If `www.essqu.com` only redirects, it never sends registrations; keeping it in the allowlist is
  harmless.
- The events key is read server-side only. Verify after deploy: it must not appear in page
  source, JavaScript chunks or build logs. Rotate it if it ever does (Core handoff, "Key rotation":
  create the new client, install, deploy, verify, revoke the old one).
- Registration requests carry no credentials (`credentials: 'omit'`) and no key.

## 4. Deployment order

Core goes first and is verified on its own; the website switches last
(`engsoc-platform/docs/api/PRODUCTION_CUTOVER_RUNBOOK.md`, "Release order").

1. **Core:** merge `feat/landing-integration-support` to `main` (CI + Vercel deploy). Additive
   and safe before anything else.
2. **Core gate A:** apply migration `0024_api_clients.sql` to production (owner action, after the
   gate E backup decision). `GET /v1/events` with a bogus key turns `503` → `401`.
3. **Core gate B:** create the production API client "ESSQU Landing Production", scope
   `events:read`; hand the token to the website's Vercel project as `CORE_EVENTS_API_KEY`
   (Sensitive, Production only).
4. **Core gate C:** attach `api.essqu.com` (then `admin.essqu.com`), verify, then
   `CORE_API_HOST_ENFORCEMENT=true`. Gate D (Auth redirect origins) follows the runbook.
5. **Website Preview:** deploy `feat/core-api-integration` to Preview with a staging Core (or
   `CORE_API_MODE=sample`). Check events, an event page, Arabic, phone width, and a
   **staging-only** registration.
6. **Website Production:** set `CORE_API_BASE_URL=https://api.essqu.com/v1` and the key, merge to
   the production branch, deploy.
7. **Smoke test** (section 5), then watch logs.

Rollback: unsetting `CORE_API_BASE_URL` on the website shows the unavailable state on event
surfaces only; redeploying the previous website build restores the sample prototype. Core
rollback steps are in its runbook. Nothing on the website side touches data.

## 5. Final verification (production)

- [ ] `https://api.essqu.com/v1/events` without a key → `401`; with the key (server side) → `200`
- [ ] Homepage `#events` shows published events; no "Sample" label anywhere on event surfaces
- [ ] `/events` timeline: past and upcoming in the right places; "Today" is today
- [ ] An event page renders; a draft/archived id shows the event not-found page
- [ ] Arabic (`ع`/العربية): `dir="rtl"`, Arabic labels and states
- [ ] Phone width: no horizontal scroll
- [ ] Browser devtools: the registration POST goes to `api.essqu.com`, carries no Authorization
      header and no cookie, preflight allowed for `https://essqu.com`
- [ ] Do **not** register test people against production data. Verify registration on staging
      only, or with the owner's agreement and immediate cleanup through admin.
- [ ] Page source / JS contains no `essq_live_` string
- [ ] Coming Soon pages (`/projects`, `/members`, `/network`, `/certificates`, `/register`)
      unchanged
- [ ] Website logs: no repeated `{"source":"core-api",…,"kind":…}` failure lines
