# Documentation maintenance

These documents are kept next to the code (docs as code) and change in the same commit as the
code they describe. Update the version table in [README](README.md#version-documented) when you
re-verify the whole set.

## What to update when code changes

| When you change…                                                                      | Update                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A route under `app/` (added, removed, renamed, guarded)                               | [Routes](reference/routes.md); navigation notes; [Architecture](explanation/architecture.md) if layouts change                                                                                                                                                      |
| `config/site-features.json` or `lib/site-features.ts`                                 | [Configuration](reference/configuration.md#feature-flags-configsite-featuresjson), [Architecture](explanation/architecture.md#feature-flags), [Routes](reference/routes.md)                                                                                         |
| Any `process.env` read, `.env.example` or `next.config.ts`                            | [Configuration](reference/configuration.md); [Getting started](onboarding/getting-started.md)                                                                                                                                                                       |
| `lib/core-api/*` or `lib/member-auth/*` (endpoints, headers, timeouts, caching)       | [Core API consumption](reference/core-api-consumption.md); [Workflows](explanation/workflows.md); Core's integration guide's contract map                                                                                                                           |
| A user-facing flow (registration, membership, sign-in, profile, projects, attendance) | [Workflows](explanation/workflows.md)                                                                                                                                                                                                                               |
| `lib/security-headers.ts`                                                             | [Architecture](explanation/architecture.md#security-headers), [Configuration](reference/configuration.md#build-time-versus-runtime)                                                                                                                                 |
| `package.json` scripts, dependencies or CI                                            | [README](README.md#version-documented), [Getting started](onboarding/getting-started.md)                                                                                                                                                                            |
| Deployment, Vercel or domain setup                                                    | [Deployment and troubleshooting](how-to/deployment-and-troubleshooting.md)                                                                                                                                                                                          |
| Something listed in [Known gaps](known-gaps.md) is fixed or found                     | [Known gaps](known-gaps.md)                                                                                                                                                                                                                                         |
| Anything that changes the contract with Core                                          | Also Core's [system integration guide](https://github.com/EngCrafters/engsoc-platform/blob/main/docs/integration/system-integration.md) and [API reference](https://github.com/EngCrafters/engsoc-platform/blob/main/docs/reference/api.md), in the Core repository |

## Writing rules

- Describe what the code does now. Plans belong in issues or ADRs, not here.
- Label claims that were not read from source: **Tests**, **Deployed** (with a date),
  **Inferred**, **Unknown**.
- Link to the file (and function) that proves a claim, with a repository-relative link.
- Never include secrets, real tokens, connection strings, real email addresses, student IDs or
  other personal data. Use placeholders such as `essq_test_exampleprefix_<secret>` or
  `student@example.test`.
- Keep database, API and permission details canonical in Core's documentation, and link to them.

## Checklist for AI-assisted changes

Before finishing a change made with an AI assistant:

1. **Update the docs** listed in the table above, in the same change.
2. **Verify each new or changed claim against the code**: open the file you link to and confirm
   the behaviour, names, limits and defaults.
3. **Check the links.** Every relative link must resolve, and every Core link must point to an
   existing file on Core's `main`.
4. **Check Mermaid diagrams** still match the flow (participants, order, endpoints).
5. **Scan for secrets and personal data** in the diff.
6. **Report what remains unknown** (deployed settings, untested paths) in [Known gaps](known-gaps.md)
   rather than guessing.
