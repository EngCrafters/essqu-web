# Getting started

This guide takes you from a fresh clone to a running site, first on its own and then against a
local or staging Core. Commands come from [`package.json`](../../package.json) and were
**inspected, not executed**, during this documentation task.

## Prerequisites

- **Node.js 22.** CI uses Node 22 ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)).
  There is no `engines` field, so the exact minimum is not enforced. Next.js 16 needs Node 20.9
  or later.
- **npm.** The lockfile is `package-lock.json` (v3). Use `npm ci` for a clean, reproducible install.
- **A modern browser** with WebGL for the 3D scenes. The site falls back to still images without
  WebGL.
- **Optional:** a running Core (`engsoc-platform`) and its Supabase Auth project, for events,
  registration, membership, sign-in and the member profile.

## Install

```bash
npm ci          # or: npm install
```

## Configure

All configuration is environment variables that only the server reads. Copy the example and fill
in what you need:

```bash
cp .env.example .env.local
```

`.gitignore` ignores every `.env*` file except `.env.example`, so `.env`, `.env.local` and similar
files are never committed. Never paste real values into documentation, tickets or chat.

| Goal                                           | Set                                                                                      |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Work on the design and content pages only      | Nothing                                                                                  |
| Show Core events and accept registrations      | `CORE_API_BASE_URL`, `CORE_EVENTS_API_KEY`                                               |
| Enable sign-in, profile and project submission | Also `SUPABASE_URL`, `SUPABASE_ANON_KEY` (the same Supabase project as the Core you use) |

Every variable, its validation rules and its failure behaviour are in
[Configuration](../reference/configuration.md).

## Run

| Command             | What it does                                                                       |
| ------------------- | ---------------------------------------------------------------------------------- |
| `npm run dev`       | Development server on `http://localhost:3000` (`next dev`)                         |
| `npm run build`     | Production build (`next build`, Turbopack; includes type checking)                 |
| `npm start`         | Serves the production build                                                        |
| `npm run lint`      | ESLint over the repository                                                         |
| `npm run typecheck` | `tsc --noEmit`                                                                     |
| `npm test`          | Unit tests with Node's built-in runner (`tests/**/*.test.ts`), no extra dependency |

CI runs lint, type-check, unit tests and the production build on pushes and pull requests to
`main` and `staging`, with no secrets.

### What you should see

| Configuration                   | Behaviour (**Source**)                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nothing set                     | The landing page, archive, leadership, disciplines and prototype pages render. Event surfaces say events can't be shown right now. `/login` says sign-in isn't available. `/register` renders, but a submission ends in the "couldn't be sent" notice. Projects show the catalogue's error state. The server logs `{"source":"core-api","unconfigured":"missing-base-url"}` once. |
| Core variables set              | Published events, event registration, the membership form and published projects work, provided Core accepts the key and lists your origin in its CORS settings.                                                                                                                                                                                                                  |
| Core and Supabase variables set | Sign-in, the account menu, `/profile`, member event registration, attendance and `/projects/submit` also work.                                                                                                                                                                                                                                                                    |

There is **no sample-event fallback** in any environment
([`lib/core-api/config.server.ts`](../../lib/core-api/config.server.ts)). The root README's
statement that `npm run dev` shows sample events without Core is out of date.

## Run the site with Core

The site never talks to a database. To use real data locally, point it at a Core you are
allowed to use: a local Core on a disposable database, or staging. **Never point local
development at production.**

1. **Start Core on a port other than 3000**, because the website uses 3000. The website's
   example uses `http://127.0.0.1:3001/v1`, so for example run `npm run dev -- -p 3001` in
   `engsoc-platform`. Core's own setup is in its
   [getting started guide](https://github.com/EngCrafters/engsoc-platform/blob/main/docs/onboarding/getting-started.md).
2. **Set the website's Core variables** in `.env.local`:
   - `CORE_API_BASE_URL=http://127.0.0.1:3001/v1`. Plain `http` is accepted only for
     `localhost`, `127.0.0.1` and `[::1]`, and never when `VERCEL_ENV=production`.
   - `CORE_EVENTS_API_KEY`: an `essq_test_…` key registered in the database that this Core uses.
     A key is not just a string: Core stores its prefix and SHA-256 hash in
     `private.api_clients` with the `events:read` scope and the `staging` environment. See
     [Core configuration](https://github.com/EngCrafters/engsoc-platform/blob/main/docs/reference/configuration.md#api-clients-and-keys).
3. **Allow the website's origin in Core.** Core's `CORE_API_ALLOWED_ORIGINS` must contain the
   exact origin your browser shows, for example `http://localhost:3000`. `localhost` and
   `127.0.0.1` are different origins. Without this, every browser call (registration,
   membership, sign-in status, profile) fails as a network error.
4. **For sign-in**, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` to the same Supabase project as
   Core's `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. For confirmation and
   reset emails to come back to your machine, that project's redirect allow-list must contain
   `http://localhost:3000/login` and `http://localhost:3000/reset-password`. Only add local URLs
   to a non-production project.
5. Restart `npm run dev` after changing `.env.local`. The Core configuration is read once per
   server process.

The full cross-system checklist, including QR codes (`PUBLIC_WEBSITE_ORIGIN` in Core) and the
order of deployment, is in the
[system integration guide](https://github.com/EngCrafters/engsoc-platform/blob/main/docs/integration/system-integration.md).

## Testing on a phone

Run `npm run dev` and open the **Network** URL it prints on a phone on the same Wi-Fi.
`allowedDevOrigins` in [`next.config.ts`](../../next.config.ts) allows private network ranges in
development only, so the page hydrates. Browser calls to Core from a phone come from the phone's
origin (for example `http://192.168.x.x:3000`). Core must list that exact origin, and
`crypto.randomUUID` is unavailable on plain-HTTP LAN origins, so registrations from a phone send
no `X-Request-Id` ([`lib/core-api/registration.ts`](../../lib/core-api/registration.ts)).

## Development-only routes

`/dev/emblem` and `/dev/turntable` exist for capturing hero stills and project turntable videos.
Both return 404 when `NODE_ENV` is `production`. `scripts/capture-still.mjs` regenerates the hero
stills.

## Reviewing listing states

Any discovery listing accepts `?state=loading`, `?state=empty` or `?state=error` to preview that
state ([`components/discovery/Discovery.tsx`](../../components/discovery/Discovery.tsx)).

## Next steps

- Read [Architecture](../explanation/architecture.md).
- If something does not work, check
  [Deployment and troubleshooting](../how-to/deployment-and-troubleshooting.md).
