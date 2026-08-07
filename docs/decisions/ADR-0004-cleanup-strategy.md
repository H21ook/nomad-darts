# ADR-0004 — Cleanup strategy (dead code, deps, PWA artifact)

- **Status:** Accepted (implemented 2026-08-07, workflow WF-20260807-043915-research-plan)
- **Date:** 2026-08-07

## Context

Post-feature cleanup was deferred to dedicated tasks (D3, D8) to keep feature diffs reviewable. Verified: 42/53 shadcn/ui components unused; 10 deps unused (including `date-fns`, `@supabase/supabase-js`); stub auth + fetcher layer dead; `public/sw.js` committed with Windows backslash precache paths.

## Decision

- **D3/D8 — Cleanup in dedicated tasks:** T11 removed the dead stub auth + fetcher layer (9 files, 364 lines); T12 removed 10 unused deps and 41 unused ui components (12 kept: alert-dialog, app-bar, badge, button, card, field, input, input-group, label, separator, table, textarea); `shadcn` moved to devDependencies.
- **PWA artifact:** Stop committing the generated service worker (`public/sw.js`, `sw.js.map`, `workbox-*.js`) — gitignored; regenerated per-platform at build time. Fixing backslashes in the committed copy would be futile (Windows build reintroduces them); Linux/Vercel builds produce forward-slash URLs naturally.

## Consequences

- Smaller dependency surface, faster installs/builds.
- No stale references to removed modules in docs (T14/T15 cleanup).
- Service worker is always platform-correct at deploy time.
