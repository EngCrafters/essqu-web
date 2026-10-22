# Member accounts: password at registration, sign-in and recovery

Date: 20 October 2026 · Branches: website `feat/membership-registration`, Core
`feat/uc01-membership-applications` · **Nothing pushed, merged or deployed.**

Decision: Core's ADR 0019. It is one Supabase Auth project, shared with Core's admin dashboard. There
is no second user store, and the password never reaches Core.

## Flow

```text
/register   form + password ─► POST Core /v1/membership-applications   (no password in it)
                             └► 201 ─► Supabase auth.signUp(email, password, redirect /login)
                                        └► confirmation email (Supabase)
/login      confirmation link ─► verified, session in this browser
            email + password  ─► Supabase sign-in
                             └► GET Core /v1/me/membership (Bearer access token)
                                  member · under review · verified · approved · not approved · none
/forgot-password ─► Supabase resetPasswordForEmail(redirect /reset-password) ─► same answer always
/reset-password  ─► recovery link verified in this page load ─► new password ─► signed out everywhere
```

- **Password rule.** 8 characters minimum and 72 bytes maximum: Supabase Auth's own policy, and
  the owner's choice. `lib/member-auth/password.ts` mirrors it, and nothing stricter is invented.
- **Order.** The application goes first. A refused application creates no account. A failed
  sign-up leaves the application in place, with a "Set up sign-in" retry on the confirmation
  screen; an applicant who never retries gets Core's invitation after approval, as before.
- **Linking.** Core links an application to an account only once its email is confirmed. A
  signed-in account is not a member until reviewers approved and Core activated it. The status
  view says so, and nothing on the website grants anything.
- **Sessions.** Sessions stay in this browser: `sessionStorage` by default, or `localStorage` with
  "Keep me signed in". The website keeps no server session and sets no cookie.

## Security

- The password goes from the browser to Supabase Auth only. Tests check that Core's request never
  contains it and that no browser storage holds it.
- Error messages never tell "no account" from "wrong password". The forgot-password answer is the
  same for every address.
- Auth links (`token_hash`, `#access_token`, errors) are removed from the address bar before
  they are used. `/login`, `/forgot-password` and `/reset-password` send
  `Referrer-Policy: no-referrer` and `Cache-Control: no-store`.
- The reset form appears only after Supabase verifies a recovery link in that page load. An email
  or user ID in the URL can never change a password, and neither can an ordinary session.
- Core's `/v1/me/membership` verifies the token with Supabase Auth and returns status and dates
  only: no note, reviewer, student ID or document.

## Configuration

| Where              | What                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| Website            | `SUPABASE_URL`, `SUPABASE_ANON_KEY`: Core's project URL and anon key (public by design)            |
| Core               | `CORE_API_ALLOWED_ORIGINS` lists the website origin (already needed for registration)              |
| Supabase (owner)   | Minimum password length **8**                                                                      |
| Supabase (owner)   | Redirect URLs: `<site>/login` and `<site>/reset-password` for each website origin                  |
| Supabase (owner)   | Recovery and confirm-signup templates: `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=<type>` |
| Supabase (owner)   | Public sign-up on, email confirmation on (staging: verified; production: to verify)                |
| Core DB (approval) | Migration `0027_membership_member_accounts` (staging and production)                               |

Details and exact steps: Core's `docs/AUTH_AND_EMAIL.md` section 9 and
`docs/UC-01_Staging_Rollout.md` section 10. Without `SUPABASE_URL`/`SUPABASE_ANON_KEY`, the
registration form has no password fields and works as before.

## Testing

- `npm test`, `tests/member-auth/`, covers:
  - the password rule at 7/8 characters and 72 bytes (Arabic included);
  - link parsing and address cleanup;
  - error mapping;
  - the status call: token only in the header, no cookie, odd answers distrusted;
  - sign-up, with the password sent only to Supabase;
  - configuration.
- Core:
  - database tests for linking and activation (`tests/db/membership-accounts.test.ts`);
  - route tests for `/v1/me/membership`;
  - action tests: no invitation over an applicant's own unconfirmed account.
- **Browser, end to end.** The website and Core production builds ran on a disposable database
  against a local Supabase Auth stand-in, using synthetic identities and a generated card only.
  Checked:
  - password fields, Show/Hide, and the required, too-short and mismatch errors;
  - the application stored without the password, and the account unconfirmed;
  - sign-in refused before confirmation, with a resend offered;
  - the confirmation link signs in, the status shows "under review", and the application is
    linked;
  - wrong password, sign-out, and the session-only storage;
  - verified shown, approval refused while the policy is unset, then member after approval;
  - no admin access appeared;
  - the forgot-password answer identical for a real and an unknown address;
  - reset: the form, a mismatch, the update, the link refused on reuse, no link and expired link;
  - old password refused and new one accepted after reset; "Keep me signed in" uses
    `localStorage`;
  - a failed sign-up kept the application, and the retry created the account;
  - Arabic right-to-left; no horizontal overflow at 360 and 390 px;
  - Coming Soon pages and event registration unchanged.
- **Not verified:** the real Supabase project (sign-up, emails, templates, redirect allow-list) and
  the signed-in Core dashboard. These need the configuration above and the owner's go-ahead.
