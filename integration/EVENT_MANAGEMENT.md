# Core event management integration

The existing event media layouts now consume Core's `coverImageUrl`; a bounded
same-origin image route keeps the current Next Image pipeline. Descriptions use
HTTP(S) links and labelled links without evaluating HTML; summaries truncate text.

The existing dialog uses Core's verified profile for members and saves a missing
required phone privately before registration. Signed-in non-members can explicitly
choose the existing guest contract, with no verified Member link. Missing Core or
membership infrastructure never silently selects guest mode. Approval during a
long-lived session completes only through the existing 0027 membership-status call.

`/events/{id}/attendance` preserves the public challenge fragment briefly in the
tab across the existing login, removes it from history, and uses a whitelisted
return path. Only the explicit button POST can record attendance. Core decides
registration, waitlists, challenge/window eligibility and duplicate results.

Core's ADR 0020, migration 0028 and `docs/api/EVENT_ATTENDANCE.md` are the API/data
authority. Staging still needs approved 0027/0028 rollout, a private event bucket
and restricted runtime configuration. Existing Core/Supabase settings are reused;
the environment files were not changed. Both projects must use the same Auth project.

Verified with unit tests, builds and Core's `tests/event-flow` browser suite against
a disposable local database and synthetic Auth/Storage adapters, including Arabic
and mobile. Hosted signup/email/storage/deployment verification is still separate.

Security packaging keeps Next on its existing minor line at 16.3.8, with Sharp
0.35.5 and source-map-js 1.2.2 pins. The production dependency audit is clean.

## Audit repairs (Core ADR 0022, October 21)

- The scanned check-in code is kept in the tab for at most three minutes, matching Core's code
  life. Every organizer screen shows the same per-minute code. A guest registration made with the
  member's confirmed email becomes theirs when they open the event signed in.
- Every page sends `frame-ancestors 'none'` with `X-Frame-Options: DENY`, `nosniff`, a
  Referrer-Policy and a Permissions-Policy. The full content policy (`lib/security-headers.ts`)
  is report-only until it has been verified on staging. Next.js computes these headers at build time,
  so `CORE_API_BASE_URL` and `SUPABASE_URL` must be set for the build (Vercel does this). Sign-in and attendance pages keep
  `no-referrer` and `no-store`.
- Versioned event covers may be shared by the CDN for five minutes. Project reads and images stay
  no-store, because ADR 0021 requires unpublishing to take effect immediately.
- `.github/workflows/ci.yml` runs lint, type-check, unit tests and the production build.
