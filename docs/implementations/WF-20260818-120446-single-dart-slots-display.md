# Workflow Implementation Report

## Metadata

- **Workflow ID:** `WF-20260818-120446-single-dart-slots-display`
- **Original objective:** Single dart mode: show 3 input slots that fill with each dart's points; show the 3-dart sum below in small dim text (replaces the big cyan total which looks like the score is being subtracted)
- **Project root:** `D:\own\nomad-darts`
- **Started:** 2026-08-18T12:04:46+00:00
- **Completed:** 2026-08-18T12:38:46+00:00
- **Risk classification:** `low`
- **Final status:** `completed`

## Outcome

All recorded implementation tasks passed task-level verification and independent review, integration verification passed, and durable documentation was updated before compaction.

## Approved Plan

# Single Dart Slots Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Single dart mode turn display with 3 slots that fill with each dart's points, plus a small dim sum line below — so the running total no longer reads as a score change.

**Architecture:** New dedicated `DartSlotsDisplay` component (Approach A, user-approved). `SingleDartPad` swaps `TurnDisplay` for it. `useDartTurn` logic, `TurnDisplay`, `DartBoardPad`, `NumberPad`, and the match page are untouched.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, @tabler/icons-react, vitest 4 + @testing-library/react (jsdom), TypeScript.

**Spec:** `docs/superpowers/specs/2026-08-18-single-dart-slots-display-design.md` (user-approved 2026-08-18)

## Global Constraints

- Only Single dart mode changes. BOARD mode keeps `TurnDisplay` unchanged.
- Slot content: points only (no multiplier prefix). Sum line: small, dim, below the slots.
- Undo button kept, `aria-label="Undo dart"` (matchFlow.test.tsx selects `/Undo/` — must keep working).
- Bust: red flash on the slots container + slots clear (same `bustFlash` semantics as `TurnDisplay`).
- Do NOT modify: `src/hooks/useDartTurn.ts`, `src/components/scoring/TurnDisplay.tsx`, `DartBoardPad.tsx`, `NumberPad.tsx`, `ScoreInputPanel.tsx`, `src/app/match/page.tsx`, `src/components/__tests__/matchFlow.test.tsx`, `dartBoardPad.test.tsx`, `scoreInputPanel.test.tsx`.
- No new npm dependencies.
- Test conventions: `// @vitest-environment jsdom` as FIRST line; `afterEach(() => { cleanup(); })` + `import '@testing-library/jest-dom/vitest'` per file; never `vi.mock` in `src/test/setup.ts`.
- React 19: do NOT use `JSX.Element` return types (global JSX namespace removed — repo convention omits return types).
- Verification per task: `npm run test`, `npx tsc --noEmit`, `npm run lint` — all must pass.

---

### Task 1: DartSlotsDisplay component

**Files:**
- Create: `src/components/scoring/DartSlotsDisplay.tsx`
- Test: `src/components/__tests__/dartSlotsDisplay.test.tsx`

**Interfaces:**
- Consumes: `DartEntry` type from `@/hooks/useDartTurn` (already exported: `{ segment: number; multiplier: Multiplier; points: number }`).
- Produces: `export default function DartSlotsDisplay({ darts, total, onUndo, canUndo, bustFlash }: DartSlotsDisplayProps)` — consumed by Task 2.

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/dartSlotsDisplay.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import DartSlotsDisplay from '@/components/scoring/DartSlotsDisplay';
import type { DartEntry } from '@/hooks/useDartTurn';

// vitest globals are disabled (see vitest.config.ts), so RTL's auto-cleanup
// never registers — without this, renders accumulate in document.body.
afterEach(() => {
  cleanup();
});

const slotsRow = () => document.querySelector('div.grid.grid-cols-3');
const sumLine = () => document.querySelector('span.text-zinc-600');

function renderDisplay(overrides: { darts?: DartEntry[]; total?: number; canUndo?: boolean; bustFlash?: boolean } = {}) {
  const onUndo = vi.fn();
  render(
    <DartSlotsDisplay
      darts={overrides.darts ?? []}
      total={overrides.total ?? 0}
      onUndo={onUndo}
      canUndo={overrides.canUndo ?? false}
      bustFlash={overrides.bustFlash}
    />
  );
  return { onUndo };
}

describe('DartSlotsDisplay', () => {
  it('renders three empty slots and a dim sum of 0', () => {
    renderDisplay();
    expect(slotsRow()!.querySelectorAll('div').length).toBe(3);
    expect(slotsRow()!.querySelectorAll('span').length).toBe(0); // no numbers
    expect(sumLine()!.textContent).toBe('0');
  });

  it('fills slots left to right with each dart points', () => {
    renderDisplay({
      darts: [
        { segment: 20, multiplier: 'S', points: 20 },
        { segment: 20, multiplier: 'D', points: 40 },
      ],
      total: 60,
      canUndo: true,
    });
    const texts = [...slotsRow()!.querySelectorAll('span')].map((s) => s.textContent);
    expect(texts).toEqual(['20', '40']);
    expect(sumLine()!.textContent).toBe('60');
  });

  it('applies the red flash classes when bustFlash is set', () => {
    renderDisplay({ bustFlash: true });
    expect(document.querySelector('[class*="bg-red-500/20"]')).not.toBeNull();
    expect(document.querySelector('[class*="border-red-500/40"]')).not.toBeNull();
  });

  it('disables the undo button when canUndo is false', () => {
    renderDisplay();
    expect(screen.getByRole('button', { name: /Undo dart/ })).toBeDisabled();
  });

  it('calls onUndo when the undo button is pressed and canUndo is true', async () => {
    const user = userEvent.setup();
    const { onUndo } = renderDisplay({ canUndo: true });
    await user.click(screen.getByRole('button', { name: /Undo dart/ }));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/__tests__/dartSlotsDisplay.test.tsx`
Expected: FAIL — module `@/components/scoring/DartSlotsDisplay` not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/scoring/DartSlotsDisplay.tsx`:

```tsx
'use client';
import { IconRotateClockwise2 } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import type { DartEntry } from '@/hooks/useDartTurn';

interface DartSlotsDisplayProps {
  darts: DartEntry[]; // 0..3 entries — slot i shows darts[i], left to right
  total: number; // running turn total — shown dim below the slots
  onUndo: () => void;
  canUndo: boolean;
  bustFlash?: boolean;
}

/**
 * Per-dart turn display for single dart mode: three slots that fill with each
 * dart's points, and the turn total shown small and dim underneath — so the
 * running sum doesn't read as a score change.
 */
export default function DartSlotsDisplay({ darts, total, onUndo, canUndo, bustFlash }: DartSlotsDisplayProps) {
  return (
    <div className="flex-[0.8] min-h-[70px] relative">
      <div
        className={cn(
          'h-full flex flex-col items-center justify-center gap-1.5 bg-zinc-900/40 rounded-2xl border border-white/5 overflow-hidden transition-colors duration-150 px-2',
          bustFlash && 'bg-red-500/20 border-red-500/40'
        )}
      >
        <div className="grid grid-cols-3 gap-1.5 w-full">
          {[0, 1, 2].map((i) => {
            const dart = darts[i];
            return (
              <div
                key={i}
                className={cn(
                  'flex items-center justify-center rounded-xl border min-h-[48px]',
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
        </div>
        <span className="text-sm font-mono text-zinc-600 tabular-nums">{total}</span>
      </div>
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
          'absolute right-2 top-1/2 -translate-y-1/2 p-3 text-zinc-500 active:text-white transition-opacity',
          !canUndo && 'opacity-30'
        )}
      >
        <IconRotateClockwise2 size={24} />
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/__tests__/dartSlotsDisplay.test.tsx`
Expected: 5/5 PASS.

- [ ] **Step 5: Run full verification**

Run: `npm run test && npx tsc --noEmit && npm run lint`
Expected: full suite green (312 + 5 new), tsc exit 0, lint clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/scoring/DartSlotsDisplay.tsx src/components/__tests__/dartSlotsDisplay.test.tsx
git commit -m "feat(darts): add 3-slot dart display for single dart mode"
```

---

### Task 2: Wire DartSlotsDisplay into SingleDartPad

**Files:**
- Modify: `src/components/scoring/SingleDartPad.tsx`
- Modify: `src/components/__tests__/singleDartPad.test.tsx`

**Interfaces:**
- Consumes: `DartSlotsDisplay` from Task 1 (`{ darts, total, onUndo, canUndo, bustFlash }`), `useDartTurn` return values (unchanged: `darts`, `total`, `lastOutcome`, `undoDart`).
- Produces: unchanged `SingleDartPad` public API (`{ onSubmit, currentScore, checkout }`) — `ScoreInputPanel` and `matchFlow.test.tsx` are unaffected.

- [ ] **Step 1: Update the existing tests first (they encode the old display)**

In `src/components/__tests__/singleDartPad.test.tsx`:

1. Add `within` to the RTL import:
   `import { cleanup, render, screen, within } from '@testing-library/react';`

2. Add helpers after `renderPad`:

```tsx
const slotsRow = () => document.querySelector('div.grid.grid-cols-3');
const sumLine = () => document.querySelector('span.text-zinc-600');
```

3. Test "records D20 = 40 after Double then 20, then resets to single" — replace the two display assertions:

```tsx
    expect(screen.getByText('40')).toBeInTheDocument();        // display total
    expect(screen.getByText(/1\/3/)).toBeInTheDocument();      // dart count
```

with:

```tsx
    expect(within(slotsRow()!).getByText('40')).toBeInTheDocument(); // first slot
    expect(sumLine()!.textContent).toBe('40');                       // dim sum
```

and replace the later assertion:

```tsx
    expect(screen.getByText('60')).toBeInTheDocument();        // 40 + S20
```

with:

```tsx
    expect(within(slotsRow()!).getByText('20')).toBeInTheDocument(); // second slot
    expect(within(slotsRow()!).getByText('40')).toBeInTheDocument(); // first slot stays
    expect(sumLine()!.textContent).toBe('60');                       // 40 + S20
```

4. Test "undoDart removes the last dart and restores the total" — replace:

```tsx
    expect(screen.getByText('20', { selector: 'span' })).toBeInTheDocument();
```

with:

```tsx
    expect(within(slotsRow()!).getByText('20')).toBeInTheDocument();
    expect(sumLine()!.textContent).toBe('20');
```

5. Test "records Double + 25 = 50 (same as BULL)" — replace:

```tsx
    expect(screen.getByText('50')).toBeInTheDocument();
```

with:

```tsx
    expect(within(slotsRow()!).getByText('50')).toBeInTheDocument();
    expect(sumLine()!.textContent).toBe('50');
```

All other tests in the file stay as-is (they assert `onSubmit` calls and button states, not the display).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/components/__tests__/singleDartPad.test.tsx`
Expected: FAIL — `div.grid.grid-cols-3` and `span.text-zinc-600` don't exist yet (old TurnDisplay renders instead).

- [ ] **Step 3: Modify SingleDartPad**

In `src/components/scoring/SingleDartPad.tsx`:

1. Replace the import:
   `import TurnDisplay from './TurnDisplay';` → `import DartSlotsDisplay from './DartSlotsDisplay';`
2. Delete the `breakdown` useMemo (lines 37-40) and the now-unused `useMemo` import (keep `useState`).
3. Replace the `<TurnDisplay ... />` block (lines 51-58) with:

```tsx
      <DartSlotsDisplay
        darts={darts}
        total={total}
        onUndo={undoDart}
        canUndo={darts.length > 0}
        bustFlash={lastOutcome === 'bust'}
      />
```

Everything else in the file (useDartTurn wiring, multiplier state, leg-over reset, segment grid, BULL button) stays untouched.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/components/__tests__/singleDartPad.test.tsx src/components/__tests__/dartSlotsDisplay.test.tsx`
Expected: all PASS (8 singleDartPad + 5 dartSlotsDisplay).

- [ ] **Step 5: Run full verification**

Run: `npm run test && npx tsc --noEmit && npm run lint`
Expected: full suite green (317 total), tsc exit 0, lint clean. `matchFlow.test.tsx` (17/17) and `dartBoardPad.test.tsx` unchanged and green.

- [ ] **Step 6: Commit**

```bash
git add src/components/scoring/SingleDartPad.tsx src/components/__tests__/singleDartPad.test.tsx
git commit -m "feat(darts): use slots display in single dart pad"
```

---

### Task 3: Update system overview docs

**Files:**
- Modify: `docs/10-system-overview.md` (Score Entry section, line 53)

**Interfaces:**
- Consumes: nothing — docs only.

- [ ] **Step 1: Update the Score Entry line**

In `docs/10-system-overview.md`, line 53 currently reads:

```
- Implemented: `ScoreInputPanel` — 3 горим: **3 DARTS** (тоон pad, default), **1 DART** (сегмент сонгогч + Double/Triple), **BOARD** (touch dartboard, ≥768px дэлгэцэнд)
```

Append a new bullet after line 55 (the Settings popover line):

```
- **1 DART** горимд сум бүрийн оноо 3 slot-д дүүрч харагдана; нийлбэр нь доор жижиг бүдэг текстээр (DartSlotsDisplay)
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: both clean (docs-only change).

- [ ] **Step 3: Commit**

```bash
git add docs/10-system-overview.md
git commit -m "docs: note single dart slots display in system overview"
```

---

## Self-Review Notes

- **Spec coverage:** D1 (scope — single mode only) → Task 2 touches only SingleDartPad; D2 (points only) → Task 1 slot spans render `dart.points`; D3 (undo kept) → Task 1 keeps `aria-label="Undo dart"`; D4 (bust red flash) → Task 1 `bustFlash` classes. Testing section → Task 1 new tests + Task 2 updated tests. Verification → each task's Step 5.
- **Type consistency:** `DartSlotsDisplayProps` defined once in Task 1, consumed identically in Task 2. `DartEntry` imported from `@/hooks/useDartTurn` in both test files — matches the exported interface.
- **No placeholders:** every step has concrete code or exact edits.


## Research Summary and Evidence

_No artifacts recorded._

## Task State Summary

### T1

- **Objective:** DartSlotsDisplay component: 3 slots + dim sum + undo, with own test file
- **Status:** `completed`
- **Agent:** `wf-implement`
- **Verification:** `5/5 tests; full suite 317/317; tsc/lint clean; commit ed94edd`
- **Review:** `APPROVED (0 critical/important, 1 minor deferred: querySelector non-null assertions in tests)`
- **Dependencies:** None
- **Owned files:** src/components/scoring/DartSlotsDisplay.tsx, src/components/__tests__/dartSlotsDisplay.test.tsx

### T2

- **Objective:** Wire DartSlotsDisplay into SingleDartPad; update singleDartPad tests
- **Status:** `completed`
- **Agent:** `wf-implement`
- **Verification:** `Targeted 12/12; full suite 317/317; tsc/lint clean; commit f100062`
- **Review:** `APPROVED (0 critical/important, 3 minor: justified HTMLElement typing, brief count typo, pre-existing trailing newline)`
- **Dependencies:** T1
- **Owned files:** src/components/scoring/SingleDartPad.tsx, src/components/__tests__/singleDartPad.test.tsx

### T3

- **Objective:** Update docs/10-system-overview.md Score Entry section
- **Status:** `completed`
- **Agent:** `wf-implement`
- **Verification:** `tsc/lint clean; commit fc3ede1; docs-only`
- **Review:** `APPROVED (0 blocker/high/medium, 1 low: T3 brief not self-contained - extraction artifact, verified against plan)`
- **Dependencies:** T2
- **Owned files:** docs/10-system-overview.md


## Task Specifications

### `tasks\final-review.md`

# Final Whole-Branch Review — Single Dart Slots Display

- **Branch:** `main` (db870ef..fc3ede1 — 3 commits, all reviewed)
- **Commits:** ed94edd (T1), f100062 (T2), fc3ede1 (T3)
- **Review package:** `.superpowers/sdd/WF-20260818-120446-single-dart-slots-display/review-db870ef..fc3ede1.diff` (5 files, +157/-16)
- **Reviewer:** final whole-branch reviewer (independent of all task implementers and task reviewers)
- **Date:** 2026-08-18
- **Verification (run by this reviewer):** `npm run test` -> **317/317 passed (13 files)**; `npx tsc --noEmit` -> **exit 0**; `npm run lint` -> **clean**. Working tree clean; commit stats verified via `git log`/`git status`.

## Verdict

**APPROVED**

## Spec coverage verdict

**COMPLETE** — every spec requirement is implemented and verified end-to-end:

| Spec item | Implementation | Verified |
|---|---|---|
| D1 — Single dart mode only; BOARD keeps TurnDisplay | `SingleDartPad.tsx:46` uses `DartSlotsDisplay`; `DartBoardPad.tsx:6,37` still uses `TurnDisplay`; NumberPad untouched | PASS |
| D2 — Points only, no multiplier prefix | `DartSlotsDisplay.tsx:41` renders `{dart.points}` only | PASS |
| D3 — Undo kept, `aria-label="Undo dart"`, disabled -> opacity-30, vibrate guard | `DartSlotsDisplay.tsx:52-58`; `matchFlow.test.tsx:661` `/Undo/` selector still satisfiable | PASS |
| D4 — Bust: red flash on container + slots clear | `DartSlotsDisplay.tsx:25` `bg-red-500/20 border-red-500/40` (byte-identical to `TurnDisplay.tsx:25`); `useDartTurn` bust path `setDarts([])` | PASS |
| Architecture — exact interface `{ darts, total, onUndo, canUndo, bustFlash }` | `DartSlotsDisplay.tsx:6-12` matches spec; `DartEntry` type-only import from `@/hooks/useDartTurn` | PASS |
| Layout — flex-[0.8] min-h-[70px], 3-col grid, dim sum line, absolute undo | Lines 21, 28, 48, 60 — all match spec | PASS |
| SingleDartPad swap, breakdown useMemo removed, unused imports removed | `SingleDartPad.tsx:2,6,46-52`; no `breakdown`/`useMemo`/`TurnDisplay` remains in file | PASS |
| Data flow — slot i = darts[i], total -> sum, bust -> flash, submit -> clear | Traced through `useDartTurn` (unchanged): 'added' -> slots fill; 3rd dart / bust / finish -> `setDarts([])` -> slots empty | PASS |
| Edge cases — empty turn (3 empty slots + dim 0), undo at 0 darts (disabled), leg-over (unchanged), finish (unchanged) | Tests 1 & 4 of `dartSlotsDisplay.test.tsx`; logic paths unchanged | PASS |
| Testing — updated singleDartPad tests + 5 new DartSlotsDisplay tests; other suites untouched and green | `singleDartPad.test.tsx` 7 tests (slot-scoped), `dartSlotsDisplay.test.tsx` 5 tests; dartBoardPad/scoreInputPanel/matchFlow unchanged, 317/317 | PASS |
| Verification — test/tsc/lint all green | Re-run independently: 317/317, tsc 0, lint clean | PASS |
| No new deps, no forbidden files touched | Diff = 5 owned files only; `@tabler/icons-react` pre-existing | PASS |

## Cross-task consistency

- **Interface contract:** Task 1's `DartSlotsDisplayProps` is consumed by Task 2 exactly as built — props, types, and semantics match line-for-line between `DartSlotsDisplay.tsx:6-12` and the call site `SingleDartPad.tsx:46-52`.
- **No leftover references:** `SingleDartPad.tsx` has zero references to `TurnDisplay`, `breakdown`, `useMemo`, or `dartCount` (grep-verified). `dartCount`/`breakdown` survive only in `TurnDisplay.tsx`, used by DartBoardPad (BOARD mode — intended).
- **Test helper symmetry:** both test files use the identical `div.grid.grid-cols-3` / `span.text-zinc-600` selectors; both were verified to match exactly one element in the rendered tree (segment grid is `grid-cols-5`).
- **Docs vs implementation:** `docs/10-system-overview.md:56` bullet ("сум бүрийн оноо 3 slot-д дүүрч харагдана; нийлбэр нь доор жижиг бүдэг текстээр") matches the component's actual behavior (3 slots, points-only, dim sum line) and its actual wiring into Single dart mode.

## Whole-feature behavior trace

User story verified end-to-end through `useDartTurn` (unchanged) + new display:

1. **Throw dart** -> `addDart` -> status `'added'` -> `setDarts(next)` -> slot i renders `dart.points` (left->right); `total` recomputed -> sum line updates. PASS
2. **3rd dart** -> `next.length === 3` -> `setDarts([])` + `onSubmit(total, 3, false)` -> slots clear, sum shows 0. PASS
3. **Bust** -> `setDarts([])` + `setLastOutcome('bust')` + `onSubmit(0, n, true)` -> red container flash with empty slots (numbers never visible during flash — no legibility issue). PASS
4. **Undo** -> `undoDart` pops last entry -> last slot empties, sum decreases, `lastOutcome` null (flash off). PASS
5. **Finish / leg-over** -> unchanged submit paths; slots clear. PASS

No break in the chain. The only behavioral deltas vs. the old `TurnDisplay` are the intended ones (per-slot numbers, dim sum, container-only red flash).

## Findings

### BLOCKER
None.

### HIGH
None.

### MEDIUM
None.

### LOW

1. **`src/components/scoring/DartSlotsDisplay.tsx:28` (grid) vs `:60` (undo button) — third slot number can sit under the undo button on narrow viewports.**
   - Problem: the slots grid is `w-full` inside a `px-2` container, so slot 3 extends to the container's right edge, while the undo button occupies the rightmost ~48px + 8px margin of the wrapper, vertically centered on the same band as the slots row (content ~80px tall, button centered at 50%). Static geometry analysis: on <=360px-wide screens the button's icon zone (starts ~12px inside the button) can overlap the tail of slot 3's `text-3xl` number by up to ~8px; on 360-390px screens the number passes under the button's transparent padding (still visible). The old `TurnDisplay` centered its single number in the full-width container, so it never collided with the button.
   - Impact: cosmetic occlusion of the last slot's last digit on small phones — the exact element the feature exists to show. Function, touch targets, and tests unaffected.
   - Recommended correction: give the slots grid right clearance, e.g. `pr-14`/`pr-16` on the grid (or move the button to sit over the container's border), so slot 3's content never reaches the button's zone. Optional before merge; cheap to fold in.

2. **`src/components/__tests__/singleDartPad.test.tsx` — no integration assertion that slots clear after 3rd-dart auto-submit or after bust.**
   - Problem: the spec's data-flow claim "after submit the darts array clears and the slots empty" is covered only by `useDartTurn`'s unchanged, individually tested logic; the SingleDartPad-level tests assert `onSubmit` payloads but never re-assert the display state after submit/bust.
   - Impact: if a future refactor of `SingleDartPad`'s wiring re-rendered stale `darts` post-submit, no test would catch it. Low risk today (logic is shared and unchanged).
   - Recommended correction: optional — add `expect(slotsRow()!.querySelectorAll('span').length).toBe(0)` after the 3rd-dart submit and after the bust assertions. Defer if desired.

3. **`src/components/scoring/DartSlotsDisplay.tsx:48` — sum line stays `text-zinc-600` during the bust flash.**
   - Problem: none per spec — D4 explicitly scopes the flash to the container and the slots are empty during the flash, so the dim `0` is all that shows. Informational only: old `TurnDisplay` turned its total red during flash; the new display intentionally does not.
   - Impact: none. No correction needed.

## Deferred-minor triage rulings (from per-task reviews)

Ruling: **none of the deferred minors must be fixed before merge.** All five are non-functional:

1. **T1 — `document.querySelector(...)!` non-null assertions in `dartSlotsDisplay.test.tsx`** — NOT BLOCKING. Brief-mandated template, matches repo convention; degrades only failure diagnostics (TypeError vs. clean assertion if a class is renamed). Defer to a future test-hardening pass.
2. **T2 — `<HTMLElement>` generic on helpers in `singleDartPad.test.tsx`** — NOT BLOCKING. Verified type-only and *required* by `npx tsc --noEmit` (RTL `within` accepts `HTMLElement`, not `Element`). Keep as committed; optionally amend the plan's Step 1 snippet for future fidelity.
3. **T2 — brief count typo (brief said "8 singleDartPad", file has always had 7)** — NOT BLOCKING. Plan-document artifact; implementer's reported 12/12 was accurate. Record in the implementation report for plan accuracy.
4. **T2 — pre-existing missing trailing newline in `singleDartPad.test.tsx`** — NOT BLOCKING. Pre-existing at base commit; cosmetic. Fix opportunistically on the file's next touch.
5. **T3 — `T3-brief.md` not self-contained (task spec only in the plan)** — NOT BLOCKING. Workflow-artifact issue, zero code impact; briefs should embed or link task steps going forward.

## Regression risk

- `matchFlow.test.tsx`: 17/17 green; its `/Undo/` selector (line 661) targets the NumberPad (3 DARTS mode) with `aria-label="Undo dart"` still satisfiable in single mode; no `1/3` or `breakdown` assertions exist anywhere in the suite (grep-verified).
- `dartBoardPad.test.tsx`: untouched, green via TurnDisplay (BOARD mode unchanged).
- `scoreInputPanel.test.tsx`: untouched, green — `SingleDartPad` public props unchanged.
- `NumberPad`, `useDartTurn`, `match/page.tsx`, Redux slice: untouched. Full suite 317/317 re-run by this reviewer, tsc and lint clean.

## Conclusion

The feature is complete, spec-compliant, internally consistent across all three tasks, and verified green end-to-end. The three LOW findings are optional polish (slot-3/undo-button clearance, optional post-submit emptiness assertions, one informational note) and do not block merge. All deferred minors are triaged as non-blocking. **APPROVED.**

### `tasks\T1-brief.md`

## Global Constraints

- Only Single dart mode changes. BOARD mode keeps `TurnDisplay` unchanged.
- Slot content: points only (no multiplier prefix). Sum line: small, dim, below the slots.
- Undo button kept, `aria-label="Undo dart"` (matchFlow.test.tsx selects `/Undo/` — must keep working).
- Bust: red flash on the slots container + slots clear (same `bustFlash` semantics as `TurnDisplay`).
- Do NOT modify: `src/hooks/useDartTurn.ts`, `src/components/scoring/TurnDisplay.tsx`, `DartBoardPad.tsx`, `NumberPad.tsx`, `ScoreInputPanel.tsx`, `src/app/match/page.tsx`, `src/components/__tests__/matchFlow.test.tsx`, `dartBoardPad.test.tsx`, `scoreInputPanel.test.tsx`.
- No new npm dependencies.
- Test conventions: `// @vitest-environment jsdom` as FIRST line; `afterEach(() => { cleanup(); })` + `import '@testing-library/jest-dom/vitest'` per file; never `vi.mock` in `src/test/setup.ts`.
- React 19: do NOT use `JSX.Element` return types (global JSX namespace removed — repo convention omits return types).
- Verification per task: `npm run test`, `npx tsc --noEmit`, `npm run lint` — all must pass.

---
### Task 1: DartSlotsDisplay component

**Files:**
- Create: `src/components/scoring/DartSlotsDisplay.tsx`
- Test: `src/components/__tests__/dartSlotsDisplay.test.tsx`

**Interfaces:**
- Consumes: `DartEntry` type from `@/hooks/useDartTurn` (already exported: `{ segment: number; multiplier: Multiplier; points: number }`).
- Produces: `export default function DartSlotsDisplay({ darts, total, onUndo, canUndo, bustFlash }: DartSlotsDisplayProps)` — consumed by Task 2.

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/dartSlotsDisplay.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import DartSlotsDisplay from '@/components/scoring/DartSlotsDisplay';
import type { DartEntry } from '@/hooks/useDartTurn';

// vitest globals are disabled (see vitest.config.ts), so RTL's auto-cleanup
// never registers — without this, renders accumulate in document.body.
afterEach(() => {
  cleanup();
});

const slotsRow = () => document.querySelector('div.grid.grid-cols-3');
const sumLine = () => document.querySelector('span.text-zinc-600');

function renderDisplay(overrides: { darts?: DartEntry[]; total?: number; canUndo?: boolean; bustFlash?: boolean } = {}) {
  const onUndo = vi.fn();
  render(
    <DartSlotsDisplay
      darts={overrides.darts ?? []}
      total={overrides.total ?? 0}
      onUndo={onUndo}
      canUndo={overrides.canUndo ?? false}
      bustFlash={overrides.bustFlash}
    />
  );
  return { onUndo };
}

describe('DartSlotsDisplay', () => {
  it('renders three empty slots and a dim sum of 0', () => {
    renderDisplay();
    expect(slotsRow()!.querySelectorAll('div').length).toBe(3);
    expect(slotsRow()!.querySelectorAll('span').length).toBe(0); // no numbers
    expect(sumLine()!.textContent).toBe('0');
  });

  it('fills slots left to right with each dart points', () => {
    renderDisplay({
      darts: [
        { segment: 20, multiplier: 'S', points: 20 },
        { segment: 20, multiplier: 'D', points: 40 },
      ],
      total: 60,
      canUndo: true,
    });
    const texts = [...slotsRow()!.querySelectorAll('span')].map((s) => s.textContent);
    expect(texts).toEqual(['20', '40']);
    expect(sumLine()!.textContent).toBe('60');
  });

  it('applies the red flash classes when bustFlash is set', () => {
    renderDisplay({ bustFlash: true });
    expect(document.querySelector('[class*="bg-red-500/20"]')).not.toBeNull();
    expect(document.querySelector('[class*="border-red-500/40"]')).not.toBeNull();
  });

  it('disables the undo button when canUndo is false', () => {
    renderDisplay();
    expect(screen.getByRole('button', { name: /Undo dart/ })).toBeDisabled();
  });

  it('calls onUndo when the undo button is pressed and canUndo is true', async () => {
    const user = userEvent.setup();
    const { onUndo } = renderDisplay({ canUndo: true });
    await user.click(screen.getByRole('button', { name: /Undo dart/ }));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/__tests__/dartSlotsDisplay.test.tsx`
Expected: FAIL — module `@/components/scoring/DartSlotsDisplay` not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/scoring/DartSlotsDisplay.tsx`:

```tsx
'use client';
import { IconRotateClockwise2 } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import type { DartEntry } from '@/hooks/useDartTurn';

interface DartSlotsDisplayProps {
  darts: DartEntry[]; // 0..3 entries — slot i shows darts[i], left to right
  total: number; // running turn total — shown dim below the slots
  onUndo: () => void;
  canUndo: boolean;
  bustFlash?: boolean;
}

/**
 * Per-dart turn display for single dart mode: three slots that fill with each
 * dart's points, and the turn total shown small and dim underneath — so the
 * running sum doesn't read as a score change.
 */
export default function DartSlotsDisplay({ darts, total, onUndo, canUndo, bustFlash }: DartSlotsDisplayProps) {
  return (
    <div className="flex-[0.8] min-h-[70px] relative">
      <div
        className={cn(
          'h-full flex flex-col items-center justify-center gap-1.5 bg-zinc-900/40 rounded-2xl border border-white/5 overflow-hidden transition-colors duration-150 px-2',
          bustFlash && 'bg-red-500/20 border-red-500/40'
        )}
      >
        <div className="grid grid-cols-3 gap-1.5 w-full">
          {[0, 1, 2].map((i) => {
            const dart = darts[i];
            return (
              <div
                key={i}
                className={cn(
                  'flex items-center justify-center rounded-xl border min-h-[48px]',
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
        </div>
        <span className="text-sm font-mono text-zinc-600 tabular-nums">{total}</span>
      </div>
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
          'absolute right-2 top-1/2 -translate-y-1/2 p-3 text-zinc-500 active:text-white transition-opacity',
          !canUndo && 'opacity-30'
        )}
      >
        <IconRotateClockwise2 size={24} />
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/__tests__/dartSlotsDisplay.test.tsx`
Expected: 5/5 PASS.

- [ ] **Step 5: Run full verification**

Run: `npm run test && npx tsc --noEmit && npm run lint`
Expected: full suite green (312 + 5 new), tsc exit 0, lint clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/scoring/DartSlotsDisplay.tsx src/components/__tests__/dartSlotsDisplay.test.tsx
git commit -m "feat(darts): add 3-slot dart display for single dart mode"
```

---

### `tasks\T1-report.md`

# T1 Report — DartSlotsDisplay component

## Task ID and objective

**T1** — Create the standalone `DartSlotsDisplay` component (3-slot per-dart turn display for single dart mode) plus its test file, exactly as specified in the T1 brief (transcription + testing). A later task wires it into `SingleDartPad`; wiring was **not** part of this task.

## Implementation summary

- Created `src/components/__tests__/dartSlotsDisplay.test.tsx` (Step 1, TDD — test first) with 5 tests: empty slots + dim sum 0; left-to-right points fill; bust flash classes; undo disabled when `canUndo=false`; `onUndo` called on press when `canUndo=true`.
- Ran the new test alone — failed as expected with "module `@/components/scoring/DartSlotsDisplay` not found" (Step 2).
- Created `src/components/scoring/DartSlotsDisplay.tsx` (Step 3) verbatim from the brief: `'use client'`, `IconRotateClockwise2` undo button (`aria-label="Undo dart"`, `onPointerDown` with vibrate, `disabled={!canUndo}`), points-only slots (no multiplier prefix), dim sum line below, `bustFlash` → `bg-red-500/20 border-red-500/40` flash classes on the container, `cn()` from `@/lib/utils`.
- New test passed 5/5 (Step 4); full verification green (Step 5); committed (Step 6).

## Files created

- `src/components/scoring/DartSlotsDisplay.tsx` (68 lines)
- `src/components/__tests__/dartSlotsDisplay.test.tsx` (71 lines)

No other files modified. Forbidden files untouched (verified via `git show --stat` of the commit: 2 files changed, 139 insertions only).

## Verification output (actual)

**Step 2 — test fails (module not found):**
```
 Test Files  1 failed (1)
      Tests  no tests
```
(vite transform error: failed to resolve import `@/components/scoring/DartSlotsDisplay`)

**Step 4 — new test passes:**
```
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

**Step 5 — full suite:**
```
$ npm run test
 Test Files  13 passed (13)
      Tests  317 passed (317)      # 312 pre-existing + 5 new

$ npx tsc --noEmit
 exit: 0

$ npm run lint
 exit: 0
```

## Commit

- SHA: `ed94edd494850c3b022585e94541480a96aa121e` (short: `ed94edd`)
- Message: `feat(darts): add 3-slot dart display for single dart mode`
- Working tree clean after commit.

## Design decisions

- Code transcribed verbatim from the brief — no deviations.
- `DartEntry` interface confirmed in `src/hooks/useDartTurn.ts` (`{ segment: number; multiplier: Multiplier; points: number }`, exported) — consumed as type-only import.
- Test conventions followed: `// @vitest-environment jsdom` first line, `afterEach(() => { cleanup(); })` (vitest globals disabled per `vitest.config.ts`), `import '@testing-library/jest-dom/vitest'`, no `vi.mock` in `src/test/setup.ts`.
- No JSX return types (React 19 / repo convention); no return type annotation on the component, matching surrounding components (e.g. `TurnDisplay`).
- Undo button keeps `aria-label="Undo dart"` so `matchFlow.test.tsx`'s `/Undo/` selector keeps working.

## Tests added / updated

- Added: `src/components/__tests__/dartSlotsDisplay.test.tsx` — 5 tests (see summary). No existing tests modified.

## Unresolved concerns and risks

- None blocking. Minor notes:
  - Git reported LF→CRLF warnings on commit (repo autocrlf behavior); files are tracked with LF in the commit — cosmetic only.
  - `navigator.vibrate` guarded by feature check; not exercised by tests (matches `TurnDisplay` semantics).
  - Component is not yet consumed anywhere; the `bustFlash`/`total` props will be exercised end-to-end by Task 2's wiring.

## Ready for independent review

**Yes.** Implementation, verification (test/tsc/lint), and commit all recorded above.

### `tasks\T1-review.md`

# T1 Review — DartSlotsDisplay component

**Reviewer:** independent reviewer (not the implementer)
**Reviewed commit:** `ed94edd494850c3b022585e94541480a96aa121e` (`ed94edd`)
**Base:** `db870ef` — **Files in commit:** exactly 2 (`DartSlotsDisplay.tsx` +68, `dartSlotsDisplay.test.tsx` +71)
**Working tree:** clean; on-disk blobs byte-identical to the committed blobs (sha256 verified).

## Verdict

**APPROVED**

## Spec compliance verdict

**COMPLIANT.** The component and test file match the T1 brief verbatim, all global constraints hold, and every claim in the implementer report was independently verified:

| Check | Result | Evidence |
|---|---|---|
| Locked interface `{ darts, total, onUndo, canUndo, bustFlash }` | PASS | Diff lines 100–106, 113; `DartEntry` type-only import |
| `DartEntry` exported from `@/hooks/useDartTurn` | PASS | `useDartTurn.ts:5-9` — `{ segment; multiplier: Multiplier; points: number }` |
| 3 slots fill left→right with `dart.points`, no multiplier prefix | PASS | Lines 122–141 (`{dart.points}` only) |
| Empty slots render no number | PASS | `{dart && ...}` guard, line 133 |
| Sum line small/dim below slots | PASS | Line 142: `text-sm ... text-zinc-600` sibling span below the grid |
| Undo `aria-label="Undo dart"`, guarded vibrate | PASS | Lines 146, 149; `matchFlow.test.tsx:661` `/Undo/` selector remains satisfiable (label matches the regex; component not yet wired in, so no test impact today) |
| `bustFlash` red classes | PASS | Line 119 `bg-red-500/20 border-red-500/40` — byte-identical to `TurnDisplay.tsx:25`; same `transition-colors duration-150`, same `flex-[0.8] min-h-[70px] relative` wrapper |
| No forbidden files touched | PASS | `git show --stat ed94edd` — 2 files, 139 insertions only |
| No new npm dependencies | PASS | `@tabler/icons-react` pre-existing (`package.json:17`), used by `TurnDisplay`/`NumberPad`; no manifest changes in diff |
| Test conventions | PASS | `// @vitest-environment jsdom` first line; `afterEach(cleanup)`; `import '@testing-library/jest-dom/vitest'`; `setup.ts` contains no `vi.mock` (verified — only guarded stubs) |
| React 19, no `JSX.Element` return types | PASS | No return type annotations |
| Commit message matches brief | PASS | `feat(darts): add 3-slot dart display for single dart mode` |

## Findings

### Critical
None.

### Important
None.

### Minor

1. **Test query robustness — `dartSlotsDisplay.test.tsx:32-33, 52-54, 66-67, 73-74`**
   - Problem: tests 1–3 query with `document.querySelector(...)!` (non-null assertions). If a future refactor renames an internal class (`grid-cols-3`, `text-zinc-600`), the `!` turns the failure into a `TypeError` with a cryptic message instead of a clean assertion failure.
   - Impact: degraded failure diagnostics only; no false positives or coverage gaps (the 5 required cases are covered and assert real behavior — RTL role queries + `userEvent` for the undo cases are genuinely behavioral, not tautological).
   - Recommended correction: optional — assert `expect(...).not.toBeNull()` before reading properties, or scope queries via `render(...).container`. Not required to ship: this is the brief's verbatim template, and the implementer correctly transcribed it. Recommend the hardening be folded into a later task if the tests are touched again.

### Informational notes (non-blocking, no action required)

- **Bust flash parity:** during `bustFlash`, slot numbers stay cyan while `TurnDisplay` turns its total red. This is per-spec — the global constraint only requires container flash + slots clear, and Task 2 clears the slots on bust so numbers won't be visible during the flash anyway. No defect.
- **TDD sequence** (test-failed-first) is claimed in the report and consistent with a single-squash commit; the final state is what matters and it is correct.
- The undo handler calls `onUndo` on `pointerDown` with `preventDefault()` — identical semantics to `TurnDisplay.tsx:38`; `user.click` in test 5 exercises it and passes (report: 5/5).

## Required fixes

None.

---

**Review evidence gathered:** brief (`T1-brief.md`), implementer report (`T1-report.md`), full diff (`review-db870ef..ed94edd.diff`), plus independent spot-checks: `git log/show/status`, `useDartTurn.ts` (DartEntry export), `TurnDisplay.tsx` (bustFlash/undo parity), `package.json` + lockfile (no new deps), `vitest.config.ts` (globals disabled → cleanup requirement real), `src/test/setup.ts` (no `vi.mock`), `matchFlow.test.tsx` (`/Undo/` selector), `lib/utils.ts` (`cn`), and on-disk sha256 vs commit blobs. Full suite (317/317, tsc, lint) accepted per report per review instructions (not re-run).

### `tasks\T2-brief.md`

## Global Constraints

- Only Single dart mode changes. BOARD mode keeps `TurnDisplay` unchanged.
- Slot content: points only (no multiplier prefix). Sum line: small, dim, below the slots.
- Undo button kept, `aria-label="Undo dart"` (matchFlow.test.tsx selects `/Undo/` — must keep working).
- Bust: red flash on the slots container + slots clear (same `bustFlash` semantics as `TurnDisplay`).
- Do NOT modify: `src/hooks/useDartTurn.ts`, `src/components/scoring/TurnDisplay.tsx`, `DartBoardPad.tsx`, `NumberPad.tsx`, `ScoreInputPanel.tsx`, `src/app/match/page.tsx`, `src/components/__tests__/matchFlow.test.tsx`, `dartBoardPad.test.tsx`, `scoreInputPanel.test.tsx`.
- No new npm dependencies.
- Test conventions: `// @vitest-environment jsdom` as FIRST line; `afterEach(() => { cleanup(); })` + `import '@testing-library/jest-dom/vitest'` per file; never `vi.mock` in `src/test/setup.ts`.
- React 19: do NOT use `JSX.Element` return types (global JSX namespace removed — repo convention omits return types).
- Verification per task: `npm run test`, `npx tsc --noEmit`, `npm run lint` — all must pass.

---
### Task 2: Wire DartSlotsDisplay into SingleDartPad

**Files:**
- Modify: `src/components/scoring/SingleDartPad.tsx`
- Modify: `src/components/__tests__/singleDartPad.test.tsx`

**Interfaces:**
- Consumes: `DartSlotsDisplay` from Task 1 (`{ darts, total, onUndo, canUndo, bustFlash }`), `useDartTurn` return values (unchanged: `darts`, `total`, `lastOutcome`, `undoDart`).
- Produces: unchanged `SingleDartPad` public API (`{ onSubmit, currentScore, checkout }`) — `ScoreInputPanel` and `matchFlow.test.tsx` are unaffected.

- [ ] **Step 1: Update the existing tests first (they encode the old display)**

In `src/components/__tests__/singleDartPad.test.tsx`:

1. Add `within` to the RTL import:
   `import { cleanup, render, screen, within } from '@testing-library/react';`

2. Add helpers after `renderPad`:

```tsx
const slotsRow = () => document.querySelector('div.grid.grid-cols-3');
const sumLine = () => document.querySelector('span.text-zinc-600');
```

3. Test "records D20 = 40 after Double then 20, then resets to single" — replace the two display assertions:

```tsx
    expect(screen.getByText('40')).toBeInTheDocument();        // display total
    expect(screen.getByText(/1\/3/)).toBeInTheDocument();      // dart count
```

with:

```tsx
    expect(within(slotsRow()!).getByText('40')).toBeInTheDocument(); // first slot
    expect(sumLine()!.textContent).toBe('40');                       // dim sum
```

and replace the later assertion:

```tsx
    expect(screen.getByText('60')).toBeInTheDocument();        // 40 + S20
```

with:

```tsx
    expect(within(slotsRow()!).getByText('20')).toBeInTheDocument(); // second slot
    expect(within(slotsRow()!).getByText('40')).toBeInTheDocument(); // first slot stays
    expect(sumLine()!.textContent).toBe('60');                       // 40 + S20
```

4. Test "undoDart removes the last dart and restores the total" — replace:

```tsx
    expect(screen.getByText('20', { selector: 'span' })).toBeInTheDocument();
```

with:

```tsx
    expect(within(slotsRow()!).getByText('20')).toBeInTheDocument();
    expect(sumLine()!.textContent).toBe('20');
```

5. Test "records Double + 25 = 50 (same as BULL)" — replace:

```tsx
    expect(screen.getByText('50')).toBeInTheDocument();
```

with:

```tsx
    expect(within(slotsRow()!).getByText('50')).toBeInTheDocument();
    expect(sumLine()!.textContent).toBe('50');
```

All other tests in the file stay as-is (they assert `onSubmit` calls and button states, not the display).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/components/__tests__/singleDartPad.test.tsx`
Expected: FAIL — `div.grid.grid-cols-3` and `span.text-zinc-600` don't exist yet (old TurnDisplay renders instead).

- [ ] **Step 3: Modify SingleDartPad**

In `src/components/scoring/SingleDartPad.tsx`:

1. Replace the import:
   `import TurnDisplay from './TurnDisplay';` → `import DartSlotsDisplay from './DartSlotsDisplay';`
2. Delete the `breakdown` useMemo (lines 37-40) and the now-unused `useMemo` import (keep `useState`).
3. Replace the `<TurnDisplay ... />` block (lines 51-58) with:

```tsx
      <DartSlotsDisplay
        darts={darts}
        total={total}
        onUndo={undoDart}
        canUndo={darts.length > 0}
        bustFlash={lastOutcome === 'bust'}
      />
```

Everything else in the file (useDartTurn wiring, multiplier state, leg-over reset, segment grid, BULL button) stays untouched.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/components/__tests__/singleDartPad.test.tsx src/components/__tests__/dartSlotsDisplay.test.tsx`
Expected: all PASS (8 singleDartPad + 5 dartSlotsDisplay).

- [ ] **Step 5: Run full verification**

Run: `npm run test && npx tsc --noEmit && npm run lint`
Expected: full suite green (317 total), tsc exit 0, lint clean. `matchFlow.test.tsx` (17/17) and `dartBoardPad.test.tsx` unchanged and green.

- [ ] **Step 6: Commit**

```bash
git add src/components/scoring/SingleDartPad.tsx src/components/__tests__/singleDartPad.test.tsx
git commit -m "feat(darts): use slots display in single dart pad"
```

---

### `tasks\T2-report.md`

# T2 Report — Wire DartSlotsDisplay into SingleDartPad

## Task ID and objective

- **Task:** T2 — Wire DartSlotsDisplay into SingleDartPad
- **Workflow:** WF-20260818-120446-single-dart-slots-display
- **Objective:** Replace `TurnDisplay` with the Task 1 `DartSlotsDisplay` component inside `SingleDartPad.tsx` (single dart mode only), and update `singleDartPad.test.tsx` assertions that encoded the old display. BOARD mode keeps `TurnDisplay` unchanged.

## Implementation summary

1. **Tests first (Step 1):** Updated `src/components/__tests__/singleDartPad.test.tsx`:
   - Added `within` to the RTL import.
   - Added `slotsRow` / `sumLine` helpers after `renderPad`.
   - Replaced the display assertions in 3 tests ("records D20 = 40…", "undoDart removes…", "records Double + 25 = 50…") to assert slot content via `within(slotsRow()!)` and the dim sum via `sumLine()!.textContent`. The old `1/3` dart-count assertion was removed (slots display has no dart counter).
   - All other tests (onSubmit calls, button states) untouched.
2. **Red (Step 2):** `npm run test -- src/components/__tests__/singleDartPad.test.tsx` → 3 failed, exactly the three display-encoding tests (`div.grid.grid-cols-3` / `span.text-zinc-600` don't exist yet).
3. **Implementation (Step 3):** Modified `src/components/scoring/SingleDartPad.tsx`:
   - `import TurnDisplay from './TurnDisplay'` → `import DartSlotsDisplay from './DartSlotsDisplay'`.
   - Deleted the `breakdown` useMemo and the now-unused `useMemo` import (kept `useState`).
   - Replaced the `<TurnDisplay … />` block with `<DartSlotsDisplay darts={darts} total={total} onUndo={undoDart} canUndo={darts.length > 0} bustFlash={lastOutcome === 'bust'} />`.
   - Everything else (useDartTurn wiring, multiplier state, leg-over reset, segment grid, BULL button) untouched.
4. **Green (Step 4):** targeted run → 12/12 passed (7 singleDartPad + 5 dartSlotsDisplay).
5. **Full verification (Step 5):** `npm run test` → 317/317 passed (13 files); `npx tsc --noEmit` → exit 0; `npm run lint` → exit 0. `matchFlow.test.tsx` (17/17) and `dartBoardPad.test.tsx` unchanged and green.
6. **Commit (Step 6):** `f100062fe4092d80d9f5279b7434ce4b4f115fd4` — "feat(darts): use slots display in single dart pad" (2 files, +17/−16).

## Changed files

- `src/components/scoring/SingleDartPad.tsx` (modified)
- `src/components/__tests__/singleDartPad.test.tsx` (modified)

## Design decisions

- **Slots display semantics:** Slot content is points only (no multiplier prefix); the running total is shown small/dim below the slots (`span.text-zinc-600`), so it doesn't read as a score change — per global constraint.
- **Undo preserved:** `DartSlotsDisplay` keeps `aria-label="Undo dart"`, so `matchFlow.test.tsx`'s `/Undo/` selection still works (verified by full suite).
- **Bust flash:** `bustFlash={lastOutcome === 'bust'}` — same semantics as the old `TurnDisplay` wiring.
- **Deviation from verbatim brief (type-only):** The brief's literal helpers `document.querySelector('div.grid.grid-cols-3')` return `Element`, which is not assignable to `within()`'s `HTMLElement` parameter — `npx tsc --noEmit` failed with TS2345 at all 5 `within(slotsRow()!)` call sites. Fixed minimally by typing the helpers with the generic overload: `document.querySelector<HTMLElement>('div.grid.grid-cols-3')` / `document.querySelector<HTMLElement>('span.text-zinc-600')`. Selectors, call sites, and assertions are otherwise verbatim. (Task 1's `dartSlotsDisplay.test.tsx` uses the untyped form because it never passes the result to `within()`.) This deviation was required to satisfy the mandatory `npx tsc --noEmit` gate.

## Commands executed and exit results

| Command | Result |
|---|---|
| `npm run test -- src/components/__tests__/singleDartPad.test.tsx` (pre-change) | FAIL — 3 failed / 4 passed (expected red) |
| `npm run test -- src/components/__tests__/singleDartPad.test.tsx src/components/__tests__/dartSlotsDisplay.test.tsx` | PASS — 12/12 (2 files) |
| `npm run test` | PASS — 317/317 (13 files) |
| `npx tsc --noEmit` | exit 0 (after the `<HTMLElement>` helper fix; before it: exit 2, TS2345 ×5) |
| `npm run lint` | exit 0 |
| `git commit -m "feat(darts): use slots display in single dart pad"` | committed `f100062fe4092d80d9f5279b7434ce4b4f115fd4` |

## Tests added or updated

- Updated `src/components/__tests__/singleDartPad.test.tsx` (3 tests' display assertions rewritten; helpers added; `within` imported). Test count unchanged: 7 tests in file, all passing.
- No new test files. `dartSlotsDisplay.test.tsx` (5 tests, from Task 1) untouched and passing.

## Unresolved concerns and risks

- **Helper typing deviation** (see Design decisions): the only divergence from the verbatim brief; required for tsc to pass. Low risk — type-only, no runtime change.
- **Selector coupling:** `slotsRow`/`sumLine` selectors (`div.grid.grid-cols-3`, `span.text-zinc-600`) couple the test to DartSlotsDisplay's class names. Same pattern already used in `dartSlotsDisplay.test.tsx`; acceptable per repo convention.
- No other concerns. Forbidden files were not modified (verified via `git show --stat`).

## Ready for independent review

Yes — implementation, verification, and commit are complete; full suite, tsc, and lint all green.

### `tasks\T2-review.md`

# T2 Review — Wire DartSlotsDisplay into SingleDartPad

- **Reviewer:** independent task reviewer (not the implementer)
- **Commit under review:** `f100062fe4092d80d9f5279b7434ce4b4f115fd4` — "feat(darts): use slots display in single dart pad"
- **Review package:** `review-ed94edd..f100062.diff` (2 files, +17/−16)
- **Date:** 2026-08-18

## Verdict

**APPROVED**

## Spec compliance verdict

**COMPLIANT** — all brief steps and global constraints met, with one documented, type-only deviation that is justified and independently verified (see Finding M1).

Verified against the actual source files and git objects (not just the report):

1. **SingleDartPad.tsx** (`src/components/scoring/SingleDartPad.tsx`):
   - Import swapped `TurnDisplay` → `DartSlotsDisplay` (line 6); `TurnDisplay` no longer referenced anywhere in the file.
   - `breakdown` useMemo deleted; `useMemo` import removed, `useState` kept (line 2).
   - `<DartSlotsDisplay>` block (lines 46–52) passes exactly the required props: `darts={darts}`, `total={total}`, `onUndo={undoDart}`, `canUndo={darts.length > 0}`, `bustFlash={lastOutcome === 'bust'}`.
   - All other logic untouched: `useDartTurn` wiring (line 22), multiplier state, leg-over render-time reset, 1..25 segment grid, BULL button. `cn` import still used (grid + BULL classes). No dead code or unused imports remain.
2. **singleDartPad.test.tsx**: all three display-encoding tests updated with the brief's exact replacement assertions (verbatim — verified line by line against the brief); `within` added to the RTL import; helpers added after `renderPad`. The old `1/3` dart-count assertion was removed exactly as the brief's replacement dictates. All other tests untouched.
3. **Test conventions:** `// @vitest-environment jsdom` first line, `afterEach(cleanup)`, `import '@testing-library/jest-dom/vitest'` — all present (the latter two pre-existing).
4. **matchFlow `/Undo/` contract:** confirmed via `src/components/scoring/DartSlotsDisplay.tsx` line 52: `aria-label="Undo dart"` is present (Task 1 file, not part of this diff). The selector stays satisfied.
5. **Forbidden files:** `git diff --stat ed94edd f100062` shows exactly the 2 owned files; none of the forbidden files appear in the commit; `git status` clean.
6. **Commit hygiene:** exactly 2 files, +17/−16, message identical to the brief's specified `feat(darts): use slots display in single dart pad`.
7. **No new dependencies:** no `package.json`/lockfile changes in the commit.

## The documented deviation (verified)

The brief's literal helpers `document.querySelector('div.grid.grid-cols-3')` return `Element | null`; `within()` in the installed `@testing-library/dom@10.4.1` is `typeof getQueriesForElement`, whose signature is `(element: HTMLElement, ...)` (verified in `node_modules/.pnpm/@testing-library+dom@10.4.1/.../types/get-queries-for-element.d.ts` lines 178–182). `Element` is not assignable to `HTMLElement`, so the bare form fails tsc with TS2345 at all five `within(slotsRow()!)` call sites — exactly as reported. The `<HTMLElement>` generic is:

- **type-only** (no runtime effect — TypeScript generics on `querySelector` are erased),
- **selectors/call sites/assertions verbatim** (compared against the brief's replacement blocks),
- **minimally scoped** — no other changes crept in; the report's explanation that `dartSlotsDisplay.test.tsx` keeps the bare form because it never passes results to `within()` is accurate (verified: no `within` usage in that file).

The deviation was necessary to satisfy the mandatory `npx tsc --noEmit` gate and is correctly documented in the report.

## Findings

### Critical
None.

### Important
None.

### Minor

- **M1 (Minor — informational, justified deviation):** `src/components/__tests__/singleDartPad.test.tsx` lines 27–28 — helpers use `document.querySelector<HTMLElement>(...)` where the brief wrote bare `document.querySelector(...)`. Verified type-only and genuinely required (see above). **No correction needed**; documented for traceability. If the team later wants the brief to be byte-exact, the brief's Step 1 snippet should be amended to include the generic, but the implementation as committed is correct.
- **M2 (Minor — brief inaccuracy, not an implementer defect):** The brief's Step 4 expected "8 singleDartPad + 5 dartSlotsDisplay" (13 tests); the file has always had 7 tests (verified at both `ed94edd` and `f100062` — count unchanged, no test deleted). The implementer's reported 12/12 (7 + 5) is accurate. The brief's expectation was wrong; no action required beyond noting the discrepancy for plan accuracy.
- **M3 (Minor — nit, pre-existing pattern):** `src/components/__tests__/singleDartPad.test.tsx` — the test file ends without a trailing newline (`});` at EOF, verified via blob bytes at both commits). This is **pre-existing** (identical at `ed94edd`), not introduced by T2; the diff only shows the marker because the last hunk touches EOF. Same `!` non-null-assertion + CSS-class selector coupling pattern as `dartSlotsDisplay.test.tsx` (repo convention). No correction required; a future touch of this file could add the newline and prefer `getByRole`/`getByText`-scoped queries.

## Test quality assessment

The rewritten assertions are **stronger** than what they replaced: `within(slotsRow()!).getByText('40')` asserts per-slot content, and `sumLine()!.textContent` asserts the dim total — the old screen-wide `screen.getByText('40')` would now be ambiguous (both a slot and the sum line render "40"), so replacing rather than keeping them was the correct call. The second-slot and first-slot-stays assertions in test 1 genuinely exercise slot filling behavior, and the undo test asserts both slot content and restored total. Selector uniqueness in the rendered tree was verified (`div.grid.grid-cols-3` and `span.text-zinc-600` each match exactly one element in SingleDartPad's render: DartSlotsDisplay lines 28 and 48; the segment grid is `grid-cols-5`, and other `grid-cols-3`/`text-zinc-600` usages live in components not rendered by these tests).

## Verification evidence (from implementer report, not re-run per review instructions)

| Check | Result |
|---|---|
| Targeted (pre-change) `singleDartPad.test.tsx` | FAIL — 3 failed (expected red) |
| Targeted post-change (7 + 5) | PASS — 12/12 |
| `npm run test` | PASS — 317/317 (13 files) |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 |
| Commit | `f100062`, 2 files, message matches brief |

Reviewer independently re-verified: tsc blocking claim (`within` signature in installed dom@10.4.1), test counts at both commits, exact diff content, commit stat/message, working-tree cleanliness, `aria-label="Undo dart"` presence, selector uniqueness, and that no forbidden file appears in the commit range.

## Conclusion

The task is fully compliant with the brief, the documented deviation is real, minimal, and necessary, and no defects were found that warrant changes. APPROVED.

### `tasks\T3-brief.md`

## Global Constraints

- Only Single dart mode changes. BOARD mode keeps `TurnDisplay` unchanged.
- Slot content: points only (no multiplier prefix). Sum line: small, dim, below the slots.
- Undo button kept, `aria-label="Undo dart"` (matchFlow.test.tsx selects `/Undo/` — must keep working).
- Bust: red flash on the slots container + slots clear (same `bustFlash` semantics as `TurnDisplay`).
- Do NOT modify: `src/hooks/useDartTurn.ts`, `src/components/scoring/TurnDisplay.tsx`, `DartBoardPad.tsx`, `NumberPad.tsx`, `ScoreInputPanel.tsx`, `src/app/match/page.tsx`, `src/components/__tests__/matchFlow.test.tsx`, `dartBoardPad.test.tsx`, `scoreInputPanel.test.tsx`.
- No new npm dependencies.
- Test conventions: `// @vitest-environment jsdom` as FIRST line; `afterEach(() => { cleanup(); })` + `import '@testing-library/jest-dom/vitest'` per file; never `vi.mock` in `src/test/setup.ts`.
- React 19: do NOT use `JSX.Element` return types (global JSX namespace removed — repo convention omits return types).
- Verification per task: `npm run test`, `npx tsc --noEmit`, `npm run lint` — all must pass.

---

### `tasks\T3-report.md`

# T3 Report — Update system overview docs

## Task ID and Objective

- **Task ID:** T3
- **Objective:** Update `docs/10-system-overview.md` to reflect the new Single dart mode 3-slot display (`DartSlotsDisplay`) introduced by Tasks 1-2. Docs-only task — no code changes.

## Implementation Summary

Appended exactly ONE new bullet after line 55 (the Settings popover line) in the Score Entry section of `docs/10-system-overview.md`:

```
- **1 DART** горимд сум бүрийн оноо 3 slot-д дүүрч харагдана; нийлбэр нь доор жижиг бүдэг текстээр (DartSlotsDisplay)
```

The bullet text matches the task specification verbatim. No other content was modified.

## Changed Files

- `docs/10-system-overview.md` — 1 insertion (new bullet at line 56)

No `src/` files or any other docs files were touched (confirmed via `git status --short` before commit: only `docs/10-system-overview.md` modified).

## Design Decisions

- Followed the exact bullet text and placement specified in the task brief (after the Settings popover line, end of Score Entry section).
- No formatting changes to surrounding lines; kept the existing Mongolian-language doc style.

## Commands Executed and Exit Results

| Command | Exit | Result |
|---|---|---|
| `npx tsc --noEmit && npm run lint` | 0 | Clean — no type errors, no lint errors (eslint produced no output) |
| `git add docs/10-system-overview.md && git commit -m "docs: note single dart slots display in system overview"` | 0 | Committed: `fc3ede1` — "docs: note single dart slots display in system overview", 1 file changed, 1 insertion(+) |

## Tests Added or Updated

None — docs-only task; no test changes required or made.

## Unresolved Concerns and Risks

- None. The change is a single documentation line; no functional risk.

## Ready for Independent Review

Yes — task is complete and ready for independent review.

### `tasks\T3-review.md`

# T3 Review — Update system overview docs

- **Reviewer:** independent task reviewer (not the implementer)
- **Reviewed commit:** `fc3ede1` — "docs: note single dart slots display in system overview"
- **Review package:** `.superpowers/sdd/WF-20260818-120446-single-dart-slots-display/review-f100062..fc3ede1.diff`
- **Date:** 2026-08-18

## Verdict: APPROVED

## Findings

### BLOCKER
None.

### HIGH
None.

### MEDIUM
None.

### LOW

1. **T3-brief.md omits the task-specific spec** — `tasks/T3-brief.md` contains only the 13-line Global Constraints section; the actual task spec (exact bullet text, placement after line 55, commit message) lives only in `docs/plans/WF-20260818-120446-single-dart-slots-display.md` (Task 3, lines 339–371). The implementer's report references "the task specification" without pointing at the plan doc. Impact: a future reader of the brief alone cannot verify the task's acceptance criteria; verification had to be done against the plan. Correction: briefs should embed the task-specific steps (or link the plan section) so each task file is self-contained.

## Verification performed

### 1. Accuracy — PASS
- **Bullet text matches spec verbatim.** Plan Task 3 Step 1 (line 358) specifies:
  `- **1 DART** горимд сум бүрийн оноо 3 slot-д дүүрч харагдана; нийлбэр нь доор жижиг бүдэг текстээр (DartSlotsDisplay)`
  The diff (`+` line in `review-f100062..fc3ede1.diff`) and the committed file both contain this exact string — byte-identical, including the Mongolian text and the trailing `(DartSlotsDisplay)`.
- **Placement correct.** The diff hunk `@@ -53,3 +53,4 @@` appends the bullet immediately after the Settings popover line ("Горим шилжүүлэгч AppBar-ын баруун талын Settings popover цэсээр хийгдэнэ (3 DARTS / 1 DART / BOARD)"), which is line 55 of the updated file; the new bullet is line 56, at the end of the Score Entry section. Verified against the live file (`sed -n '50,58p'`).
- **Claim matches implementation.** `src/components/scoring/DartSlotsDisplay.tsx` renders exactly what the bullet claims:
  - 3 slots: `grid grid-cols-3` with `[0, 1, 2].map` (lines 28–47) — "сум бүрийн оноо 3 slot-д дүүрч харагдана" ✓
  - Each slot shows `dart.points` only, no multiplier prefix (line 41) ✓
  - Sum below in small dim text: `text-sm font-mono text-zinc-600` (line 48) — "нийлбэр нь доор жижиг бүдэг текстээр" ✓
  - Component is actually wired into Single dart mode (T2, commit `f100062`), so the doc claim is not aspirational.

### 2. Scope — PASS
- `git show --stat fc3ede1`: exactly 1 file changed, `docs/10-system-overview.md`, 1 insertion(+). No `src/` files, no other docs files.
- `git status --short` and `git diff HEAD --stat`: working tree clean — no uncommitted or stray changes.

### 3. Diff hygiene — PASS
- Commit message `docs: note single dart slots display in system overview` matches plan Task 3 Step 3 (line 370) exactly.
- Single logical change (one bullet), conventional-commit prefix `docs:` appropriate for a docs-only change.
- Report's claims (1 insertion, commit hash `fc3ede1`, message) all match the actual commit.

### 4. Report accuracy — PASS
- Report's "appended exactly ONE new bullet after line 55" — confirmed.
- Report's "No `src/` files or any other docs files were touched" — confirmed via commit stat and clean working tree.
- Report's tsc/lint claim (exit 0) is plausible and low-risk for a docs-only change; not re-run independently since no code was touched and the change cannot affect type-checking or lint results.

## Conclusion

The task is complete, correct, and minimal: one bullet, exact spec text, correct placement, correct commit message, zero scope creep. The single LOW finding is a workflow-artifact nit (incomplete brief file), not a defect in the change.


## Implementation and Review Reports

_No artifacts recorded._

## Verification Evidence

_No artifacts recorded._

## Final Progress Snapshot

# Workflow Progress — WF-20260818-120446-single-dart-slots-display

- **Objective:** Single dart mode: show 3 input slots that fill with each dart's points; show the 3-dart sum below in small dim text (replaces the big cyan total which looks like the score is being subtracted)
- **Status:** `compacting`
- **Current stage:** `finalize`
- **Last checkpoint:** `final_summary_written`
- **Next action:** `{"path": "D:\\own\\nomad-darts\\docs\\implementations\\WF-20260818-120446-single-dart-slots-display.md", "type": "write_final_report"}`
- **Updated:** 2026-08-18T12:38:46+00:00

## Task status

- **completed:** T1, T2, T3

## Completion gates

- Integration verification: `passed`
- Documentation updated: `True`
- Final summary written: `True`
- Compaction validated: `True`

Detailed evidence is stored in the workflow's research, tasks, reports, and verification directories.


## Event Timeline

| Time | Stage | Task | Event | Outcome |
|---|---|---|---|---|
| 2026-08-18T12:04:46+00:00 | intake_recovery |  | workflow_initialized | success |
| 2026-08-18T12:08:05+00:00 | intake_recovery | T1 | task_state_changed | pending |
| 2026-08-18T12:08:31+00:00 | intake_recovery | T1 | task_state_changed | pending |
| 2026-08-18T12:08:37+00:00 | intake_recovery | T2 | task_state_changed | pending |
| 2026-08-18T12:08:43+00:00 | intake_recovery | T3 | task_state_changed | pending |
| 2026-08-18T12:08:48+00:00 | planning |  | plan_created | success |
| 2026-08-18T12:09:59+00:00 | intake_recovery | T1 | task_state_changed | in_progress |
| 2026-08-18T12:14:56+00:00 | intake_recovery | T1 | task_state_changed | completed |
| 2026-08-18T12:15:02+00:00 | execution | T1 | task_review | approved |
| 2026-08-18T12:15:07+00:00 | intake_recovery | T2 | task_state_changed | in_progress |
| 2026-08-18T12:23:05+00:00 | intake_recovery | T2 | task_state_changed | completed |
| 2026-08-18T12:23:10+00:00 | execution | T2 | task_review | approved |
| 2026-08-18T12:23:16+00:00 | intake_recovery | T3 | task_state_changed | in_progress |
| 2026-08-18T12:26:21+00:00 | intake_recovery | T3 | task_state_changed | completed |
| 2026-08-18T12:26:26+00:00 | execution | T3 | task_review | approved |
| 2026-08-18T12:37:53+00:00 | integration |  | integration_verification | passed |
| 2026-08-18T12:37:59+00:00 | integration |  | checkpoint_reached | success |
| 2026-08-18T12:38:04+00:00 | documentation |  | checkpoint_reached | success |
| 2026-08-18T12:38:10+00:00 | finalize |  | checkpoint_reached | success |
| 2026-08-18T12:38:29+00:00 | planning |  | checkpoint_reached | success |
| 2026-08-18T12:38:43+00:00 | finalize |  | checkpoint_reached | success |
| 2026-08-18T12:38:46+00:00 | finalize |  | compaction_validated | success |

## Retention

Durable system documentation, architecture decisions, source code, tests, and this final report remain permanent. Temporary workflow artifacts were eligible for cleanup only after this report was safely written and validated.
