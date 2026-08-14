# Implementation Plan — WF-20260811-100403-quickmatch-full-tests

## Goal
Write and run a comprehensive Quick match test suite covering:
1. **User-realistic full match simulations** — tests drive the app exactly like a human:
   Quick Start -> wizard -> START MATCH -> score entry (NumberPad + dialogs) -> leg
   transitions -> finish -> rematch, through the real Redux store and real components
   (jsdom + @testing-library/react). Covers all correct AND incorrect variants.
2. **Navigation / page transition cases** (match_finished redirects, setup guard, abandon,
   resume, finished/stats redirects).
3. **Score entry cases** (all 7 NumberPad submit paths, FinishConfirmation both modes).
4. **Match state cases** (extend reducer suite: undo chains, snapshot cap rollover, 3p/4p
   set rotation matrix, bogie guard snapshot, rematch semantics).
5. **Dart rules compliance suite** — math-verified bogie tables, bust matrix, max checkout,
   leg/set rotation, PPR bookkeeping — with a **fix** for the straight-out deviation.

## User decisions (confirmed)
- **1-B:** Fix straight-out over-conservative finishability in `checkFinishablePoint`
  (allow 168/165/162/159 + 171/174/177/180 in straight mode; true bogeys 163/166/169 stay blocked).
- **2-A:** Add jsdom + @testing-library/react (+ jest-dom, user-event) devDeps; ADR-0005 updated.
- Full match simulations MUST be UI-driven (real components + real store), not just reducer calls.

## Architecture
- New `src/test/setup.ts` (jsdom stubs: navigator.vibrate, matchMedia, framer-motion,
  canvas-confetti, next/navigation helpers, next/link mock).
- jsdom enabled per-file via `// @vitest-environment jsdom` docblock (node stays default —
  existing 144 tests unaffected).
- Component tests render real components against a real configureStore (match + matchHistory
  slices, persist disabled via createStore helper exported from test file or inline).
- Dart-rules math encoded from research/findings.md section 4 (verified by Python enumeration).

## Tech Stack
Vitest 4 (already present) + jsdom + @testing-library/react 16 (React 19 compatible) +
@testing-library/jest-dom + @testing-library/user-event. No runtime deps.

## Global Constraints
- Verify per task: `npx tsc --noEmit`, `pnpm lint`
- Tests: `npx vitest run` (all); targeted: `npx vitest run <file>`
- `pnpm build` at integration (after all tasks)
- No commits unless requested; no debug logging; no new RUNTIME deps (devDeps ok for test infra)
- UI copy English; Mongolian comments stay Mongolian
- N-player safe (no players[0]/players[1] assumptions)
- Tests must not assert exact ids/timestamps (nanoid/Date.now non-determinism)
- For order-sensitive reducer tests use randomOrder: false
- Mock only what is necessary; prefer real components + real store

---

---

### Task 1 (T1): Fix straight-out finishability + update utils tests

**Files (owned):** `src/lib/utils.ts`, `src/lib/__tests__/utils.test.ts`
**Dependencies:** none

- `checkFinishablePoint(currentScore, checkout)`:
  - double mode: `<= 170 && >= 2 && !bogieNumbers.includes(score)` (unchanged)
  - straight mode: `<= 180 && >= 1 && !straightBogies.includes(score)` where
    `straightBogies = [169, 166, 163]` (math-verified true bogeys)
- Keep exported `bogieNumbers` (double-out list, used by tests) — name both lists clearly.
- utils.test.ts: update existing straight-mode cases (168/165/162/159 now true in straight,
  171/174/177/180 true in straight; 169/166/163 false in both; 1 true straight / false double).
- Acceptance: tsc clean, lint clean, vitest utils file passes; straight 168 -> true.
- Verify: `npx tsc --noEmit && pnpm lint && npx vitest run src/lib/__tests__/utils.test.ts`
- Report: `.opencode/workflows/WF-20260811-100403-quickmatch-full-tests/reports/task-1.md`

---

### Task 2 (T2): jsdom + Testing Library infra

**Files (owned):** `package.json`, `pnpm-lock.yaml`, `vitest.config.ts`, `src/test/setup.ts` (new)
**Dependencies:** T1 (sequential checkout; do not conflict — only these files)

- Add devDeps: `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`,
  `@testing-library/user-event` (`pnpm add -D ...`)
- vitest.config.ts: keep node default; jsdom via per-file `// @vitest-environment jsdom` docblock.
  Add `setupFiles: ["src/test/setup.ts"]`? NO — setup must not break node env: put stubs in
  setup.ts but guard with `typeof document !== 'undefined'`; or use per-file setup via
  `import '@testing-library/jest-dom/vitest'` inside test files. Prefer: setup.ts with
  environment-agnostic stubs (navigator.vibrate, matchMedia only when undefined; framer-motion
  vi.mock NOT global — do it in test files). Verify existing 144 tests still pass after config.
- Acceptance: `pnpm add` succeeds; `npx vitest run` still green (144); tsc clean; lint clean.
- Verify: `npx tsc --noEmit && pnpm lint && npx vitest run`
- Report: `.opencode/workflows/WF-20260811-100403-quickmatch-full-tests/reports/task-2.md`

---

### Task 3 (T3): Dart rules compliance suite

**Files (owned):** `src/lib/__tests__/dart-rules.test.ts` (new)
**Dependencies:** T1 (uses fixed checkFinishablePoint)

Pure node-env suite encoding research/findings.md §4 math:
- Bogie reachability table: for each score 1..180, assert checkFinishablePoint matches the
  enumerated reachability truth for double and straight modes (spot-check full table:
  all 7 double bogies false; straight 168/165/162/159 true, 163/166/169 false, 171/174/177/180
  true; 1 true straight/false double; 2 true double; 170 true double, false straight? NO —
  verify: 170 straight reachable = 60+60+50 ✓ true).
- Bust matrix (reducer-level, matchSlice): below 0 bust; at 1 double bust; at 1 straight NOT
  bust; explicit bust; bust keeps score, +3 darts, 0 points, turn passes.
- Max checkout: 170 double via T20+T20+Bull sequence; 180 straight.
- Leg/set rotation compliance: alternation formulas (2p/3p sets+legs).
- PPR bookkeeping: bust +3 darts, normal +dartsUsed, points accumulation.
- Acceptance: all pass; tsc clean; lint clean.
- Verify: `npx tsc --noEmit && pnpm lint && npx vitest run src/lib/__tests__/dart-rules.test.ts`
- Report: `.opencode/workflows/WF-20260811-100403-quickmatch-full-tests/reports/task-3.md`

---

### Task 4 (T4): User-realistic full match simulation suite (UI-driven)

**Files (owned):** `src/components/__tests__/matchFlow.test.tsx` (new; jsdom docblock)
**Dependencies:** T2 (infra)

Drive the app EXACTLY like a human, using real components + real store:
- Test harness: configureStore(match + matchHistory reducers), vi.mock next/navigation
  (useRouter: push/replace/back spies; redirect: throw), next/link -> plain <a>, framer-motion
  -> passthrough (children only), canvas-confetti -> noop, navigator.vibrate stub.
- Scenario driver helpers: renderMatchSetupAndStart(settings) clicking through wizard
  (toggle checkout/format/score, REVIEW ORDER, START MATCH) asserting router.push('/match')
  and store status playing; renderMatchPage against store; submitScore via NumberPad taps
  (digit buttons + BUST + FINISH + dialog choices); assert store after each step.
- CORRECT variants (parametrized): 501 double-out 2p; 301 straight 2p; 101 legs 3p; sets mode
  firstToLegs 3 / firstToSets 2; finish via exact-score dialog (darts 1/2/3); leg transition
  -> START NEXT LEG -> alternation; match finished -> MatchFinished renders -> PLAY REMATCH
  -> status playing; stats link present.
- INCORRECT variants: typed exact bogie (169) blocked (no dispatch, input kept); typed >180
  rejected; overshoot -> bust (score unchanged, turn passes, +3 darts); score 1 double-out
  auto-bust; "Not double" in dialog -> bust dispatch; undo after bad turn -> state restored;
  abandon via ExitConfirmation -> status setup; stale input after undo.
- Acceptance: every parametrized scenario asserts full post-match state (winnerId, legsWon,
  setsWon, scores reset, status match_finished, per-leg turn counts, PPR arithmetic).
- Verify: `npx tsc --noEmit && pnpm lint && npx vitest run src/components/__tests__/matchFlow.test.tsx`
- Report: `.opencode/workflows/WF-20260811-100403-quickmatch-full-tests/reports/task-4.md`

---

### Task 5 (T5): Extended reducer edge cases

**Files (owned):** `src/lib/redux/__tests__/matchSlice.test.ts` (extend; keep existing 130 its green)
**Dependencies:** none (pure reducer; run after T3 to avoid parallel writes)

Add groups:
- Bogie exact-score submit at 169 -> leg win (behavior snapshot: reducer has no finishability
  guard; UI blocks it — document as intended UI-only enforcement)
- 170 double checkout sequence; straight 180
- Snapshot cap rollover: 21st submit drops oldest; undo 20x then no-op
- Undo chains across leg/set/match boundaries (some exist; add sets-enabled finish undo)
- 3p/4p set rotation matrix (firstToSets 2, firstToLegs 2, 3p: expected starters per leg/set)
- Rematch after sets-enabled match; rematch keeps order; colors preserved
- dartsUsed > 3 accepted (snapshot), negative score (already snapshotted — keep)
- Zero-player guard: startMatch with [] players then submitTurn -> crash (document; or skip if
  it throws — assert it throws? no: keep out if crash; instead test UI-level min-2 elsewhere)
- Acceptance: suite grows to ~170+ its; all pass; existing its untouched (no deletions).
- Verify: `npx tsc --noEmit && pnpm lint && npx vitest run src/lib/redux/__tests__/matchSlice.test.ts`
- Report: `.opencode/workflows/WF-20260811-100403-quickmatch-full-tests/reports/task-5.md`

---

## Integration Verification (after all tasks)
- `npx tsc --noEmit` clean; `pnpm lint` no errors; `npx vitest run` ALL PASS (target ~250+ tests);
  `pnpm build` succeeds (component tests must not break next build — ensure jsdom only in test files)

## Docs update (after integration)
- `docs/decisions/ADR-0008-dart-rules-compliance.md`: straight-out bogie fix rationale
  (math table), UI-only double-out enforcement, bust/darts conventions, test strategy adoption
  (component tests now in place — supersede ADR-0005 deferral note)
