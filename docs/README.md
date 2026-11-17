# ESWebsite developer documentation

ESWebsite is the public website of the Engineering Society at Sultan Qaboos University (SQU),
served at `https://essqu.com`. It is a Next.js application with no database, no API routes and
no admin tool of its own:

- **Events, projects, membership applications and member data** come from the Core platform
  (`engsoc-platform`) through its versioned HTTP API, `https://api.essqu.com/v1`.
- **Member sign-in** happens in the visitor's browser against the Supabase Auth project that Core
  also uses.
- **Everything else** (landing sections, archive, leadership, the prototype community pages)
  is built from content files in this repository.

These documents describe the checked-out implementation. They do not assume it matches what is
deployed. Use the evidence labels below to tell what was proven and how.

## Version documented

| Item                        | Value                                                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository                  | `https://github.com/EngCrafters/essqu-web.git` (remote `origin`; the local folder is named `ESWebsite`)                                                                         |
| Branch                      | `salim`, tracking `origin/salim` (no unpushed commits)                                                                                                                          |
| Commit                      | `740d29d3c4281c7062b72213f34736037d0149b6` (2026-10-22, "fix(profile): offer Change photo while the stored photo is still loading")                                             |
| Relation to `main`          | `origin/main` (`610da07`) contains only two extra merge commits; its file tree is identical to this commit                                                                      |
| Inspection date             | 2026-10-24                                                                                                                                                                      |
| Working tree                | Clean before this documentation was written. The only uncommitted changes are these documentation files and a documentation link added to the root `README.md` and `CLAUDE.md`. |
| Framework                   | Next.js 16.3.8 (App Router, Turbopack builds), React 19.2.8, TypeScript 5.9.3                                                                                                   |
| Notable libraries           | `@supabase/supabase-js` 2.118.0, GSAP 3.15.0, Three.js 0.186.0, `@react-three/fiber` 9.7.0, `@react-three/drei` 10.7.8                                                          |
| Runtime and package manager | Node.js 22 in CI (`.github/workflows/ci.yml`); npm with `package-lock.json` (lockfile v3). `package.json` declares no `engines` field.                                          |

Versions are the resolved versions in `package-lock.json`.

## Recommended reading order

1. [Getting started](onboarding/getting-started.md): install, configure and run the site, alone
   or with a local Core.
2. [Architecture](explanation/architecture.md): how the site is built, where data comes from,
   localization, feature flags and what is real versus prototype.
3. [Routes](reference/routes.md): every route, who can use it and where its data comes from.
4. [Workflows](explanation/workflows.md): events, registration, membership, sign-in, password
   reset, profile, projects and attendance, traced from the UI to Core and back.
5. [Core API consumption](reference/core-api-consumption.md): which Core endpoints the site calls
   and how.
6. [Configuration](reference/configuration.md): every environment variable and the feature-flag
   file.
7. [Development guide](how-to/development-guide.md): add a page, consume an endpoint, update
   translations, change a feature.
8. [Deployment and troubleshooting](how-to/deployment-and-troubleshooting.md).
9. [Known gaps](known-gaps.md) and [documentation maintenance](maintenance.md).

The shared [system integration guide](https://github.com/EngCrafters/engsoc-platform/blob/main/docs/integration/system-integration.md)
explains how this site and Core work together. It is kept in the Core repository, together with
the canonical API, database and permission references.

## Documents by purpose

| Purpose     | Documents                                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Onboarding  | [Getting started](onboarding/getting-started.md)                                                                                      |
| How-to      | [Development guide](how-to/development-guide.md), [Deployment and troubleshooting](how-to/deployment-and-troubleshooting.md)          |
| Reference   | [Routes](reference/routes.md), [Core API consumption](reference/core-api-consumption.md), [Configuration](reference/configuration.md) |
| Explanation | [Architecture](explanation/architecture.md), [Workflows](explanation/workflows.md)                                                    |
| Status      | [Known gaps](known-gaps.md), [Documentation maintenance](maintenance.md)                                                              |

## Evidence labels

| Label        | Meaning                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| **Source**   | Verified by reading the source code or configuration at the commit above.                               |
| **Tests**    | Covered by a test in the repository. The tests were read, not executed, during this documentation task. |
| **Deployed** | Seen in a deployed environment through read-only, unauthenticated requests on the date given.           |
| **Inferred** | Concluded from the evidence above, but not proven directly.                                             |
| **Unknown**  | Not verifiable from this repository; listed with what to check.                                         |

Unlabelled statements about code are **Source**.

## Older documents in this repository

- [`README.md`](../README.md) at the repository root describes the design, the routes as rooms,
  motion and the content files. Parts of it predate the Core integration; see
  [Known gaps](known-gaps.md#documentation-inconsistencies).
- [`integration/`](../integration/) holds dated reports from the integration work (October 19–21,
  2026). They record decisions and verification at the time and are useful history, but they
  describe branches that have since been merged. Where they disagree with the source, the source
  and these documents win.
- [`lib/core-api/README.md`](../lib/core-api/README.md) is the module guide for the Core client.

## Sibling checkout layout

The two systems are separate Git repositories. A common local layout is:

```text
ESSQU/
├── ESWebsite/          ← this repository (GitHub: EngCrafters/essqu-web)
└── engsoc-platform/    ← Core (GitHub: EngCrafters/engsoc-platform)
```

Links from these documents to Core use GitHub URLs on Core's `main` branch, so they work when
the repositories are browsed separately. In a sibling checkout the same files are under
`../engsoc-platform/`.
