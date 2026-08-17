# Multi-Mode Score Input — Design (approved 2026-08-17)

## Objective

Replace the single fixed score-entry pad with **three input modes** so players can
record scores the way they actually throw:

1. **3 DARTS** — the current numeric pad (total score for a 3-dart turn). Unchanged.
2. **1 DART** — per-dart entry via a 1–25 segment grid + Double/Triple multiplier buttons.
3. **BOARD (Touch)** — graphical dartboard; tap a segment to record a dart. Large screens only (≥768px).

All modes share one design system and one rules engine. Modes record the real
number of darts used, which feeds correct PPR/AVG statistics.

## Decisions (user-approved)

### Interaction model (1 DART and BOARD)
1. **Multiplier-first**: press `Double` or `Triple`, then press a segment. `Double`+`20` = D20 = 40. Multiplier auto-resets to Single after each dart.
2. **No Single button**: pressing a segment directly = Single. Multiplier buttons are only `Double` and `Triple`.
3. **Segment order in 1 DART**: numbers 1–25 in ascending order (1,2,3,…,25), not dartboard layout.
4. **Bull** (1 DART): two separate buttons — `25` and `BULL (50)`. Bull accepts only Single (25) and Double (50) multipliers. `Double`+`25` = 50 (same as BULL). **Triple+25 and Triple+BULL are disabled. Double+BULL (100) is disabled** — no impossible dart scores by construction.
5. **Undo per dart** in 1 DART and BOARD modes (last dart removed). The undo arrow lives in the display row.
6. **No Submit button** in 1 DART and BOARD modes. Turns end only by: 3rd dart (auto-submit), bust (immediate), or finish (immediate).
7. **BOARD input**: `Double`/`Triple` buttons identical to 1 DART; tapping a segment on the board records the dart with the active multiplier. Rings are visual reference only — multiplier comes from the buttons, not from tap position.
8. **BOARD bull**: tap inner bull = 50, tap outer bull ring = 25. With `Double` active, outer bull tap = 50 (forgiveness, matches Double+25).
9. **BOARD visibility**: tab hidden below 768px (CSS `md:` + JS matchMedia guard). If BOARD is active and the viewport shrinks below 768px, switch to 1 DART automatically (same per-dart logic, no data loss).

### Rules (live, per-dart, both 1 DART and BOARD)
10. **Live bust**: after each dart, `running total > remaining` → BUST immediately; turn passes to next player with `dartsUsed` = actual darts entered (not forced 3).
11. **Live finish**: `running total === remaining` → CHECKOUT. In double-out mode the last dart must be a Double or Bull(50); otherwise it is a bust (turn ends immediately, score unchanged).
12. **Bust stats fix (reducer)**: `matchSlice.ts` changes `dartsUsed: isBust ? 3 : dartsUsed` → use the actual `dartsUsed` for busts. Related tests updated. Numeric 3 DARTS mode keeps its current behavior (BUST button still sends 3 darts).

### Display (all modes)
13. **Score display keeps the current visual style** in every mode: large mono number, `bg-zinc-900/40 rounded-2xl border-white/5` container, action button on the right (backspace in 3 DARTS, undo in per-dart modes). Content adapts: 3 DARTS shows typed value; per-dart modes show running total · dart count (2/3) · breakdown (e.g., `T20 · S7 · D20`).

### Design system
14. Do not deviate from the current design system: dark theme (zinc-900 surfaces, `border-white/5`, `rounded-2xl`), color codes (cyan = active/confirm, green = bull, red = bust), `FastButton` press behavior (`pointerdown`, `whileTap` scale 0.92 → cyan), `select-none touch-none`, vibration feedback, `font-black`/`font-mono`, Tabler icons, framer-motion.

## Architecture

```
MatchPage
└── ScoreInputPanel (NEW — mode tabs + renders active pad)
    ├── Mode tabs: [3 DARTS] [1 DART] [BOARD]   (BOARD hidden < 768px)
    ├── NumberPad      (existing — 3 DARTS mode, unchanged)
    ├── SingleDartPad  (NEW — 1 DART: 1–25 grid + D/T + 25 + BULL)
    └── DartBoardPad   (NEW — BOARD: D/T buttons + SVG board)
```

New files:
| File | Purpose |
|---|---|
| `src/components/scoring/ScoreInputPanel.tsx` | Mode switcher (3 tabs), persists last mode in localStorage, BOARD availability guard |
| `src/components/scoring/SingleDartPad.tsx` | 1–25 grid + Double/Triple + 25 + BULL buttons |
| `src/components/scoring/DartBoardPad.tsx` | D/T buttons + DartBoard + live turn state |
| `src/components/scoring/DartBoard.tsx` | Pure SVG dartboard (standard geometry), segment taps via pointer |
| `src/lib/dartboard.ts` | Pure functions: angle → segment (order 20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5), radius → bull inner/outer, board constants |
| `src/hooks/useDartTurn.ts` | Shared per-dart turn state: add dart, undo, running total, bust/finish checks, auto-submit callback |

Changed files:
| File | Change |
|---|---|
| `src/lib/redux/matchSlice.ts` | Bust keeps actual `dartsUsed` |
| `src/app/match/page.tsx` | Replace `<NumberPad>` with `<ScoreInputPanel>` |
| `src/lib/redux/__tests__/matchSlice.test.ts` | Update bust-darts assertions |
| `src/components/__tests__/matchFlow.test.tsx` | Adapt to ScoreInputPanel (3 DARTS default keeps flows working) |

Board geometry (R = 1): double ring 0.953R–1.0R, triple ring 0.582R–0.629R, outer bull 0.094R, inner bull 0.037R. Segment order clockwise from top: 20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5 (18° each). Rings are drawn for realism; tap multiplier comes from buttons (decision 7), except bull which is position-based (decision 8).

## Rules engine (`useDartTurn`)

- `addDart(segment, multiplier)` → appends `{segment, multiplier}`, recomputes total.
- After each dart (in order):
  1. total > remaining → bust (submit `{score: 0, dartsUsed: n, isBust: true}`)
  2. total === remaining → finish if (straight-out) or (double-out and last dart is Double or Bull/50); otherwise bust
  3. dart count === 3 → normal submit `{score: total, dartsUsed: 3}`
- `undoDart()` removes the last dart; if 0 darts remain, resets to neutral state.
- Finish on dart 1 or 2 submits immediately with the actual darts used (no dialog — multiplier is known).

## Edge cases

- Bust on 2nd dart: immediate switch, stats count 2 darts (confirmed).
- 10 remaining, 1st dart scores 20 → bust, immediate switch (confirmed).
- Double-out finish requires last dart Double/Bull; a single that exactly matches remaining is a bust (e.g., 20 remaining, S20 → bust).
- 1 remaining, straight-out: S1 finishes; anything else busts.
- BOARD mode active while viewport drops below 768px → fall back to 1 DART.
- localStorage mode persistence must never show BOARD on small screens (guard re-checked at render).
- No impossible scores by construction in per-dart modes (1–20 segments × S/D/T, 25/50, no T-bull, no D-bull).

## Out of scope

- Cricket/Practice game modes (same input panel will be reused later, but not built now).
- Per-dart score history persistence beyond the existing Turn model.
- Changing the 3 DARTS numeric pad behavior (BUST/FINISH dialog stays).

## Testing

- `src/lib/dartboard.ts`: unit tests — angle → segment for all 20 boundaries, radius → bull classification, no-impossible-score invariants.
- `useDartTurn`: bust on 2nd dart, finish on 1st/2nd dart, double-out single-finish = bust, undo, 3rd-dart auto-submit.
- `matchSlice.test.ts`: bust records actual dartsUsed (update existing "bust = 3" assertions; numeric-mode BUST still sends 3).
- Component tests (jsdom): mode tabs switch pads; 1 DART flow (Double+20 = D20); BOARD tab absent below 768px; existing match flows stay green.
