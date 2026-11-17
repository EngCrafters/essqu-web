# Deployment and troubleshooting

## How the site is deployed

**Inferred** from repository documents and the deployed site; the Vercel project settings cannot
be read from the repository:

- The site deploys to the Vercel project `essqu-web`, connected to `EngCrafters/essqu-web`.
- A push or merge to `main` creates a Production deployment. Other branches, such as `staging`,
  create Preview deployments.
- **Deployed** (2026-10-22): Preview aliases redirect to Vercel authentication.
- **Deployed** (2026-10-22 and 2026-10-24, read-only requests): `https://essqu.com` serves the
  site, and `https://www.essqu.com` redirects to it with 308. `https://essqu-web.vercel.app` also
  serves it.

Build settings:

- Framework preset Next.js, build command `npm run build` (Turbopack).
- CI ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)) runs lint, type-check, unit
  tests and the build with no secrets. CI is a check, not a deployment step.

## Deployment checklist

1. **Core first.** If the change relies on a new Core endpoint or field, deploy Core first and
   confirm it on the target environment. Core's release gate refuses a production build when its
   database is older than its code. See the
   [integration guide](https://github.com/EngCrafters/engsoc-platform/blob/main/docs/integration/system-integration.md#deployment-order-and-compatibility).
2. **Variables per scope.** In Vercel → Project `essqu-web` → Settings → Environment Variables,
   check that each scope (Production, Preview, Development) has:
   - `CORE_API_BASE_URL` (Production `https://api.essqu.com/v1`);
   - `CORE_EVENTS_API_KEY` (sensitive), registered in the matching Core database;
   - `SUPABASE_URL` and `SUPABASE_ANON_KEY`, from the same Supabase project as that environment's
     Core.

   A variable added only to Preview does not reach Production.

3. **Redeploy after any variable change.** A deployment keeps the variables it was built with.
4. **Core settings that must match this site's origin:**
   - Core's `CORE_API_ALLOWED_ORIGINS` lists every origin the site is served from:
     `https://essqu.com`, `https://www.essqu.com` if it is not redirected,
     `https://essqu-web.vercel.app`, and the Preview origin for staging.
   - Core's `PUBLIC_WEBSITE_ORIGIN` is the site origin used in QR codes.
   - The Supabase redirect allow-list contains `<origin>/login` and `<origin>/reset-password`.
5. **Smoke test** after deployment:
   - the homepage events section and `/events` show events;
   - an event page opens;
   - `/login` shows a form;
   - `/register` shows the form;
   - `/projects` loads.

   Write tests (registrations, applications) need synthetic data and the owner's approval on
   production.

## Rollback

Vercel can promote an earlier deployment (Deployments → … → Promote / Instant Rollback). This is
**unverified for this project**: no rollback has been recorded in the repository. The website has
no database, so a rollback only changes code and the variables baked into that deployment. If Core
changed its contract, check compatibility before rolling the website back.

## Troubleshooting

### "Sign-in isn't available right now. Please try again later." on `/login`

**Cause** (**Source**): `getMemberAuthConfig()` returned `null` on the server, so no form rendered.
The message appears before anything is submitted. It is unrelated to the Core API key, CORS or
Supabase redirect settings.

**Check in Vercel**, without copying values anywhere:

1. The Production scope has both `SUPABASE_URL` and `SUPABASE_ANON_KEY` under exactly these names.
   Core's `NEXT_PUBLIC_SUPABASE_*` names do not work here.
2. `SUPABASE_URL` is `https://<project-ref>.supabase.co` with no path (`/auth/v1` and `/rest/v1`
   are rejected), no query and no surrounding quotes.
3. `SUPABASE_ANON_KEY` is the anon or publishable key: at least 20 characters from
   `A–Z a–z 0–9 . _ -`, with no quotes or spaces inside.
4. The latest Production deployment was created **after** the variables were saved. If not,
   redeploy.

If the form renders but signing in fails with "Sign-in couldn't be completed", the problem is in
the browser-to-Supabase request. Check the browser's network panel, the Supabase project status
and the CSP report-only console messages.

### Signed in, then immediately signed out again

`GET /me/membership` answered 401: Core could not verify the token. The website's Supabase
variables point to a **different project** from Core's `NEXT_PUBLIC_SUPABASE_URL`. Make them the
same project and redeploy.

### "Your membership status couldn't be loaded right now"

Core's `/me/membership` failed: unreachable, 503, or blocked by CORS. Check that Core lists the
site's exact origin in `CORE_API_ALLOWED_ORIGINS`, and that Core's
`NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` are set. Core returns 503 when it cannot reach Supabase Auth.

### Events "can't be shown right now"

1. Server logs (Vercel → Deployment → Logs) show one line `{"source":"core-api","unconfigured":…}`
   when configuration is missing or invalid:
   - `missing-base-url`;
   - `invalid-base-url` (no `/v1`, a query, credentials);
   - `insecure-base-url` (http in production);
   - `missing-api-key`;
   - `invalid-api-key` (whitespace).
2. Otherwise each failed read logs `kind`:
   - `unauthorized`: the key is not registered, revoked, expired, or for the wrong environment;
   - `forbidden`: the key lacks `events:read`, or an origin was refused;
   - `timeout`, `network` or `unavailable`: Core down, or its database unreachable;
   - `invalid-response`: a contract mismatch.

   Each line carries Core's `requestId` for correlation with Core's logs.

3. `GET https://api.essqu.com/v1/health` returns `{"data":{"status":"ok"}}` when Core and its
   database are compatible.

### Registration or application says "can't be done right now"

Usually CORS: the browser blocks the request when Core does not list the page's exact origin.
The browser console shows a CORS error. Other causes:

- Core 503: no trusted client IP, or the database is down;
- a 429 rate limit (the UI says so separately);
- a Preview deployment pointed at production Core, or the reverse.

### Profile photo, event cover or project image does not load

- Event covers and published project images go through `/media/...` on the site. A 404 means Core
  answered 404 or Core is not configured. A 502 means Core sent a non-image or something larger
  than 3 MiB. A 503 means Core or its storage is unavailable.
- Private images (drafts, own photo) are fetched by the browser from Core with the member's
  token. Check CORS and that Core's storage buckets are configured
  (`SUPABASE_S3_*`; see Core's [storage reference](https://github.com/EngCrafters/engsoc-platform/blob/main/docs/reference/storage.md)).

### Confirmation or reset email opens the wrong page or says the link is invalid

- The Supabase redirect allow-list must contain this site's `/login` and `/reset-password` for
  this origin.
- The email templates must use the `{{ .RedirectTo }}?token_hash=…&type=…` shape. A template
  hard-coded to Core's `/auth/callback` sends members to the dashboard's reset page.
- Mail scanners can consume a single-use link. Request a new one.

These settings affect emails only. They never cause the `/login` "isn't available" message.

### Build fails

- `config/site-features.json: …`: a typo or missing key in the feature file.
- A type error after adding an English string means the Arabic translation is missing.
- Font download errors: `next/font/google` needs network access during the build. Retry.
