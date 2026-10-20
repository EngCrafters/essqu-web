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
