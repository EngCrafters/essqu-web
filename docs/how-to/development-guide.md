# Development guide

Task-oriented recipes that follow the conventions already in the code. Before changing a page,
read [Architecture](../explanation/architecture.md). Before changing a Core call, read Core's
[API reference](https://github.com/EngCrafters/engsoc-platform/blob/main/docs/reference/api.md).
Keep the existing designs: most pages have a deliberate visual signature (see the root
[`README.md`](../../README.md)).

## Ground rules

- **Core decides; the website shows.** Never compute capacity, waitlists, membership or
  permissions here. If the UI needs a fact Core does not publish, that is a Core API change
  request, not a website guess.
- **One door to Core.** Server reads go through `lib/core-api/*.server.ts` and `lib/data`. Browser
  calls go through the helpers in `lib/core-api/` and `lib/member-auth/`. Do not call `fetch` for
  Core data from a component.
- **No secrets in the browser.** Only `CORE_API_BASE_URL`, `SUPABASE_URL` and `SUPABASE_ANON_KEY`
  may reach a client component. `CORE_EVENTS_API_KEY` stays in `client.server.ts`.
- **Validate Core's answers** before rendering, and treat anything unexpected as unavailable.
- **Every visible string exists in English and Arabic.**
- **Addresses come from [`lib/routes.ts`](../../lib/routes.ts).**

## Add a page

1. Create `app/(platform)/<route>/page.tsx` as a Server Component. It inherits the navbar, footer
   and demo session from `app/(platform)/layout.tsx`.
2. Export `generateMetadata()` using `await getI18n()`. Add `robots: { index: false }` and
   `referrer: 'no-referrer'` for private pages, and add the path to the `private_` list in
   [`lib/security-headers.ts`](../../lib/security-headers.ts) if the page handles tokens or
   personal data.
3. Put page-specific components in `components/pages/<route>/` with a CSS module next to them.
4. Read data through `lib/data` (or a new server function in `lib/core-api/` for Core data).
5. Add the route to `lib/routes.ts` and, if it belongs in navigation, to `PRIMARY_PAGES`,
   `COMMUNITY_PAGES` or `FOOTER_GROUPS` in [`content/site.ts`](../../content/site.ts).
6. If the page should be switchable, add an ID to `PAGE_IDS` in
   [`lib/site-features.ts`](../../lib/site-features.ts) and to `config/site-features.json`, then
   guard the page with `if (isComingSoon('<id>')) return <ComingSoon module="<id>" />`.
   `ComingSoon` needs copy in `t.platform.comingSoon.modules`.
7. Add a `not-found.tsx` for dynamic segments, following the existing deep routes.

## Consume a Core endpoint

**Server read** (public data):

1. Add a function in `lib/core-api/` that starts with `import 'server-only'` and reads
   `getCoreConfig()`, returning `unavailable` when not in `core` mode.
2. For event-like data that may be cached, use `coreGetJson(config, { path, route, tags })`. It
   adds the key, timeout, safe retry, caching and logs. For data that must disappear immediately
   when unpublished (as projects must), use `fetch` with `cache: 'no-store'` and
   `redirect: 'error'`, as `projects.server.ts` does.
3. Validate the body with a parser in `schemas.ts` (or next to the function). Reject the whole
   response on a contract violation.
4. Wrap it in `react.cache` if several components on one page need it.
5. Expose it through `lib/data` and return `{ status: 'ok' | 'not-found' | 'unavailable' }`. Never
   throw into a page.

**Browser call** (visitor or member action):

1. Get the base URL from the server: pass `getRegistrationBaseUrl()` and, for member calls,
   `getMemberAuthConfig()` as props.
2. For a member call, use `memberCall(settings, base, path, method, body)` from
   [`lib/core-api/member-events.ts`](../../lib/core-api/member-events.ts). It attaches the current
   access token, omits credentials and normalizes failures to `{ ok: false, code, status }`.
3. Map Core's status and `errors[0].code` to messages. Handle `401` (offer sign-in), `403
MEMBER_REQUIRED` (non-member state), `429` (`retryAfterSeconds`) and `503`.
4. Never retry a write automatically.
5. If Core adds a method or header, Core's CORS policy for that route must allow it. That is a
   Core change.

Add unit tests in `tests/core-api/` with an injected `fetchImpl` (see
`tests/core-api/registration.test.ts` and `tests/support/core.ts`).

## Update translations

1. Interface copy lives in [`lib/i18n/dictionaries/`](../../lib/i18n/dictionaries/):
   - `en.ts` and `ar.ts` for the shell and landing;
   - `platform-en.ts` and `platform-ar.ts` for platform pages;
   - `pages/*.ts` for feature pages, with both languages in one file.
2. Add the English string first, then the Arabic one. The Arabic objects are typed against the
   English ones, so `npm run typecheck` fails until every key exists.
3. Content files under `content/` use `{ en, ar }` values. Read them with `l(value)` from
   `getI18n()` or `useI18n()`.
4. Keep Arabic in Western digits (the `intl` locale already does this). Use logical CSS properties
   (`margin-inline-start`, not `margin-left`) and check right-to-left at 360 px and 390 px widths.
5. Core's event text is single-language. Do not translate it in the website.

## Change a feature flag

Edit [`config/site-features.json`](../../config/site-features.json), run `npm run build` locally
(the parser fails on typos), commit and deploy. For profile switches, check that Core's
`MEMBER_PHOTO_UPLOADS` and `MEMBER_PROFILE_EDITING` match your intent. Core enforces its own
switches whatever the website shows.

## Modify an existing feature safely

1. Find the page in [Routes](../reference/routes.md) and its flow in
   [Workflows](../explanation/workflows.md).
2. Check whether Core must change too (new field, new rule, new endpoint). If it must, change Core
   first and deploy it before the website relies on it. See the
   [integration guide](https://github.com/EngCrafters/engsoc-platform/blob/main/docs/integration/system-integration.md#which-repository-changes).
3. Keep the visual design: reuse the existing components (`components/discovery`,
   `components/platform`) and states (loading, empty, filtered, error).
4. Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`.
5. Update the documents listed in [Documentation maintenance](../maintenance.md).

## Code conventions

- Server Components by default. Add `'use client'` only for interaction, browser APIs or the
  Supabase client.
- Prefer small pure functions that tests can exercise without a network: `outcomeFor`,
  `membershipOutcomeFor`, `resolveCoreConfig`, `readAuthLink`.
- Comments explain why, as in the existing modules. Keep that density.
- Styling uses CSS Modules and the tokens in `styles/tokens.css`. Motion timings come from
  `lib/motion.ts`. Respect `prefers-reduced-motion`.
