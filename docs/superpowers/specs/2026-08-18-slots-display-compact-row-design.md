# Design: Compact slot row for DartSlotsDisplay

- **Date:** 2026-08-18
- **Status:** Approved by user (Q&A, 2026-08-18)
- **Workflow:** WF-20260818-124932-slots-display-compact-row

## Problem

The 3 dart slots currently span the full display width (`grid-cols-3`) with the
turn sum below them. The user wants:

1. Slots narrow — just wide enough for a 2-digit score.
2. The sum shown AFTER the slots (right side), same row, small and dim (unchanged
   styling).
3. Undo button placement resolved: bottom-left corner would overlap (display is
   only ~70px tall: 48px slot row + 40px button = 88px), so the user approved
   placing the undo at the end of the row — the familiar right-side spot from
   TurnDisplay.

## Decisions

- **D1 — Slot width:** fixed `w-16` (64px) each; `grid-cols-3` → `flex` row with
  `gap-1.5`. Max single-dart score is 60 (T20) — 2 digits always, fits `text-3xl`
  comfortably.
- **D2 — Sum position:** inline after the slots, `ml-2` spacing, styling unchanged
  (`text-sm font-mono text-zinc-600 tabular-nums`).
- **D3 — Undo position:** in-flow at the row end (after the sum), compact
  (`p-2`, size 24 icon), `aria-label="Undo dart"` kept, `disabled={!canUndo}` →
  `opacity-30`. No more absolute positioning.
- **D4 — Everything else unchanged:** bust flash classes on the row container,
  empty-slot dim border, submit/undo/bust logic, `useDartTurn` untouched.

## Layout (single row, centered)

```
[ 20 ][ 40 ][ 57 ] 60 ⟲
```

## Scope

- Modify: `src/components/scoring/DartSlotsDisplay.tsx` (layout only)
- Modify: `src/components/__tests__/dartSlotsDisplay.test.tsx` (slot query helpers)
- Modify: `src/components/__tests__/singleDartPad.test.tsx` (slot query helpers)
- Do NOT touch: `useDartTurn`, `TurnDisplay`, `SingleDartPad.tsx` logic,
  `NumberPad`, `matchFlow.test.tsx`, other components.

## Testing

- Update the slots query helper in both test files: the slots row is no longer
  `div.grid.grid-cols-3`. New helper reads the row from the sum line's parent:
  `document.querySelector('span.text-zinc-600')!.parentElement` → first 3
  children are the slot divs; assert `.textContent` per slot.
- Existing assertions (sum text, undo disabled/click, bust flash classes) stay
  valid with the new layout.
- Full suite must stay green (317 tests).

## Verification

```bash
npm run test
npx tsc --noEmit
npm run lint
```
