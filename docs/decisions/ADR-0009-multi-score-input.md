# ADR-0009 — Multi-mode score input: 3 DARTS / 1 DART / BOARD pads, per-dart rules, actual darts on bust

- **Status:** Accepted (implemented 2026-08-17/18, workflow WF-20260817-104302-multi-score-input)
- **Date:** 2026-08-18

## Context

Score entry was a single fixed numeric pad (NumberPad): the player typed the total of a
3-dart turn, and every turn was assumed to be exactly 3 darts. This forced two
inaccuracies: (1) players who throw fewer than 3 darts per turn (common in casual play)
had no way to record per-dart scores; (2) on a bust, stats always counted 3 darts even
when the player busted on dart 1 or 2, skewing PPR/AVG. The checkout darts count was
asked once in the FinishConfirmation dialog, but bust darts were never recorded
accurately.

## Decisions

- **D1 — Three input modes (T1/T4/T5/T6):** score entry is now a `ScoreInputPanel` with
  three tabs: **3 DARTS** (the existing numeric pad, default mode, unchanged behavior),
  **1 DART** (per-dart entry via a 1–25 segment grid + Double/Triple multiplier buttons,
  `SingleDartPad`), and **BOARD** (graphical touch dartboard, `DartBoardPad` + pure SVG
  `DartBoard`, large screens only). All modes share one design system and one rules
  engine (`useDartTurn`).
- **D2 — Multiplier-first interaction (1 DART and BOARD):** press `Double` or `Triple`
  first, then a segment; `Double`+`20` = D20 = 40. There is no Single button — pressing a
  segment directly records a Single. The multiplier auto-resets to Single after each
  dart. Segment order in 1 DART is 1–25 ascending, not dartboard layout.
- **D3 — Bull rules (1 DART and BOARD):** two separate buttons — `25` and `BULL (50)`.
  Bull accepts only Single (25) and Double (50) multipliers; `Double`+`25` = 50 (same as
  BULL). Triple+25, Triple+BULL, and Double+BULL (100) are disabled — no impossible dart
  scores by construction. On BOARD, tapping the inner bull = 50 and the outer bull ring =
  25; with `Double` active, an outer bull tap = 50 (forgiveness, matches Double+25).
- **D4 — Live per-dart bust/finish (T3):** after each dart, `running total > remaining`
  → immediate bust, turn passes with `dartsUsed` = actual darts entered (not forced 3).
  `running total === remaining` → checkout; in double-out mode the last dart must be a
  Double or Bull(50), otherwise it is a bust. Turns end only by 3rd dart (auto-submit),
  bust, or finish — there is no Submit button in per-dart modes. Undo removes the last
  dart (undo arrow in the display row).
- **D5 — Bust records actual darts used (T1):** `matchSlice.ts` no longer forces
  `dartsUsed: isBust ? 3 : dartsUsed`; bust turns now record the actual darts entered.
  Numeric 3 DARTS mode keeps its current behavior (BUST button still sends 3 darts).
- **D6 — BOARD visibility guard (T6):** the BOARD tab is hidden below 768px (CSS `md:`
  + JS `matchMedia('(min-width: 768px)')` guard). If BOARD is active and the viewport
  shrinks below 768px, the panel switches to 1 DART automatically (same per-dart logic,
  no data loss).
- **D7 — Mode persistence (T4):** the last selected mode is persisted in localStorage
  under `nomad-darts:score-input-mode`; the guard is re-checked at render so BOARD is
  never shown on small screens even when persisted.

## Alternatives considered

- **Numeric-only single-dart entry** (one numeric field per dart, no segment grid): the
  player would type any number 1–60 per dart, which allows impossible scores (e.g. 59,
  or a triple on a segment that cannot be tripled) and requires the app to reject or
  silently correct them. Rejected: the segment + multiplier model makes impossible
  scores unrepresentable by construction, which is simpler and safer than validating
  free-form numbers.

## Consequences

- Reducer semantics change: bust turns record the actual `dartsUsed` (per-dart modes),
  so PPR/AVG stats reflect real darts thrown; the numeric 3 DARTS mode still reports 3
  darts on bust. `matchSlice.test.ts` bust assertions updated accordingly.
- FinishConfirmation dialog is only used in numeric 3 DARTS mode; per-dart modes submit
  finishes immediately with the actual darts used (the multiplier is known, so no dialog
  is needed).
- New shared pieces: `useDartTurn` (per-dart turn state: add dart, undo, running total,
  bust/finish checks, auto-submit) and `src/lib/dartboard.ts` (pure geometry: angle →
  segment, radius → bull inner/outer, board constants).
- Implemented in commits b989204 (bust darts fix), b652e1d (dartboard math), d93d2ff
  (useDartTurn), ad79a73 (SingleDartPad), c7a781f (DartBoardPad), e17e449
  (ScoreInputPanel).