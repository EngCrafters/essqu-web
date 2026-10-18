# Core API integration

Core owns events, registration, capacity, waitlists and audit. The server-only `server.ts` reads Core `/v1/events` and detail with `CORE_EVENTS_API_KEY`; explicit DTO validation strips any unexpected fields. It makes one list call, never per-event lookups, has an eight-second timeout, retries a 503 once, and uses no persistent cache. Availability remains Core's decision.

Protected Vercel previews additionally use `@vercel/oidc` to attach the short-lived `x-vercel-trusted-oidc-idp-token` server-to-server when `VERCEL_ENV=preview` and Core is on `.vercel.app`. Core's Trusted Sources must allow Landing preview → Core preview. This platform token never reaches browser registration and does not replace the scoped Core key. See [Vercel Trusted Sources](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/trusted-sources).

`registration.ts` posts directly from the browser to `NEXT_PUBLIC_CORE_API_BASE_URL` with no bearer key, cookies or IP field. It uses a twelve-second timeout and never retries automatically. The form requires an explicit Register/Join waitlist action, handles safe conflict reasons and older generic conflicts, and announces results accessibly in English/Arabic. No attendee data is stored in localStorage or logged.

The source of truth is Core `docs/api/openapi.v1.yaml` and `LANDING_HANDOFF_V1.md`. Empty or unavailable Core never falls back to sample events. Other explicitly labelled activity/project demonstration galleries are editorial design content, independent of registration.

Pre-domain configuration uses the Core Vercel `/v1` URL for both URL variables. Later set both URLs to `https://api.essqu.com/v1` and rebuild; the key remains server-only. Core must allow the exact Landing origin through `CORE_API_ALLOWED_ORIGINS`. No wildcard is required. Landing holds no database URL, service-role key or admin credential.

Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`. CI requires no live credential. Real staging cross-project E2E and production activation are separately gated release operations; unit tests alone do not prove them.
