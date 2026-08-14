# ADR-0005 — Unit test strategy (Vitest)

- **Status:** Accepted (implemented 2026-08-07, workflow WF-20260807-102829-wf-20260807-post-impl-tasks)
- **Date:** 2026-08-07

## Context

R4 follow-up from WF-20260807-043915-research-plan: no automated test suite existed; game-logic changes (matchSlice, utils) carried regression risk.

## Decision

- **Framework:** Vitest 4.1.x + vite-tsconfig-paths (node environment, no jsdom — pure logic only in this phase).
- **Config:** `vitest.config.ts` with tsconfigPaths plugin; `"test": "vitest run"` script; tests in `src/**/*.test.ts`.
- **Coverage:** `src/lib/__tests__/utils.test.ts` (cn, checkFinishablePoint bogie numbers, player colors) and `src/lib/redux/__tests__/matchSlice.test.ts` (bust semantics, darts-used tracking, leg/set/match finish, undo cap 20, turn alternation, rematch, abandon, selectCanUndo). 42 tests total.
- **Determinism:** `randomOrder: false`; assert invariants, never exact nanoid/Date.now values.
- **Hardening:** `matchSlice.ts` uses `import type { RootState }` (type-only) so the store/redux-persist never loads in tests.

## Consequences

- Regression safety for game-logic changes; `pnpm test` is now part of the verification loop.
- Component/UI testing (jsdom, testing-library) was deferred at the time of this ADR; it is now in place: `src/components/__tests__/matchFlow.test.tsx` (17 UI-driven tests, jsdom) added 2026-08-14 under workflow WF-20260811-100403-quickmatch-full-tests — see ADR-0008 D4. This line supersedes the deferral.
- Known behavior snapshot: `submitTurn` defaults `dartsUsed` to 0 (UI always passes explicit 1/2/3); ADR-0002 wording says "defaults to 3" — tests assert actual behavior; no code change made.
