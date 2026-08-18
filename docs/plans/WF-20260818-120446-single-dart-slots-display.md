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