# ADR-0006 — Darts UX fixes: navigation, finish flow, shared stats

- **Status:** Accepted (implemented 2026-08-08, workflow WF-20260808-045100-darts-ux-fixes)
- **Date:** 2026-08-08

## Context

Nine UX issues reported after the first release: wizard page-skipping after mid-game exit, unclear Darts row, inconsistent appbar/dialog design, stale input after "Not double", redundant Double/Not-double question on the FINISH button, red Undo button, dead back button on the match result page, and missing per-player statistics there.

## Decisions

- **D7 — Wizard step tracking:** replace the `window.history.pushState('#order')` + popstate hack with `router.replace('/match/setup?step=2')` + `useSearchParams`. The wizard keeps a single history entry and always starts at step 1 on fresh navigation.
- **D8 — Back from match result:** browser back from `/match/finished` (which lands on `/match` with status `match_finished`) redirects home instead of bouncing back to the result page; the result-page AppBar back uses `router.replace('/')`.
- **D9 — FINISH shortcut:** the FINISH button submits the finish immediately as a double, using the Darts-row count; the Double/Not-double confirmation remains only for exact-score number-pad entries.
- **D10 — Shared stats:** statistics computation extracted to `src/lib/stats.ts` (`collectLegs`, `buildPlayerStats`) shared by `/match/stats` and the match result page; result page shows per-player PPR, avg darts/leg, avg score/turn, 100+ %, checkout %.

## Consequences

- Wizard history is clean; no stale `#order` entries can resurrect step 2.
- Back from the result page always returns home; no bounce loop.
- FINISH is a one-tap double-out shortcut; the Darts row now meaningfully drives finish darts counts.
- Stats formulas live in one place; the result page no longer shows hardcoded values.
