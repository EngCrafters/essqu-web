# Configuration

Everything the website reads from the environment, plus the feature-flag file. The variables were
found by searching `process.env` and `env.` in `app/`, `lib/`, `components/` and `next.config.ts`,
and cross-checked against [`.env.example`](../../.env.example), CI and the tests (**Source**).

None of these variables is browser-exposed by name: there are no `NEXT_PUBLIC_` variables. Three
values are passed to the browser as props on purpose, because they are public by design:
`CORE_API_BASE_URL`, `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

## Summary

| Variable                         | Required                           | Secret               | Read at           | Read by                                                       |
| -------------------------------- | ---------------------------------- | -------------------- | ----------------- | ------------------------------------------------------------- |
| `CORE_API_BASE_URL`              | For every Core feature             | No                   | Runtime and build | `lib/core-api/config.server.ts`, `lib/security-headers.ts`    |
| `CORE_EVENTS_API_KEY`            | With `CORE_API_BASE_URL`           | **Yes**              | Runtime           | `lib/core-api/config.server.ts`                               |
| `CORE_API_TIMEOUT_MS`            | No                                 | No                   | Runtime           | `lib/core-api/config.server.ts`                               |
| `CORE_EVENTS_REVALIDATE_SECONDS` | No                                 | No                   | Runtime           | `lib/core-api/config.server.ts`                               |
| `CORE_API_DEBUG`                 | No                                 | No                   | Runtime           | `lib/core-api/client.server.ts`                               |
| `SUPABASE_URL`                   | For sign-in, profile, member flows | No                   | Runtime and build | `lib/member-auth/config.server.ts`, `lib/security-headers.ts` |
| `SUPABASE_ANON_KEY`              | With `SUPABASE_URL`                | No (public anon key) | Runtime           | `lib/member-auth/config.server.ts`                            |
| `VERCEL_ENV`                     | Set by Vercel                      | No                   | Runtime           | both `config.server.ts` files                                 |
| `NODE_ENV`                       | Set by Next.js                     | No                   | Build and runtime | `lib/security-headers.ts`, the `app/dev/*` pages              |
| `ESSQU_EVENT_FLOW`               | Test harness only                  | No                   | Build             | `next.config.ts` (`distDir`)                                  |

## Variables in detail

### `CORE_API_BASE_URL`

- **Purpose.** Core's API address, including the version path. Server event and project reads use
  it, the image proxies use it, and it is passed to the browser for registration, membership and
  `/me/*` calls.
- **Placeholder.** `https://api.example.test/v1`. **Production:** `https://api.essqu.com/v1`.
  **Preview and staging:** the staging Core's `/v1` address. **Local:** `http://127.0.0.1:3001/v1`.
- **Validation** (`normaliseBaseUrl`):
  - it must parse as a URL with no credentials, query or fragment;
  - its path must end in `/v1`;
  - `https` is required, except `http` on `localhost`, `127.0.0.1` or `[::1]` when `VERCEL_ENV`
    is not `production`;
  - a trailing slash is removed.
- **When missing or invalid.** The mode becomes `unconfigured`:
  - event surfaces show "can't be shown right now";
  - the projects catalogue shows its error state;
  - registration, membership, sign-in status and profile calls are disabled;
  - the image proxies return 404;
  - the problem name is logged once.
- **Also used at build time.** It is added to the report-only CSP `connect-src`. Set it for the
  build as well as at runtime (Vercel does this when the variable has the right scope).

### `CORE_EVENTS_API_KEY`

- **Purpose.** Bearer token with the `events:read` scope, for server-side event reads only. Never
  sent to the browser.
- **Format.** `essq_live_<prefix>_<secret>` for production, `essq_test_<prefix>_<secret>` for
  staging. **Placeholder:** `essq_test_exampleprefix_<secret>`.
- **Where to get it.** It must be issued by Core's operator. Core stores only the prefix and the
  SHA-256 of the full token in `private.api_clients`, with `scopes` including `events:read` and an
  `environment` matching the token type (`live` = `production`, `test` = `staging`). **Copying a
  string from another project does not work** unless that exact token is registered in the
  database the target Core uses. Procedure:
  [Core configuration](https://github.com/EngCrafters/engsoc-platform/blob/main/docs/reference/configuration.md#api-clients-and-keys).
- **Validation here.** It must be non-empty with no whitespace. Otherwise the mode is
  `unconfigured` (`missing-api-key` or `invalid-api-key`).
- **When rejected by Core.** `401` (unknown, revoked, expired or wrong environment) or `403`
  (missing scope). Event surfaces show "unavailable" and the logs show `kind: "unauthorized"` or
  `"forbidden"`. Registration and membership still work, because they need no key.

### `CORE_API_TIMEOUT_MS`, `CORE_EVENTS_REVALIDATE_SECONDS`, `CORE_API_DEBUG`

| Variable                         | Default | Accepted range | Effect                                                            |
| -------------------------------- | ------- | -------------- | ----------------------------------------------------------------- |
| `CORE_API_TIMEOUT_MS`            | 4000    | 500–15000      | Timeout of each server read. Out-of-range values use the default. |
| `CORE_EVENTS_REVALIDATE_SECONDS` | 30      | 0–300          | Data-cache lifetime of event reads. `0` disables caching.         |
| `CORE_API_DEBUG`                 | unset   | `true`         | Logs every Core request, not only failures                        |

### `SUPABASE_URL` and `SUPABASE_ANON_KEY`

- **Purpose.** The Supabase Auth project for member sign-in. It **must be the same project** that
  Core uses (Core's `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`), otherwise
  Core rejects the access tokens with 401 and the site signs the visitor out again.
- **Read on the server at request time** ([`lib/member-auth/config.server.ts`](../../lib/member-auth/config.server.ts),
  `getMemberAuthConfig`) and passed to the pages, so changing them needs a redeploy on Vercel but
  no code change.
- **Placeholders.** `https://<project-ref>.supabase.co` and the project's anon or publishable key.
  Never the service-role key.
- **Validation.** `getMemberAuthConfig()` returns `null` when any of the following holds:
  - either value is empty after trimming;
  - the key has characters outside `A–Z a–z 0–9 . _ -` or is shorter than 20 characters;
  - the URL does not parse;
  - the URL is not `https` (except `http` on a loopback host outside Vercel production);
  - the URL contains credentials, a query or a fragment;
  - the URL has a path other than `/`. `https://<ref>.supabase.co/auth/v1` is rejected.

  Surrounding quotes pasted into a value make it invalid.

- **When `null`.**
  - `/login` shows "Sign-in isn't available right now. Please try again later." with no form.
  - `/forgot-password` and `/reset-password` show their "isn't available" notes.
  - `/register` shows no password fields; applications still work.
  - The navbar shows the signed-out state.
  - `/profile`, `/projects/submit`, member registration and attendance cannot run.
- **Also used at build time.** `SUPABASE_URL`'s origin goes into the report-only CSP.
- **Supabase project settings** that the website depends on (sign-up enabled, email confirmation,
  minimum password length 8, redirect URLs `<site>/login` and `<site>/reset-password`, token-hash
  email templates) are listed in the
  [system integration guide](https://github.com/EngCrafters/engsoc-platform/blob/main/docs/integration/system-integration.md#supabase-auth-settings).
  They affect emails and links, not whether `/login` renders.

### `VERCEL_ENV`, `NODE_ENV`, `ESSQU_EVENT_FLOW`

- `VERCEL_ENV=production` forbids plain-HTTP Core and Supabase URLs.
- `NODE_ENV=development` adds `'unsafe-eval'` to the report-only CSP. `production` hides
  `/dev/*`.
- `ESSQU_EVENT_FLOW=true` makes the build write to `.next-event-flow`. Core's two-app browser test
  harness uses it so it does not disturb a running dev server.

Development Cycle 2 (Core ADR 0025) adds **no environment variable**. `/register` and `/profile`
read Core's `GET /membership-options` with the existing `CORE_API_BASE_URL` and
`CORE_API_TIMEOUT_MS`, without a key, and cache it for 300 seconds
(`MEMBERSHIP_OPTIONS_REVALIDATE_SECONDS` in `lib/core-api/membership-options.server.ts`).

## Build time versus runtime

- **Runtime.** Core and Supabase settings are read on the server for each process
  (`getCoreConfig` caches the resolved configuration per process).
- **Build time.** `next.config.ts` computes the security headers during `next build`, using
  `CORE_API_BASE_URL`, `SUPABASE_URL` and `NODE_ENV`. A value added after a build changes the
  runtime behaviour of the **next** deployment only.
- **On Vercel, environment-variable changes apply only to deployments created after the change.**
  After adding or editing a variable, redeploy the affected environment.
- `next/font/google` downloads fonts during the build, so the build needs network access.

## Environments

| Environment         | `CORE_API_BASE_URL`        | `CORE_EVENTS_API_KEY`                           | Supabase variables                   | Notes                                                                                                        |
| ------------------- | -------------------------- | ----------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Local               | A local Core or staging    | An `essq_test_` key registered in that database | The non-production project Core uses | Core must allow your exact origin                                                                            |
| Preview (Vercel)    | Staging Core `/v1`         | A staging key; never the production key         | The staging project                  | Preview URLs are protected by Vercel authentication (**Deployed**, 2026-10-22)                               |
| Production (Vercel) | `https://api.essqu.com/v1` | The production (`essq_live_`) key               | Core's production project            | See [Known gaps](../known-gaps.md#unverified-infrastructure-settings) for the project observed on 2026-10-24 |

## Feature flags: `config/site-features.json`

| Key                                                    | Values                   | Effect                                                                      |
| ------------------------------------------------------ | ------------------------ | --------------------------------------------------------------------------- |
| `pages.projects`                                       | `active` / `coming-soon` | `/projects`, `/projects/[slug]`, `/projects/submit`, the account menu entry |
| `pages.events`                                         | `active` / `coming-soon` | `/events`, `/events/[slug]`, attendance                                     |
| `pages.register`                                       | `active` / `coming-soon` | `/register` (Coming Soon shows the turning member card)                     |
| `pages.profile`                                        | `active` / `coming-soon` | `/profile` and its account-menu entries                                     |
| `pages.members`, `pages.network`, `pages.certificates` | `active` / `coming-soon` | The prototype community modules                                             |
| `profile.allowPhotoUpload`                             | `true` / `false`         | Shows photo upload when Core's `MEMBER_PHOTO_UPLOADS` also allows it        |
| `profile.allowProfileEditing`                          | `true` / `false`         | Shows profile editing when Core's `MEMBER_PROFILE_EDITING` also allows it   |

The file is validated when the build loads it. A missing key or unknown page name fails the build.

## Retired variables

`CORE_API_MODE` (formerly `sample`) is no longer read. A leftover value has no effect
(**Tests**: `tests/core-api/config.test.ts`, `tests/data/events-development.test.ts`).

## Never

- Never rename a variable to `NEXT_PUBLIC_`. Core's own `NEXT_PUBLIC_SUPABASE_*` names are not
  read by this site, and a leftover `NEXT_PUBLIC_CORE_API_BASE_URL` in a Vercel project is
  ignored.
- Never put the Supabase service-role key, a database URL or a Core admin credential in this
  project.
- Never commit `.env*` files other than `.env.example`.
