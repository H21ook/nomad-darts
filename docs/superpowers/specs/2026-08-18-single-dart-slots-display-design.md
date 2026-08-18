# Design: Single Dart Mode — 3-Slot Dart Display

- **Date:** 2026-08-18
- **Status:** Approved by user (brainstorming session)
- **Workflow:** pending init

## Problem

In Single dart mode the turn display (`TurnDisplay`) shows the running turn total as
one big cyan number (e.g. `40`) next to a `1/3` counter and a breakdown string.
Two UX problems reported by the user:

1. Throwing the first dart makes it look like the score is being subtracted from the
   total immediately — the big cyan number reads as a score change, not as the sum of
   the darts thrown this turn.
2. The user wants to see each dart's score individually.

## Goal

In **Single dart mode only**, replace the turn display with:

- **3 input slots** — one per dart. Each dart press fills the next slot with that
  dart's points (e.g. `20`, `40`, `57`).
- **The sum of the 3 darts** shown below the slots in small, dim text.

All other modes (3 DARTS / BOARD) keep the current `TurnDisplay` unchanged.

## Scope

- **In scope:** Single dart mode display only.
- **Out of scope:** BOARD mode display, `useDartTurn` logic, scoring rules, the
  3 DARTS (NumberPad) display, match page, AppBar, ScoreBoard.

## Decisions (user-confirmed)

- **D1 — Scope:** Only Single dart mode. BOARD mode keeps `TurnDisplay` unchanged.
- **D2 — Slot content:** Points only (e.g. `20`, `40`, `57`). No multiplier prefix
  (`S20`/`D20`/`T19`). The multiplier buttons row is separate.
- **D3 — Undo:** Keep the Undo button (undoes the last dart). Positioned in the new
  display, same `aria-label="Undo dart"`.
- **D4 — Bust:** Red flash on the slots container + slots clear (same behavior as the
  current `bustFlash`, only the visual container changes).

## Architecture (Approach A — dedicated component)

### New component: `src/components/scoring/DartSlotsDisplay.tsx`

```
interface DartSlotsDisplayProps {
  darts: DartEntry[];                    // from useDartTurn (import type from @/hooks/useDartTurn)
  total: number;                         // running turn total
  onUndo: () => void;
  canUndo: boolean;
  bustFlash?: boolean;
}
export default function DartSlotsDisplay(props: DartSlotsDisplayProps)
```

**Layout (top to bottom), mirroring the TurnDisplay flex slot (`flex-[0.8] min-h-[70px]`):**

1. **Slots row** — `grid grid-cols-3 gap-1.5`, container `bg-zinc-900/40 border
   border-white/5 rounded-2xl` with `overflow-hidden`, centered content. Each slot:
   - filled: big mono number, `text-3xl font-black text-cyan-400 tabular-nums`
   - empty: no number, dimmer border
2. **Sum line** — centered, small and dim: `text-sm font-mono text-zinc-600`
   (e.g. `60`). Shows `0` when the turn is empty.
3. **Undo button** — absolute right, vertically centered, `aria-label="Undo dart"`,
   `disabled={!canUndo}` → `opacity-30`, same icon
   (`IconRotateClockwise2`, size 24), `onPointerDown` with `e.preventDefault()` +
   guarded `navigator.vibrate(15)` (repo convention).

**Bust flash:** `bustFlash` toggles the container classes to
`bg-red-500/20 border-red-500/40` (identical to `TurnDisplay`).

### Modified component: `src/components/scoring/SingleDartPad.tsx`

- Replace `<TurnDisplay ...>` usage with `<DartSlotsDisplay ...>`.
- Pass `darts`, `total`, `onUndo={undoDart}`, `canUndo={darts.length > 0}`,
  `bustFlash={lastOutcome === 'bust'}`.
- Remove the `breakdown` useMemo (no longer needed).
- Remove the now-unused `TurnDisplay` import.
- All other logic (useDartTurn, multiplier state, leg-over reset, segment grid,
  BULL button) unchanged.

### Unchanged (explicitly)

- `src/components/scoring/TurnDisplay.tsx` (still used by `DartBoardPad`)
- `src/hooks/useDartTurn.ts` — `darts`, `total`, `lastOutcome` API unchanged
- `src/components/scoring/DartBoardPad.tsx`
- `src/components/scoring/NumberPad.tsx`
- `src/components/__tests__/matchFlow.test.tsx` — its `/Undo/` selector matches the
  kept `aria-label="Undo dart"`
- No new npm dependencies.

## Data flow

`useDartTurn` continues to own turn state. `SingleDartPad` renders
`DartSlotsDisplay` with:
- `darts[i].points` → slot i (slots fill left to right, darts array order)
- `total` → the dim sum line
- `undoDart` → Undo button
- `lastOutcome === 'bust'` → red flash

Submit timing is unchanged: auto-submit on the 3rd dart, immediate submit on bust,
immediate submit on finish. After submit the darts array clears and the slots empty.

## Error handling / edge cases

- **Bust:** red flash, slots clear, `onSubmit(0, n, true)` — unchanged logic.
- **Finish (double-out):** submit fires, slots clear — unchanged logic.
- **Leg over (`legOver`):** remaining is forced to 0, any dart busts — unchanged.
- **Empty turn:** all 3 slots empty, sum line shows dim `0`.
- **Undo at 0 darts:** button disabled (dimmed).

## Testing

`src/components/__tests__/singleDartPad.test.tsx` updates:

1. Test "records D20 = 40 after Double then 20, then resets to single" — replace the
   `1/3` assertion and the `40`-then-`60` single-number expectations with slot
   assertions: after D20 the first slot shows `40` and the sum line shows `40`;
   after S20 the slots show `40` and `20` and the sum line shows `60`.
2. All other existing tests (auto-submit, bust, finish, undo, multiplier blocking,
   D25 = 50) keep their assertions — verify each still passes (some may need
   `selector` narrowing if a number now appears in two slots, e.g. duplicate dart
   values; prefer `within` slot queries).

New tests for `DartSlotsDisplay` behavior (either in a new
`dartSlotsDisplay.test.tsx` or via `singleDartPad.test.tsx`):

- 3 empty slots render initially; no numbers inside.
- Darts fill slots left to right.
- Sum line renders the total, dim styling.
- `bustFlash` applies the red container classes.
- Undo button disabled when no darts, enabled after a dart.

`dartBoardPad.test.tsx`, `scoreInputPanel.test.tsx`, `matchFlow.test.tsx` must stay
green with **no changes**.

## Verification

```bash
npm run test
npx tsc --noEmit
npm run lint
```

Full suite stays green (312 tests + new/changed).
