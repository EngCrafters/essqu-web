# Projects and static page visibility

`content/site.ts` is the only visibility configuration. Projects and membership
registration are active. Members, network and certificates retain their original
Coming Soon views, including direct detail routes. Editing this list follows the
normal website build/deployment process; there is no dashboard, API or database
visibility setting.

The existing Projects catalogue, filters, media viewer and detail layouts now
consume Core's published snapshots. Thirty-record card pages are read with
no-store and strict validation; full stories are fetched only for detail pages.
Unavailable Core data never selects the illustrative catalogue. English/Arabic
content falls back to the supplied language and all existing RTL layouts remain.

`/projects/submit` reuses the existing login and membership activation contract.
Members save private drafts, select up to six images, submit explicitly and
follow decisions through their private history. Pending/reviewed revisions are
locked; edits to published work remain private until renewed approval and
publication. Twelve stored assets permit complete gallery replacement without
removing the old approved images. Preview URLs are authenticated, bounded and
revoked when the user changes or leaves the editor.

Core ADR 0021, `docs/api/PROJECTS.md` and migration `0029_member_projects` own the
data/security contract. Review is scoped to Society Affairs and existing Senior
Management. Hosted rollout still requires approval for missing dependencies
0027/0028 and new0029, a distinct private project-image bucket, matching Auth/CORS
settings and restricted `app_runtime` configuration. No environment secrets were
changed and no hosted migration or deployment was performed.
