# ADR-0008 — Dart rules compliance: straight-out bogies, UI-only double-out enforcement, bust/darts conventions, component test strategy

- **Status:** Accepted (implemented 2026-08-11/14, workflow WF-20260811-100403-quickmatch-full-tests)
- **Date:** 2026-08-14

## Context

The Quick Match engine (ADR-0002/0003) enforced double-out finishability but had gaps:
(1) straight-out mode allowed impossible finishes (e.g. 169, 163 — no 3-dart straight
combination exists); (2) double-out finishability was enforced only in the reducer's
submitTurn guard, while the UI's exact-score path could bypass it; (3) bust and darts-used
conventions were implicit; (4) ADR-0005 deferred UI/component-level tests — no suite drove
the app like a human through the real components.

## Decisions

- **D1 — Straight-out bogie table (T1):** checkFinishablePoint in src/lib/utils.ts now
  rejects straight-out bogies [163, 166, 169, 172, 173, 175, 176, 178, 179] (no 3-dart
  straight finish exists) and double-out bogies [169, 168, 166, 165, 163, 162, 159] (no
  3-dart double finish). Double-out range 2..170, straight range 1..180.

  Math rationale (3 darts, max 60 each):
  - Straight-out: 180 = T20+T20+T20; 179 = T20+T20+T19; 178 = T20+T20+T18; 177 = T20+T19+T20;
    176 = T20+T20+T16; 175 = T20+T20+T15; 174 = T20+T20+T14; 173 = T20+T20+T13;
    172 = T20+T20+T12; 171 = T20+T19+T18; 170 = T20+T20+T10; 169 = T20+T20+T9;
    168 = T20+T19+T17; 167 = T20+T20+T7; 166 = T20+T20+T6; 165 = T20+T19+T16;
    164 = T20+T20+T4; 163 = T20+T20+T3; 162 = T20+T19+T15; 161 = T20+T20+T1.
    The listed bogies are the only values in 161..180 with no 3-dart straight combination.
  - Double-out: max 170 (T20+T20+Bull); the listed bogies are the only values in 159..170
    with no 3-dart double finish (e.g. 169 = T20+T20+D? no — 169 = T20+T20+T19 is straight
    only; double-out requires the last dart to be a double, and 169 cannot be split into
    two trebles + a double).
- **D2 — UI-only double-out enforcement (T4 verification):** the reducer keeps no
  finishability guard on the exact-score path — enforcing it there would be redundant with
  the UI. Enforcement lives in NumberPad.handleSubmit: an exact-score entry that equals the
  current score only opens the FinishConfirmation dialog when checkFinishablePoint passes;
  otherwise NO dispatch occurs and the input is kept. A remaining score of 1 in double-out
  mode auto-busts in the reducer (remaining < 0 or (remaining === 1 && checkout === double)).
  The matchFlow UI suite proves the guard end-to-end: bogie 169 typed -> no dispatch, input
  kept, state unchanged; >180 typed -> rejected silently.

- **D3 — Bust/darts conventions (T3/T4):** a bust (overshoot, explicit BUST, "Not double",
  auto-bust at 1) records points 0, forces dartsUsed 3, leaves the score unchanged, and
  passes the turn. Normal turns are always 3 darts (dartsUsed forced 3 in NumberPad). The
  checkout darts count (1/2/3) is asked once in FinishConfirmation. Undo restores the
  pre-turn snapshot (darts and points included).

- **D4 — Component test strategy adopted (T4):** matchFlow.test.tsx (17 UI-driven tests,
  jsdom) drives the real components through a real store: wizard -> match page -> NumberPad
  taps -> checkout dialog -> leg transitions -> rematch, plus incorrect-input variants
  (bogies, busts, undo, abandon). This supersedes the deferral note in ADR-0005 — component
  tests are now in place and kept green by the standard suite (257 tests total across 4 files
  as of 2026-08-14). Full-match scenarios assert winnerId, legsWon, setsWon, scores reset,
  per-leg turn counts, and PPR arithmetic.

## Consequences

- Straight-out mode can no longer be left at an impossible score; the FINISH shortcut and
  exact-score dialog share the same finishability gate.
- Test pyramid is now complete: reducer-level (matchSlice.test.ts, 171 tests), rule-level
  (dart-rules.test.ts, 51 tests), util-level (utils.test.ts), and UI-driven flow
  (matchFlow.test.tsx, 17 tests) — all green in one `npx vitest run`.
- Future UI changes that alter NumberPad/FinishConfirmation behavior must keep
  matchFlow.test.tsx green (it pins the human-visible interaction contract).
