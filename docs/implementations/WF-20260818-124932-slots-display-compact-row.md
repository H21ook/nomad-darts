# Workflow Implementation Report

## Metadata

- **Workflow ID:** `WF-20260818-124932-slots-display-compact-row`
- **Original objective:** Make the 3 dart input slots narrow (2-digit fit) and show the turn sum after them in the same row, small and dim; undo moves to the row end
- **Project root:** `D:\own\nomad-darts`
- **Started:** 2026-08-18T12:49:32+00:00
- **Completed:** 2026-08-18T13:03:16+00:00
- **Risk classification:** `low`
- **Final status:** `completed`

## Outcome

All recorded implementation tasks passed task-level verification and independent review, integration verification passed, and durable documentation was updated before compaction.

## Approved Plan

# Compact Slot Row Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the 3 dart slots narrow (2-digit fit) and show the turn sum after them in the same row (small, dim), with the undo button at the row end.

**Architecture:** Single-component layout change to `DartSlotsDisplay` + test-helper updates in its two test files. No logic changes.

**Spec:** `docs/superpowers/specs/2026-08-18-slots-display-compact-row-design.md` (user-approved 2026-08-18)

## Global Constraints

- Only `src/components/scoring/DartSlotsDisplay.tsx` and its two test files change.
- Do NOT touch: `src/hooks/useDartTurn.ts`, `src/components/scoring/TurnDisplay.tsx`, `SingleDartPad.tsx` logic (imports of DartSlotsDisplay stay), `NumberPad.tsx`, `ScoreInputPanel.tsx`, `src/app/match/page.tsx`, `src/components/__tests__/matchFlow.test.tsx`, `dartBoardPad.test.tsx`, `scoreInputPanel.test.tsx`.
- Undo button: `aria-label="Undo dart"` KEPT (matchFlow selects `/Undo/`); `disabled={!canUndo}` → `opacity-30`; guarded `navigator.vibrate(15)`; no absolute positioning anymore.
- Sum line: `text-sm font-mono text-zinc-600 tabular-nums` KEPT — only position changes (inline after slots, `ml-2`).
- Slots: `w-16` (64px) fixed width, `min-h-[48px]`, `gap-1.5` row, `border-cyan-500/30` filled / `border-white/5` empty, number `text-3xl font-mono font-black tracking-widest tabular-nums text-cyan-400`.
- Bust flash classes on the row container: `bg-red-500/20 border-red-500/40` KEPT.
- React 19: no `JSX.Element` return types.
- Verification: `npm run test`, `npx tsc --noEmit`, `npm run lint` — all must pass (full suite stays 317).

---

### Task 1: Compact slot row in DartSlotsDisplay

**Files:**
- Modify: `src/components/scoring/DartSlotsDisplay.tsx`
- Modify: `src/components/__tests__/dartSlotsDisplay.test.tsx`
- Modify: `src/components/__tests__/singleDartPad.test.tsx`

**Interfaces:**
- Consumes: existing `DartSlotsDisplayProps { darts, total, onUndo, canUndo, bustFlash }` — unchanged.
- Produces: same interface; consumers (`SingleDartPad.tsx`) unaffected.

- [ ] **Step 1: Update the failing test helpers first**

In `src/components/__tests__/dartSlotsDisplay.test.tsx`, replace the helpers:

```tsx
const slotsRow = () => document.querySelector('div.grid.grid-cols-3');
const sumLine = () => document.querySelector('span.text-zinc-600');
```

with:

```tsx
// The slots row container is the parent of the sum line; its first 3
// children are the slot divs (then the sum span, then the undo button).
const row = () => document.querySelector('span.text-zinc-600')!.parentElement!;
const slotDivs = () => [...row().children].slice(0, 3) as HTMLElement[];
const sumLine = () => document.querySelector('span.text-zinc-600');
```

Then update the two display assertions:

Test "renders three empty slots and a dim sum of 0" — replace:

```tsx
    expect(slotsRow()!.querySelectorAll('div').length).toBe(3);
    expect(slotsRow()!.querySelectorAll('span').length).toBe(0); // no numbers
```

with:

```tsx
    expect(slotDivs().length).toBe(3);
    expect(slotDivs().every((s) => !s.textContent)).toBe(true); // no numbers
```

Test "fills slots left to right with each dart points" — replace:

```tsx
    const texts = [...slotsRow()!.querySelectorAll('span')].map((s) => s.textContent);
    expect(texts).toEqual(['20', '40']);
```

with:

```tsx
    expect(slotDivs()[0]!.textContent).toBe('20');
    expect(slotDivs()[1]!.textContent).toBe('40');
    expect(slotDivs()[2]!.textContent).toBe('');
```

In `src/components/__tests__/singleDartPad.test.tsx`, replace the helpers:

```tsx
const slotsRow = () => document.querySelector('div.grid.grid-cols-3');
const sumLine = () => document.querySelector('span.text-zinc-600');
```

with:

```tsx
const row = () => document.querySelector('span.text-zinc-600')!.parentElement!;
const slotDivs = () => [...row().children].slice(0, 3) as HTMLElement[];
const sumLine = () => document.querySelector('span.text-zinc-600');
```

Then update the three display assertions (all currently use `within(slotsRow()!)...`):

1. Test "records D20 = 40 after Double then 20, then resets to single" — replace:

```tsx
    expect(within(slotsRow()!).getByText('40')).toBeInTheDocument(); // first slot
    expect(sumLine()!.textContent).toBe('40');                       // dim sum
```

and:

```tsx
    expect(within(slotsRow()!).getByText('20')).toBeInTheDocument(); // second slot
    expect(within(slotsRow()!).getByText('40')).toBeInTheDocument(); // first slot stays
    expect(sumLine()!.textContent).toBe('60');                       // 40 + S20
```

with:

```tsx
    expect(slotDivs()[0]!.textContent).toBe('40');
    expect(sumLine()!.textContent).toBe('40');
```

and:

```tsx
    expect(slotDivs()[0]!.textContent).toBe('40');
    expect(slotDivs()[1]!.textContent).toBe('20');
    expect(sumLine()!.textContent).toBe('60');
```

2. Test "undoDart removes the last dart and restores the total" — replace:

```tsx
    expect(within(slotsRow()!).getByText('20')).toBeInTheDocument();
    expect(sumLine()!.textContent).toBe('20');
```

with:

```tsx
    expect(slotDivs()[0]!.textContent).toBe('20');
    expect(sumLine()!.textContent).toBe('20');
```

3. Test "records Double + 25 = 50 (same as BULL)" — replace:

```tsx
    expect(within(slotsRow()!).getByText('50')).toBeInTheDocument();
    expect(sumLine()!.textContent).toBe('50');
```

with:

```tsx
    expect(slotDivs()[0]!.textContent).toBe('50');
    expect(sumLine()!.textContent).toBe('50');
```

If the `within` import in `singleDartPad.test.tsx` is now unused, remove it from the import line to keep lint clean.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/components/__tests__/dartSlotsDisplay.test.tsx src/components/__tests__/singleDartPad.test.tsx`
Expected: FAIL — `span.text-zinc-600` exists but `row().children` ordering/layout differs from the old grid (slot divs are no longer the first 3 children of a grid row, or `div.grid.grid-cols-3` selector no longer matches). Note: with the OLD component the new helpers may accidentally pass — the real failure appears after Step 3 if assertions were mis-adapted; Step 4's green run is the gate.

- [ ] **Step 3: Modify DartSlotsDisplay layout**

In `src/components/scoring/DartSlotsDisplay.tsx`, replace the entire `return (...)` block with:

```tsx
  return (
    <div className="flex-[0.8] min-h-[70px]">
      <div
        className={cn(
          'h-full flex items-center justify-center gap-1.5 bg-zinc-900/40 rounded-2xl border border-white/5 overflow-hidden transition-colors duration-150 px-2',
          bustFlash && 'bg-red-500/20 border-red-500/40'
        )}
      >
        {[0, 1, 2].map((i) => {
          const dart = darts[i];
          return (
            <div
              key={i}
              className={cn(
                'flex items-center justify-center rounded-xl border w-16 min-h-[48px]',
                dart ? 'border-cyan-500/30' : 'border-white/5'
              )}
            >
              {dart && (
                <span className="text-3xl font-mono font-black tracking-widest tabular-nums text-cyan-400">
                  {dart.points}
                </span>
              )}
            </div>
          );
        })}
        <span className="ml-2 text-sm font-mono text-zinc-600 tabular-nums">{total}</span>
        <button
          type="button"
          aria-label="Undo dart"
          onPointerDown={(e) => {
            e.preventDefault();
            if (navigator.vibrate) navigator.vibrate(15);
            if (canUndo) onUndo();
          }}
          disabled={!canUndo}
          className={cn(
            'ml-1 p-2 text-zinc-500 active:text-white transition-opacity',
            !canUndo && 'opacity-30'
          )}
        >
          <IconRotateClockwise2 size={24} />
        </button>
      </div>
    </div>
  );
```

Notes: the outer wrapper drops `relative` (undo is no longer absolutely positioned); the container becomes a horizontal flex row (`flex items-center justify-center`); slots get `w-16`; sum gets `ml-2`; undo becomes an in-flow button at the row end with `ml-1 p-2`. Props, imports (IconRotateClockwise2, cn, DartEntry), and all logic stay.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/components/__tests__/dartSlotsDisplay.test.tsx src/components/__tests__/singleDartPad.test.tsx`
Expected: all PASS (5 dartSlotsDisplay + 7 singleDartPad).

- [ ] **Step 5: Run full verification**

Run: `npm run test && npx tsc --noEmit && npm run lint`
Expected: full suite 317/317, tsc exit 0, lint clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/scoring/DartSlotsDisplay.tsx src/components/__tests__/dartSlotsDisplay.test.tsx src/components/__tests__/singleDartPad.test.tsx
git commit -m "refactor(darts): compact slot row with inline sum and undo"
```


## Research Summary and Evidence

_No artifacts recorded._

## Task State Summary

### T1

- **Objective:** Compact slot row: w-16 slots, inline sum, in-flow undo; update both test files' helpers
- **Status:** `completed`
- **Agent:** `wf-implement`
- **Verification:** `not-recorded`
- **Review:** `not-recorded`
- **Dependencies:** None
- **Owned files:** src/components/scoring/DartSlotsDisplay.tsx, src/components/__tests__/dartSlotsDisplay.test.tsx, src/components/__tests__/singleDartPad.test.tsx


## Task Specifications

### `tasks\T1-brief.md`

## Global Constraints

- Only `src/components/scoring/DartSlotsDisplay.tsx` and its two test files change.
- Do NOT touch: `src/hooks/useDartTurn.ts`, `src/components/scoring/TurnDisplay.tsx`, `SingleDartPad.tsx` logic (imports of DartSlotsDisplay stay), `NumberPad.tsx`, `ScoreInputPanel.tsx`, `src/app/match/page.tsx`, `src/components/__tests__/matchFlow.test.tsx`, `dartBoardPad.test.tsx`, `scoreInputPanel.test.tsx`.
- Undo button: `aria-label="Undo dart"` KEPT (matchFlow selects `/Undo/`); `disabled={!canUndo}` → `opacity-30`; guarded `navigator.vibrate(15)`; no absolute positioning anymore.
- Sum line: `text-sm font-mono text-zinc-600 tabular-nums` KEPT — only position changes (inline after slots, `ml-2`).
- Slots: `w-16` (64px) fixed width, `min-h-[48px]`, `gap-1.5` row, `border-cyan-500/30` filled / `border-white/5` empty, number `text-3xl font-mono font-black tracking-widest tabular-nums text-cyan-400`.
- Bust flash classes on the row container: `bg-red-500/20 border-red-500/40` KEPT.
- React 19: no `JSX.Element` return types.
- Verification: `npm run test`, `npx tsc --noEmit`, `npm run lint` — all must pass (full suite stays 317).

---
### Task 1: Compact slot row in DartSlotsDisplay

**Files:**
- Modify: `src/components/scoring/DartSlotsDisplay.tsx`
- Modify: `src/components/__tests__/dartSlotsDisplay.test.tsx`
- Modify: `src/components/__tests__/singleDartPad.test.tsx`

**Interfaces:**
- Consumes: existing `DartSlotsDisplayProps { darts, total, onUndo, canUndo, bustFlash }` — unchanged.
- Produces: same interface; consumers (`SingleDartPad.tsx`) unaffected.

- [ ] **Step 1: Update the failing test helpers first**

In `src/components/__tests__/dartSlotsDisplay.test.tsx`, replace the helpers:

```tsx
const slotsRow = () => document.querySelector('div.grid.grid-cols-3');
const sumLine = () => document.querySelector('span.text-zinc-600');
```

with:

```tsx
// The slots row container is the parent of the sum line; its first 3
// children are the slot divs (then the sum span, then the undo button).
const row = () => document.querySelector('span.text-zinc-600')!.parentElement!;
const slotDivs = () => [...row().children].slice(0, 3) as HTMLElement[];
const sumLine = () => document.querySelector('span.text-zinc-600');
```

Then update the two display assertions:

Test "renders three empty slots and a dim sum of 0" — replace:

```tsx
    expect(slotsRow()!.querySelectorAll('div').length).toBe(3);
    expect(slotsRow()!.querySelectorAll('span').length).toBe(0); // no numbers
```

with:

```tsx
    expect(slotDivs().length).toBe(3);
    expect(slotDivs().every((s) => !s.textContent)).toBe(true); // no numbers
```

Test "fills slots left to right with each dart points" — replace:

```tsx
    const texts = [...slotsRow()!.querySelectorAll('span')].map((s) => s.textContent);
    expect(texts).toEqual(['20', '40']);
```

with:

```tsx
    expect(slotDivs()[0]!.textContent).toBe('20');
    expect(slotDivs()[1]!.textContent).toBe('40');
    expect(slotDivs()[2]!.textContent).toBe('');
```

In `src/components/__tests__/singleDartPad.test.tsx`, replace the helpers:

```tsx
const slotsRow = () => document.querySelector('div.grid.grid-cols-3');
const sumLine = () => document.querySelector('span.text-zinc-600');
```

with:

```tsx
const row = () => document.querySelector('span.text-zinc-600')!.parentElement!;
const slotDivs = () => [...row().children].slice(0, 3) as HTMLElement[];
const sumLine = () => document.querySelector('span.text-zinc-600');
```

Then update the three display assertions (all currently use `within(slotsRow()!)...`):

1. Test "records D20 = 40 after Double then 20, then resets to single" — replace:

```tsx
    expect(within(slotsRow()!).getByText('40')).toBeInTheDocument(); // first slot
    expect(sumLine()!.textContent).toBe('40');                       // dim sum
```

and:

```tsx
    expect(within(slotsRow()!).getByText('20')).toBeInTheDocument(); // second slot
    expect(within(slotsRow()!).getByText('40')).toBeInTheDocument(); // first slot stays
    expect(sumLine()!.textContent).toBe('60');                       // 40 + S20
```

with:

```tsx
    expect(slotDivs()[0]!.textContent).toBe('40');
    expect(sumLine()!.textContent).toBe('40');
```

and:

```tsx
    expect(slotDivs()[0]!.textContent).toBe('40');
    expect(slotDivs()[1]!.textContent).toBe('20');
    expect(sumLine()!.textContent).toBe('60');
```

2. Test "undoDart removes the last dart and restores the total" — replace:

```tsx
    expect(within(slotsRow()!).getByText('20')).toBeInTheDocument();
    expect(sumLine()!.textContent).toBe('20');
```

with:

```tsx
    expect(slotDivs()[0]!.textContent).toBe('20');
    expect(sumLine()!.textContent).toBe('20');
```

3. Test "records Double + 25 = 50 (same as BULL)" — replace:

```tsx
    expect(within(slotsRow()!).getByText('50')).toBeInTheDocument();
    expect(sumLine()!.textContent).toBe('50');
```

with:

```tsx
    expect(slotDivs()[0]!.textContent).toBe('50');
    expect(sumLine()!.textContent).toBe('50');
```

If the `within` import in `singleDartPad.test.tsx` is now unused, remove it from the import line to keep lint clean.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/components/__tests__/dartSlotsDisplay.test.tsx src/components/__tests__/singleDartPad.test.tsx`
Expected: FAIL — `span.text-zinc-600` exists but `row().children` ordering/layout differs from the old grid (slot divs are no longer the first 3 children of a grid row, or `div.grid.grid-cols-3` selector no longer matches). Note: with the OLD component the new helpers may accidentally pass — the real failure appears after Step 3 if assertions were mis-adapted; Step 4's green run is the gate.

- [ ] **Step 3: Modify DartSlotsDisplay layout**

In `src/components/scoring/DartSlotsDisplay.tsx`, replace the entire `return (...)` block with:

```tsx
  return (
    <div className="flex-[0.8] min-h-[70px]">
      <div
        className={cn(
          'h-full flex items-center justify-center gap-1.5 bg-zinc-900/40 rounded-2xl border border-white/5 overflow-hidden transition-colors duration-150 px-2',
          bustFlash && 'bg-red-500/20 border-red-500/40'
        )}
      >
        {[0, 1, 2].map((i) => {
          const dart = darts[i];
          return (
            <div
              key={i}
              className={cn(
                'flex items-center justify-center rounded-xl border w-16 min-h-[48px]',
                dart ? 'border-cyan-500/30' : 'border-white/5'
              )}
            >
              {dart && (
                <span className="text-3xl font-mono font-black tracking-widest tabular-nums text-cyan-400">
                  {dart.points}
                </span>
              )}
            </div>
          );
        })}
        <span className="ml-2 text-sm font-mono text-zinc-600 tabular-nums">{total}</span>
        <button
          type="button"
          aria-label="Undo dart"
          onPointerDown={(e) => {
            e.preventDefault();
            if (navigator.vibrate) navigator.vibrate(15);
            if (canUndo) onUndo();
          }}
          disabled={!canUndo}
          className={cn(
            'ml-1 p-2 text-zinc-500 active:text-white transition-opacity',
            !canUndo && 'opacity-30'
          )}
        >
          <IconRotateClockwise2 size={24} />
        </button>
      </div>
    </div>
  );
```

Notes: the outer wrapper drops `relative` (undo is no longer absolutely positioned); the container becomes a horizontal flex row (`flex items-center justify-center`); slots get `w-16`; sum gets `ml-2`; undo becomes an in-flow button at the row end with `ml-1 p-2`. Props, imports (IconRotateClockwise2, cn, DartEntry), and all logic stay.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/components/__tests__/dartSlotsDisplay.test.tsx src/components/__tests__/singleDartPad.test.tsx`
Expected: all PASS (5 dartSlotsDisplay + 7 singleDartPad).

- [ ] **Step 5: Run full verification**

Run: `npm run test && npx tsc --noEmit && npm run lint`
Expected: full suite 317/317, tsc exit 0, lint clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/scoring/DartSlotsDisplay.tsx src/components/__tests__/dartSlotsDisplay.test.tsx src/components/__tests__/singleDartPad.test.tsx
git commit -m "refactor(darts): compact slot row with inline sum and undo"
```

### `tasks\T1-report.md`

# T1 Report — Compact slot row in DartSlotsDisplay

- **Workflow:** WF-20260818-124932-slots-display-compact-row
- **Task:** T1 — Compact slot row (flex row, `w-16` slots, `ml-2` inline dim sum, in-flow undo button)
- **Status:** Complete
- **Commit:** `15bc7667e6d15834b11937ddd5be7ebd2d59510e` — `refactor(darts): compact slot row with inline sum and undo`
- **Date:** 2026-08-18

## What changed (file-by-file)

### `src/components/scoring/DartSlotsDisplay.tsx`
Replaced the entire `return (...)` block with the exact JSX from the brief:
- Outer wrapper: `flex-[0.8] min-h-[70px]` — `relative` removed (undo no longer absolutely positioned).
- Container: horizontal flex row (`flex items-center justify-center` instead of `flex flex-col`); grid wrapper div removed — the 3 slot divs, sum span, and undo button are now direct children of the row.
- Slots: `w-16 min-h-[48px]`, `gap-1.5` on the row, `border-cyan-500/30` filled / `border-white/5` empty, number `text-3xl font-mono font-black tracking-widest tabular-nums text-cyan-400`.
- Sum line: `ml-2 text-sm font-mono text-zinc-600 tabular-nums` — inline after slots (classes kept, position changed).
- Undo button: in-flow at row end, `ml-1 p-2 text-zinc-500 active:text-white transition-opacity`, `disabled={!canUndo}` → `opacity-30`; `aria-label="Undo dart"` kept (matchFlow selects `/Undo/`); guarded `if (navigator.vibrate) navigator.vibrate(15)` kept; `onPointerDown` with `e.preventDefault()` and `if (canUndo) onUndo()` kept.
- Bust flash: `bustFlash && 'bg-red-500/20 border-red-500/40'` kept on the row container.
- Props interface, imports (`IconRotateClockwise2`, `cn`, `DartEntry`), and all logic unchanged. No `JSX.Element` return type (React 19 constraint respected).

### `src/components/__tests__/dartSlotsDisplay.test.tsx`
- Replaced `slotsRow` helper with `row()` (parent of `span.text-zinc-600`) and `slotDivs()` (first 3 children of the row) exactly per brief.
- Test "renders three empty slots and a dim sum of 0": `expect(slotDivs().length).toBe(3)` and `expect(slotDivs().every((s) => !s.textContent)).toBe(true)`.
- Test "fills slots left to right with each dart points": `slotDivs()[0..2].textContent` checks for `'20'`, `'40'`, `''`.
- `sumLine()` helper unchanged. 5 tests, all pass.

### `src/components/__tests__/singleDartPad.test.tsx`
- Replaced `slotsRow`/`sumLine` helpers with the brief's `row()`/`slotDivs()`/`sumLine()`.
- Three display assertions updated from `within(slotsRow()!).getByText(...)` to `slotDivs()[i].textContent` checks (tests: "records D20 = 40…", "undoDart removes the last dart…", "records Double + 25 = 50…").
- Removed now-unused `within` from the `@testing-library/react` import (lint clean).
- 7 tests, all pass.

## Verification results (exact outputs)

### Step 2 — two test files with new helpers against OLD component (expected intermediate state)
```
Test Files  2 failed (2)
     Tests  3 failed | 9 passed (12)
EXIT_CODE=1
```
Failures as anticipated: `slotDivs().length` was 2 (old layout's row wrapper had grid + sum as children) and slot text contents were concatenated (`'2040'`, `'4020'`) — i.e., the old grid layout did not match the new helpers.

### Step 4 — two test files after component change
```
Test Files  2 passed (2)
     Tests  12 passed (12)   // 5 dartSlotsDisplay + 7 singleDartPad
EXIT_CODE=0
```

### Step 5 — full verification
```
npm run test:
Test Files  13 passed (13)
     Tests  317 passed (317)
TEST_EXIT=0

npx tsc --noEmit:
(no output)
TSC_EXIT=0

npm run lint:
> eslint
LINT_EXIT=0
```

### Step 6 — commit
```
[main 15bc766] refactor(darts): compact slot row with inline sum and undo
 3 files changed, 57 insertions(+), 54 deletions(-)
```
`git show --name-only HEAD` confirms exactly the 3 owned files; working tree clean afterwards.

## Deviations from the brief
None. The brief's exact JSX, helper code, assertion replacements, and commit message were used verbatim.

## Risks / edge cases
- **DOM-structure coupling in tests:** the new `row()` helper assumes the sum span is a direct child of the row container and the first 3 children are slots — a fragile-but-deliberate contract documented in the test comment. Any future layout change (e.g., wrapping slots in another div) will break these tests; the comment points to the assumption.
- **`slotDivs()[2]!.textContent` is `''`:** an empty slot div has no children, so textContent is `''` (verified passing). Empty slots show no number.
- **Undo button now in-flow:** on narrow screens the row may be tight (3×64px slots + sum + 24px icon), but the row uses `justify-center` + `gap-1.5` and the wrapper is `min-h-[70px]`; no overflow behavior change beyond `overflow-hidden` already present on the container. Visual check on the dev server (port 3000) was out of scope and not performed.
- **`navigator.vibrate` guard** unchanged; `disabled` buttons with `opacity-30` still render the icon.
- **matchFlow test** (selects `/Undo/` by aria-label, 317-suite pass) confirms the undo button semantics were preserved for consumers.

## Ready for independent review
Yes — implementation, targeted tests, full verification, and commit all completed with recorded evidence.

## Follow-up (reviewer LOW-1)

- **Fix:** stale doc comments in `src/components/scoring/DartSlotsDisplay.tsx` — line 8 `// running turn total — shown dim below the slots` → `...shown dim after the slots`; JSDoc lines 14–18 "shown small and dim underneath" → "shown small and dim after them". No other code changed.
- **Commit:** `c3fcd5febf319dd9c1ec5090c72663315019c1dd` — `docs(darts): fix DartSlotsDisplay comment to match inline sum layout` (1 file, +2/−2).
- **Verification:**
  - `npm run test` → 13 files, **317/317 passed**, exit 0
  - `npx tsc --noEmit` → no output, **exit 0**
  - `npm run lint` → clean, **exit 0**

### `tasks\T1-review.md`

# T1 Review — Compact slot row in DartSlotsDisplay

- **Workflow:** WF-20260818-124932-slots-display-compact-row
- **Task:** T1 — Compact slot row (flex row, `w-16` slots, `ml-2` inline dim sum, in-flow undo button)
- **Reviewed commit:** `15bc7667e6d15834b11937ddd5be7ebd2d59510e` — `refactor(darts): compact slot row with inline sum and undo`
- **Reviewer:** Independent (not involved in implementation)
- **Date:** 2026-08-18

## Verdict

**APPROVED_WITH_NOTES**

Two LOW findings (stale doc comment; known DOM-coupling in test helpers). No blocker/high/medium issues. All acceptance criteria met; all verification commands re-run by the reviewer with real output recorded below.

---

## Verification evidence (re-run by reviewer, 2026-08-18)

### `npm run test` (full suite)
```
> nextjs-16@0.0.04 test
> vitest run

 RUN  v4.1.10 D:/own/nomad-darts

 Test Files  13 passed (13)
      Tests  317 passed (317)
   Start at  20:56:03
   Duration  53.63s (transform 1.43s, setup 778ms, import 11.66s, tests 53.09s, environment 18.46s)

TEST_EXIT=0
```
Expected 317/317 → **confirmed 317/317, exit 0.** (Vite config-loader/tsconfig-paths warnings are pre-existing and unrelated.)

### `npx tsc --noEmit`
```
(no output)
TSC_EXIT=0
```
Expected exit 0 → **confirmed exit 0.**

### `npm run lint`
```
> nextjs-16@0.0.04 lint
> eslint

LINT_EXIT=0
```
Expected clean → **confirmed clean, exit 0.**

### Commit scope and repo state
- `git show 15bc7667 --stat` → exactly 3 files: `src/components/scoring/DartSlotsDisplay.tsx`, `src/components/__tests__/dartSlotsDisplay.test.tsx`, `src/components/__tests__/singleDartPad.test.tsx` (57 insertions, 54 deletions).
- `git status` → `nothing to commit, working tree clean`.
- Forbidden files verified untouched by the commit (not in diff): `src/hooks/useDartTurn.ts`, `src/components/scoring/TurnDisplay.tsx`, `src/components/scoring/SingleDartPad.tsx` (logic), `src/components/scoring/NumberPad.tsx`, `src/app/match/page.tsx`, `src/components/__tests__/matchFlow.test.tsx`, `dartBoardPad.test.tsx`, `scoreInputPanel.test.tsx`. Only the 3 owned files changed in `15bc7667`.

---

## Acceptance criteria checks (all pass)

1. **Layout** — `src/components/scoring/DartSlotsDisplay.tsx`:
   - Single flex row container: `h-full flex items-center justify-center gap-1.5` (line 24). ✅
   - Slots: `w-16 min-h-[48px]`, `border-cyan-500/30` filled / `border-white/5` empty (lines 33–35). ✅
   - Number span: `text-3xl font-mono font-black tracking-widest tabular-nums text-cyan-400` (line 39). ✅
   - Sum span: `ml-2 text-sm font-mono text-zinc-600 tabular-nums` after the slots (line 46). ✅
   - Undo button: in-flow at row end, `ml-1 p-2`, `IconRotateClockwise2 size={24}`, `aria-label="Undo dart"`, `disabled={!canUndo}` → `opacity-30`, guarded `if (navigator.vibrate) navigator.vibrate(15)`, `onPointerDown` with `e.preventDefault()` + `if (canUndo) onUndo()` (lines 47–62). ✅
   - Outer wrapper `flex-[0.8] min-h-[70px]` WITHOUT `relative` (line 21). ✅
   - Bust flash `bg-red-500/20 border-red-500/40` on the row container (line 25). ✅
   - Props interface, imports (`IconRotateClockwise2`, `cn`, `DartEntry`), and all logic unchanged. ✅

2. **Test helpers** — `row()` = parent of `span.text-zinc-600`, `slotDivs()` = first 3 children, `sumLine()` unchanged, in both `dartSlotsDisplay.test.tsx` (lines 15–19) and `singleDartPad.test.tsx` (lines 27–29), exactly per brief. Assertions updated per brief in both files. `within` removed from the `@testing-library/react` import in `singleDartPad.test.tsx` (line 3). ✅
   - Grep confirms **no** leftover `slotsRow`, `div.grid.grid-cols-3`, or `within(slotsRow()...)` in the two owned test files (the `within(` hits in `matchFlow.test.tsx` are pre-existing, untouched, unrelated). ✅

3. **No `JSX.Element` return types** — grep over `src/` finds zero occurrences. ✅

4. **Design spec D1–D4** — D1 (`w-16` fixed slots, flex row `gap-1.5`) ✅; D2 (sum inline after slots, `ml-2`, styling unchanged) ✅; D3 (in-flow undo at row end, `p-2`/24px icon, aria-label kept, `disabled` → `opacity-30`, no absolute) ✅; D4 (bust flash on row container, empty-slot dim border, logic/`useDartTurn` untouched) ✅.

5. **Consumer contract** — `SingleDartPad.tsx` (untouched) still passes `{ darts, total, onUndo, canUndo, bustFlash }` (lines 46–52); `matchFlow.test.tsx` still selects the undo button via `/Undo/` (line 661) — passed in the full suite. ✅

6. **Commit message** matches brief: `refactor(darts): compact slot row with inline sum and undo`. ✅

---

## Findings

### BLOCKER
None.

### HIGH
None.

### MEDIUM
None.

### LOW

1. **Stale doc comments in `DartSlotsDisplay.tsx` (lines 8 and 14–18)**
   - Location: `src/components/scoring/DartSlotsDisplay.tsx:8` (`total: number; // running turn total — shown dim below the slots`) and lines 14–18 (JSDoc: "the turn total shown small and dim **underneath** …").
   - Problem: The layout change moved the sum from below the slots to inline after them (`ml-2`), but the interface comment and JSDoc still say "below/underneath". The brief only scoped the `return (...)` block, so this is not an implementation deviation — but the comments are now factually wrong.
   - Impact: Misleading documentation for future maintainers; the component's stated behavior no longer matches its rendered layout.
   - Recommended correction: Update line 8 to `// running turn total — shown dim after the slots` and reword the JSDoc ("…the turn total shown small and dim to the right of the slots — so the running sum doesn't read as a score change"). Trivial one-line follow-up; can ride along with the next task touching this file.

2. **Test helpers couple to DOM structure (both test files, known and deliberate)**
   - Location: `src/components/__tests__/dartSlotsDisplay.test.tsx:17–18` and `src/components/__tests__/singleDartPad.test.tsx:27–28` — `row()` assumes the sum span's parent is the row container and the first 3 children are the slot divs.
   - Problem: If a future layout change wraps the slots (e.g., a nested grid div), `slotDivs()` silently mis-selects and the tests fail with confusing diff output (or worse, pass against the wrong nodes if the first 3 children coincidentally contain numbers).
   - Impact: Maintenance fragility; the tests encode layout structure rather than behavior. This is exactly what the design spec and brief prescribe (documented in the test comment), so it is accepted by design — flagging for awareness, not correction.
   - Recommended correction (optional, not required): Keep as-is per spec; if robustness is later desired, prefer `role`/`aria` hooks (e.g., `aria-label` per slot) or a `data-testid` on the slots container instead of positional child indexing.

---

## Notes on the implementer's report

- The report's claimed Step 2 intermediate failure (`2 failed / 3 failed | 9 passed`, `slotDivs().length` = 2, concatenated `'2040'`/`'4020'` texts) is consistent with the old layout (flex-col container whose children were the grid wrapper + sum span) and with the final diff; no evidence of helper gaming (the final suite passing 317 with real per-slot text assertions independently confirms the layout is genuine).
- Report's risk notes (DOM-coupling, empty-slot `''` textContent, in-flow undo tightness on narrow screens, no visual check) are accurate and match my own analysis.
- No deviations from the brief found in the diff; brief JSX, helpers, and assertions used verbatim.


## Implementation and Review Reports

_No artifacts recorded._

## Verification Evidence

_No artifacts recorded._

## Final Progress Snapshot

# Workflow Progress — WF-20260818-124932-slots-display-compact-row

- **Objective:** Make the 3 dart input slots narrow (2-digit fit) and show the turn sum after them in the same row, small and dim; undo moves to the row end
- **Status:** `compacting`
- **Current stage:** `finalize`
- **Last checkpoint:** `final_summary_written`
- **Next action:** `{"path": "D:\\own\\nomad-darts\\docs\\implementations\\WF-20260818-124932-slots-display-compact-row.md", "type": "write_final_report"}`
- **Updated:** 2026-08-18T13:03:16+00:00

## Task status

- **completed:** T1

## Completion gates

- Integration verification: `passed`
- Documentation updated: `True`
- Final summary written: `True`
- Compaction validated: `True`

Detailed evidence is stored in the workflow's research, tasks, reports, and verification directories.


## Event Timeline

| Time | Stage | Task | Event | Outcome |
|---|---|---|---|---|
| 2026-08-18T12:49:32+00:00 | intake_recovery |  | workflow_initialized | success |
| 2026-08-18T12:50:29+00:00 | intake_recovery | T1 | task_state_changed | pending |
| 2026-08-18T12:50:43+00:00 | intake_recovery | T1 | task_state_changed | in_progress |
| 2026-08-18T12:55:10+00:00 | intake_recovery | T1 | task_state_changed | implementation_complete |
| 2026-08-18T13:00:40+00:00 | intake_recovery | T1 | task_state_changed | completed |
| 2026-08-18T13:02:34+00:00 | integration |  | checkpoint_reached | success |
| 2026-08-18T13:02:40+00:00 | documentation |  | checkpoint_reached | success |
| 2026-08-18T13:02:46+00:00 | finalize |  | checkpoint_reached | success |
| 2026-08-18T13:03:05+00:00 | planning |  | checkpoint_reached | success |
| 2026-08-18T13:03:11+00:00 | finalize |  | checkpoint_reached | success |
| 2026-08-18T13:03:16+00:00 | finalize |  | compaction_validated | success |

## Retention

Durable system documentation, architecture decisions, source code, tests, and this final report remain permanent. Temporary workflow artifacts were eligible for cleanup only after this report was safely written and validated.
