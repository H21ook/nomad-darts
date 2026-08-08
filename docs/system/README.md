# System Documentation

This directory documents how the current system works.

- [System Overview](../10-system-overview.md) — product goals, game modes, architecture
- [PWA / Offline](../30-pwa-offline.md) — serwist PWA setup
- [Roadmap](../40-roadmap.md) — product roadmap

## Current implementation state (2026-08-07)

Implemented in workflow WF-20260807-043915-research-plan:

- **Rematch** lands on `/match` with persisted settings (was broken — redirected home).
- **Session middleware** at `src/proxy.ts` (Next.js 16 correct location) protects `/dashboard/*` and `/match/*`; env-var guard for dev without Supabase.
- **Game-rule integrity:** BUST records `isBust: true, points: 0, dartsUsed: 3`; real dart counter (1/2/3); dead fields removed from the model.
- **Double Out enforcement:** finish confirmation asks "Was the last dart a double?"; non-double → bust.
- **Resume feature:** landing page Resume CTA when an in-progress match exists.
- **Statistics page** at `/match/stats` (PPR, darts, legs/sets, checkouts).
- **Guest match history:** local (localStorage via redux-persist) dashboard card.
- **Client 401-refresh fixed:** `refreshAccessToken` now POSTs to the refresh route.
- **Cleanup:** dead stub auth + fetcher layer removed; 10 unused deps and 41 unused ui components removed; generated service worker no longer committed.

## Test suite (2026-08-07)

- **Runner:** Vitest 4.1.x (`pnpm test`), node environment, `vitest.config.ts` with tsconfigPaths.
- **Files:** `src/lib/__tests__/utils.test.ts` (11 tests), `src/lib/redux/__tests__/matchSlice.test.ts` (31 tests) — 42 total.
- **Scope:** pure logic only (matchSlice reducers, game helpers, utils). Component/UI tests deferred.
- **Determinism:** `randomOrder: false`, invariant assertions only.

## Current implementation state (2026-08-08)

Implemented in workflow WF-20260808-045100-darts-ux-fixes:

- **Wizard navigation:** `#order` hash history hack removed; step 2 tracked via `?step=2` search param with `router.replace` — wizard always starts at step 1 on fresh navigation (fixes quick-match skipping to the players page after mid-game exit).
- **Score page header:** custom thin header replaced with the shared `AppBar` (X button opens the exit dialog).
- **Exit dialog:** restyled to the `FinishConfirmation` design language (`src/components/match/ExitConfirmation.tsx`).
- **FINISH button:** submits immediately as a double finish using the Darts-row count (no Double/Not-double question); exact-score number-pad entry still shows the confirmation dialog.
- **Not-double bug:** "Not double"/Cancel now clears the pending input (value/displayMode/dartsUsed).
- **Undo button:** zinc styling (was red).
- **Back navigation:** browser back from `/match/finished` goes home (no bounce loop); result-page AppBar back uses `router.replace('/')`.
- **Shared stats module:** `src/lib/stats.ts` (`collectLegs`, `buildPlayerStats`) used by both `/match/stats` and the match result page; result page now shows per-player PPR, avg darts/leg, avg score/turn, 100+ %, checkout % and the real match date (hardcoded "32%" and "24 OCT 2023" removed).
