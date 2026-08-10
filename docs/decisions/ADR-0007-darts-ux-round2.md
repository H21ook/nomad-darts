# ADR-0007 — Darts UX round 2: wizard local state, popstate removal, English dialog, darts-row removal, mode-aware finishability

- **Status:** Accepted (implemented 2026-08-10, workflow WF-20260808-120837-darts-ux-round2)
- **Date:** 2026-08-10

## Context

Three issues reported after ADR-0006: (1) after a mid-game exit via the X dialog, Quick Start
skipped straight to the players page (step 2) instead of step 1, and the exit dialog text was
Mongolian while the app UI is English; (2) the "Darts used" 1/2/3 row under BUST/Bull/FINISH
was confusing — selecting 2 implied a 2-dart turn, but per X01 rules a normal turn is always
3 darts; (3) FINISH was not disabled on scores where a 3-dart finish is impossible, and the
exact-score entry path bypassed the finishability check.

## Decisions

- **D11 — Wizard step in local state only:** `MatchSetup` tracks `step` with `useState(1)`;
  `useSearchParams`/`router.replace('?step=2')` removed. Fresh navigation always starts at
  step 1; the history-residue bug class is eliminated. Supersedes ADR-0006 D7.
- **D12 — Popstate interceptor removed:** the dummy `pushState` + popstate listener in
  `match/page.tsx` is deleted. Hardware back now leaves the match (state is persisted and
  resumable via the landing Resume card); the interceptor was the only non-user path to the
  exit dialog.
- **D13 — Exit dialog in English:** `ExitConfirmation` strings translated ("Exit game?",
  "Current match progress will be lost.", "Continue"/"Exit"); design unchanged.
- **D14 — Darts row removed entirely:** the 1/2/3 "Darts used" row is deleted from
  `NumberPad`. Normal turns are always 3 darts (enforced in `handleSubmit`); the checkout
  darts count is asked once, in `FinishConfirmation` ("How many darts did you use to
  finish?"). The FINISH shortcut now opens the same dialog instead of submitting directly,
  so the double-out question and darts count are never bypassed. This also removes the last
  stale 1/2-selection vector.
- **D15 — Mode-aware finishability + guarded checkout path:**
  `checkFinishablePoint(currentScore, checkout)` is checkout-mode-aware (straight-out allows
  score 1; double-out requires >= 2). FINISH is disabled when a 3-dart finish is impossible
  (score > 170, bogies, score 1 with double-out). The exact-score entry path opens
  `FinishConfirmation` only when `finalScore === currentScore && canFinish`; non-finishable
  exact-score entries (e.g. 169) are **blocked** — submitting them as a normal turn would
  incorrectly win the leg at remaining 0.
- **D16 — Comprehensive match-logic test suite:** `matchSlice.test.ts` expanded from 31 to
  130 `it()` blocks (144 tests total) covering start variations, submitTurn guards,
  auto-bust edges, checkout finishes with darts 1/2/3, leg/set/match finish sequences,
  startNextLeg edges, deep undo (across leg boundaries and after finishes), rematch,
  abandon + resume semantics, bookkeeping, and store-level integration.

## Consequences

- Quick Start always lands on step 1; no step-2 skip after exit.
- No spurious exit dialog when starting from the players page; hardware back leaves the
  match cleanly (resumable).
- The scoring pad is simpler: no darts selector; checkout darts are asked in the dialog.
- Bogie exact-score entries cannot win a leg; FINISH reflects true finishability per mode.
- 144 automated tests guard the match lifecycle; manual browser walkthrough verified the
  full flows (exit → restart at step 1, no dialog on start, 169 blocked, 40 finishable,
  straight-out score 1 finishable, checkout via dialog records correct darts).

## Known follow-ups (non-blocking)

- Dead `value === 'FINISH'` branch and unreachable FINISH-selected styling in `NumberPad`
  (harmless; routes to the dialog gate).
- Behavior snapshots in tests document reducer quirks (no double-out parity enforcement,
  `dartsUsed` default 0, bust = 3 darts) — revisit if the reducer is hardened.
