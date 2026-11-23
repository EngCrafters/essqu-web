# Development Cycle 2 on the website

The website's side of Development Cycle 2: expanded membership, SQU student verification and
committee leadership. The decisions, data model, permissions, migration and release steps live in
Core:

- the decision record: Core `docs/adr/0025-expanded-membership-verification-and-leadership.md`;
- the full summary for both repositories: Core `docs/development-cycle-2.md`.

**Status:**

- implemented locally;
- **uncommitted, not pushed, not deployed**;
- needs Core with migration 0033;
- no new environment variable.

## What changed for visitors and members

### `/register`

- The form is built from Core's `GET /v1/membership-options`. It reads the categories, what each
  one asks for, the listed universities and the consent version on the server, and caches them
  for five minutes (successful answers only). If Core cannot answer, no half-built form is shown:
  the page says "The application form couldn’t be loaded", that nothing was sent, and offers
  **Try again**, which reads the options again from the browser (`fetchMembershipOptions`). It
  never guesses the rules. Without `CORE_API_BASE_URL` it says applications can't be sent.
- **Categories ("I am…"):** University Student, Graduate / Alumni, Academic / Researcher,
  Industry Professional, Other.
- **University Student:** chooses a university, or "Other university (not listed)" with a typed
  name (2–120 characters), and gives an academic year.
- **Graduate:** may add an alma mater.
- **Other categories:** asked for no university and no year.
- **Switching category** clears the fields of the previous one. Core drops them again on its
  side.
- **Email address:** any valid address, personal or institutional.
- **No student ID and no ID card.** The ID upload, its hint and its preview are gone. The
  agreement (consent `2026-11-v2`) and the member card preview no longer mention them. The lead
  text says SQU students can verify their status later, from their profile.

### `/profile`

- **About** shows the category and the university. Members can edit them under the same rules
  as registration, while editing is enabled.
- An **SQU Verified** badge appears next to the name once a reviewer verifies the member.
- **Two independent cards** (2026-11-19, replacing the combined "Verification & Society Roles"
  section). Each loads its own Core endpoint and has its own loading text, error state (message,
  Core's request reference, **Try again**) and empty state, so one failing never hides the
  other. The profile header links to both (`#squ-verification`, `#leadership`).
  - **SQU student verification** (`SquVerificationCard.tsx`, `GET /v1/me/verification`):
    - the member enters their student number (6–10 digits) and a photo or PDF of their SQU ID
      card. Photos are re-encoded in the browser without metadata; PDFs are sent as they are;
    - states: not verified, pending review, verified, rejected (with the reviewer's reason), and
      revoked (with its reason);
    - resubmission is offered when Core says it is allowed, with the next possible date
      otherwise;
    - the student number is shown masked.
  - **Committee leadership** (`LeadershipCard.tsx`, `GET /v1/me/leadership`):
    - shows dashboard access as a read-only fact and, since Core migration 0035 (ADR 0027), which
      active positions give it (`grantsAccess`): a position gives dashboard access only through
      the permissions assigned to its committee or team;
    - empty state: no position and no requests;
    - **Request a leadership position** (Core ADR 0026, 2026-11-20): the member chooses a
      committee (required), then the **assignment level**, Committee leadership or Team
      leadership, offered only when the committee has active teams, then a team (team leadership
      only), then Chief or Assistant Chief. A committee without teams offers committee leadership
      only, with no team. Changing the committee clears the level and team; changing the level
      clears the team; a team no longer offered after the options reload is dropped and said so.
      One position per scope (the committee itself, or each team);
    - when the administrators close requests, the card says so instead of the request button;
      positions and requests stay listed, and a request sent as they closed gets a clear message;
    - requests and appointments read "Committee → Position" (committee leadership) or "Committee
      → Team → Position", with their status and reasons;
    - a request closed by a structure change says why (team moved, inactive or archived, or
      committee archived).
  - Decisions appear on the cards on the next visit, with the reviewer's reason. **No email is
    sent**: Core has no transactional email channel yet (Core ADR 0025, open decision 3).

### Sign-in, password reset and email change

These pages say "Email address" and accept any valid address, not only `squ.edu.om`.

### Language and accessibility

- Every new string exists in English and Arabic. Arabic pages are right to left. Reviewers'
  reasons, file names and typed university names use `dir="auto"`.
- Controls are labelled, and errors are tied to their fields.
- Status changes are announced in live regions.
- The section works at phone width.

## Core endpoints used

| Website caller                                                     | Core route                         | When                                                        |
| ------------------------------------------------------------------ | ---------------------------------- | ----------------------------------------------------------- |
| `lib/core-api/membership-options.server.ts` `getMembershipOptions` | `GET /v1/membership-options`       | Server render of `/register` and `/profile`; no key         |
| `lib/core-api/membership.ts` `submitMembershipApplication`         | `POST /v1/membership-applications` | Registration; text fields only                              |
| `lib/core-api/membership-options.ts` `fetchMembershipOptions`      | `GET /v1/membership-options`       | "Try again" on `/register`, from the browser                |
| `lib/core-api/member-roles.ts` `fetchOwnSqu`                       | `GET /v1/me/verification`          | The SQU card                                                |
| `member-roles.ts` `fetchOwnLeadership`                             | `GET /v1/me/leadership`            | The leadership card                                         |
| `member-roles.ts` `submitSquEvidence`                              | `POST /v1/me/verification/squ`     | Sending SQU evidence (60 s timeout)                         |
| `member-roles.ts` `fetchLeadershipOptions`                         | `GET /v1/me/leadership/options`    | Opening the request form                                    |
| `member-roles.ts` `requestLeadership`                              | `POST /v1/me/leadership/requests`  | Sending a request (`teamId: null` for committee leadership) |

The browser calls the `/v1/me/*` routes with the member's own access token, like every other
member route. `toSquState`, `toOwnLeadership` and `toLeadershipOptions` validate each answer
and drop anything unexpected; a malformed answer is "unavailable", never a guessed state. A failed
call keeps Core's request id (`memberFailure`), which the card shows as its reference. The website never receives reviewer notes, reviewer identities, document keys or the
full student number.

## Files

- **Core clients:**
  - `lib/core-api/membership-options.ts`, `membership-options.server.ts`;
  - `lib/core-api/member-roles.ts`;
  - changes to `lib/core-api/membership.ts` and `member-profile.ts`.
- **Pages and components:**
  - `app/(platform)/register/page.tsx`, `components/pages/register/RegisterForm.tsx` and its
    CSS module;
  - `app/(platform)/profile/page.tsx`, `components/pages/profile/MemberProfile.tsx`,
    `ProfileDetails.tsx`, `AccountSettings.tsx`, `SquVerificationCard.tsx`, `LeadershipCard.tsx`,
    `RoleCardParts.tsx` and the CSS module.
- **Wording:** `lib/i18n/dictionaries/pages/people.ts`, `member-profile.ts` and `account.ts`.
- **Tests:**
  - `tests/core-api/membership.test.ts`;
  - `tests/core-api/member-roles.test.ts` (new);
  - `tests/member-auth/member-profile.test.ts`.

The browser flows that drive both apps together are in Core: `tests/profile-flow/`.

## Release order

The order is: Core's migration 0033, then Core, then this website.

- **The previous website works against the new Core** for one release. Core accepts its form,
  treats it as a University Student at SQU and discards the student ID and card.
- **This website does not work against the previous Core.** `GET /v1/membership-options` and the
  `/v1/me/verification` and `/v1/me/leadership` routes are missing there, and so are their
  database routines on a database below schema 33 (as on staging until 2026-11-20, when 0033 was applied there). `/register` then
  shows "The application form couldn’t be loaded" with Try again, and each profile card shows its
  own error with a reference and Try again.

Deploy it only after Core.

## Verification (2026-11-20, local; staging migrated separately)

- `npm run typecheck`, `npm run lint`, `npm test` (152 unit tests, pure functions) and
  `npm run build` pass.
- Core's browser flows drove this website against a local Core, a disposable database and
  synthetic Auth and Storage (7 of 7 passed):
  - registration in all five categories, including a typed "Other university";
  - the two profile cards loading independently: with one Core routine made unavailable, only the
    leadership card failed, with a reference matching Core's log, and recovered with Try again;
  - SQU submission, rejection with a reason, resubmission, approval and revocation;
  - a leadership request approved and shown, with dashboard access still "None";
  - Arabic, right to left, at 390 px without horizontal scrolling;
  - sign-in, profile editing, photos, corrections and event registration.

  See Core `docs/development-cycle-2.md`.

- Earlier fix kept: the hidden SQU file input no longer widens the page at phone width
  (`MemberProfile.module.css`).
- Core's migration 0033 was applied to the staging project on 2026-11-20 with the owner's
  authorization. The "Try again" state on `/register` was seen against a Core whose database
  connection had stalled. Nothing was deployed, and no real account was used.
