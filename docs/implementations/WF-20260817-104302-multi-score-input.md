# Workflow Implementation Report

## Metadata

- **Workflow ID:** `WF-20260817-104302-multi-score-input`
- **Original objective:** Score entry keyboard: multiple input modes — Single dart, Three darts, Touch (dartboard shown, tap where dart landed); touch board on large screens depending on screen size
- **Project root:** `D:\own\nomad-darts`
- **Started:** 2026-08-17T10:43:02+00:00
- **Completed:** 2026-08-17T20:29:36+00:00
- **Risk classification:** `low`
- **Final status:** `completed`

## Outcome

All recorded implementation tasks passed task-level verification and independent review, integration verification passed, and durable documentation was updated before compaction.

## Approved Plan

# Implementation Plan — WF-20260817-104302-multi-score-input

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three score-entry modes (3 DARTS numeric pad — unchanged, 1 DART segment selector, BOARD touch dartboard ≥768px) with live per-dart bust/finish rules and correct darts-used statistics.

**Architecture:** A new `ScoreInputPanel` hosts a mode switcher and renders one of three pads. The two per-dart pads (1 DART, BOARD) share a single `useDartTurn` hook and pure geometry/scoring functions in `lib/dartboard.ts`. The reducer learns to record actual darts used on busts.

**Tech Stack:** Next.js 16 (App Router), React 19, Redux Toolkit (matchSlice), Tailwind CSS v4, framer-motion, Tabler icons, vitest 4 (node default env, per-file jsdom docblock), @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-08-17-multi-score-input-design.md` (user-approved).

## Global Constraints

- Path alias `@/` → `src/` (vite-tsconfig-paths + tsconfig).
- Test env: default `node`; component tests opt into jsdom with `// @vitest-environment jsdom` as the FIRST line. Never put `vi.mock` in `src/test/setup.ts`.
- Verification commands (every task, before claiming done): `npx tsc --noEmit`, `npm run lint`, `npm run test`.
- Design system: dark theme, zinc-900 surfaces, `border-white/5`, `rounded-2xl`; cyan = active/confirm, green = bull, red = bust; buttons react on `pointerdown`; `select-none touch-none`; `navigator.vibrate` on press (stubbed in setup); `font-black`/`font-mono`; Tabler icons; framer-motion for overlays.
- Do NOT change NumberPad's root classes (`p-2 gap-2 bg-black`) — `matchFlow.test.tsx` locates it by that selector.
- Reducer rule already present: double-out auto-bust when `remaining === 1` — keep it.
- No new npm dependencies.
- Commit after every task with the given message.

---

### Task 1: Reducer — bust records actual darts used

**Files:**
- Modify: `src/lib/redux/matchSlice.ts:143` and `:151`
- Modify: `src/lib/redux/__tests__/matchSlice.test.ts`
- Test: `src/lib/redux/__tests__/matchSlice.test.ts`

**Interfaces:**
- Consumes: nothing new (existing `submitTurn` payload `{ score: number; dartsUsed?: number; isBust?: boolean }`).
- Produces: bust turns now carry `dartsUsed` = the actual darts thrown, and `totalDartsThrown` increments by that same value. Callers who omit `dartsUsed` (e.g. auto-bust `submitTurn({ score: 600 })`) now add 0 darts — consistent with the existing "omitted dartsUsed adds 0" behavior for non-bust turns.

- [ ] **Step 1: Change the reducer**

In `src/lib/redux/matchSlice.ts`:

```ts
// line 143 — was: dartsUsed: isBust ? 3 : dartsUsed,
dartsUsed: dartsUsed, // бодит шидсэн сумны тоо (bust дээр ч мөн адил)
```

```ts
// line 151 — was: activePlayer.totalDartsThrown += 3;
activePlayer.totalDartsThrown += dartsUsed;
```

- [ ] **Step 2: Update the bust assertions in `matchSlice.test.ts`**

New semantics: a bust records the **actual** `dartsUsed` passed in. Known assertions to update (search each by comment text; there may be a few more — fix any test that fails with the new semantics):

1. `"counts 3 darts for a bust regardless of dartsUsed"` → rename to `"counts the actual dartsUsed for a bust"` and expect `1`:
```ts
const state = matchReducer(startPlaying(), submitTurn({ score: 600, dartsUsed: 1 }));
expect(state.players[0].totalDartsThrown).toBe(1);
```
2. The auto-bust-omitted case (`submitTurn({ score: 600 })`) keeps its "adds 0 darts when dartsUsed is omitted" comment; it now stays at `0` (previously the bust branch forced 3) — verify/update the assertion to `0`.
3. `"adds 0 darts when dartsUsed is omitted (current reducer behavior)"` — unchanged (still 0 for a normal turn).
4. The "1 remaining → bust" case that dispatches `submitTurn({ score: 1, dartsUsed: 1 })` (double-out) — expected `turn.dartsUsed` changes `3` → `1`.
5. `submitTurn({ score: 0, isBust: true })` (explicit bust, dartsUsed omitted) — `turn.dartsUsed` changes `3` → `0`. If a test wants 3, it must pass `dartsUsed: 3` explicitly.

- [ ] **Step 3: Run the suite**

Run: `npm run test -- src/lib/redux/__tests__/matchSlice.test.ts`
Expected: all pass (after the assertion updates). Then `npx tsc --noEmit` and `npm run lint` — clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/redux/matchSlice.ts src/lib/redux/__tests__/matchSlice.test.ts
git commit -m "fix(match): bust turns record actual darts used"
```

---

### Task 2: `lib/dartboard.ts` — geometry and scoring math

**Files:**
- Create: `src/lib/dartboard.ts`
- Test: `src/lib/__tests__/dartboard.test.ts`

**Interfaces:**
- Consumes: nothing (pure module, no React).
- Produces (locked — later tasks import exactly these):

```ts
export type Multiplier = 'S' | 'D' | 'T';
export type BullZone = 'inner' | 'outer' | null;

export const SEGMENT_ORDER: number[];            // [20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5]
export const SEGMENT_ANGLE = 18;                 // degrees per wedge
export const R_DOUBLE_IN = 0.953;                // double ring inner radius (R=1)
export const R_TRIPLE_OUT = 0.629;               // triple ring outer radius
export const R_TRIPLE_IN = 0.582;                // triple ring inner radius
export const R_OUTER_BULL = 0.094;               // outer bull radius
export const R_INNER_BULL = 0.037;               // inner bull radius

export function segmentFromAngleDeg(deg: number): number;
// 0° = 12 o'clock (segment 20), increases clockwise. Normalizes any input to [0,360).

export function bullZoneFromRadius(r: number): BullZone;
// r in [0,1]. r <= R_INNER_BULL -> 'inner'; r <= R_OUTER_BULL -> 'outer'; else null.

export function canApplyMultiplier(segment: number, m: Multiplier): boolean;
// 1..20: any of S/D/T. 25: S or D only. 50 (bull): S only.

export function scoreDart(segment: number, m: Multiplier): number;
// 0 when !canApplyMultiplier(segment, m); else S=seg, D=2*seg, T=3*seg; bull: 25/50 as given.
```

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/dartboard.test.ts` (node env, no docblock needed):

```ts
import { describe, expect, it } from 'vitest';
import {
  SEGMENT_ORDER, canApplyMultiplier, scoreDart,
  bullZoneFromRadius, segmentFromAngleDeg,
  R_INNER_BULL, R_OUTER_BULL, R_TRIPLE_IN, R_TRIPLE_OUT, R_DOUBLE_IN,
} from '@/lib/dartboard';

describe('segmentFromAngleDeg', () => {
  it('maps 0° (12 o\'clock) to segment 20', () => {
    expect(segmentFromAngleDeg(0)).toBe(20);
  });
  it('walks the 20 segments clockwise by 18°', () => {
    SEGMENT_ORDER.forEach((segment, i) => {
      expect(segmentFromAngleDeg(i * 18)).toBe(segment);
    });
  });
  it('wraps negative and >360 angles', () => {
    expect(segmentFromAngleDeg(-18)).toBe(SEGMENT_ORDER[19]);
    expect(segmentFromAngleDeg(360)).toBe(20);
    expect(segmentFromAngleDeg(9)).toBe(20);      // center of first wedge
  });
  it('normalizes 45° to the 3rd wedge boundary', () => {
    expect(segmentFromAngleDeg(36)).toBe(SEGMENT_ORDER[2]);
  });
});

describe('bullZoneFromRadius', () => {
  it('classifies inner bull, outer bull, and segment zones', () => {
    expect(bullZoneFromRadius(R_INNER_BULL * 0.5)).toBe('inner');
    expect(bullZoneFromRadius(R_OUTER_BULL * 0.9)).toBe('outer');
    expect(bullZoneFromRadius(R_TRIPLE_IN)).toBe(null);
    expect(bullZoneFromRadius(1)).toBe(null);
  });
});

describe('canApplyMultiplier / scoreDart', () => {
  it('scores normal segments with all multipliers', () => {
    expect(scoreDart(20, 'S')).toBe(20);
    expect(scoreDart(20, 'D')).toBe(40);
    expect(scoreDart(20, 'T')).toBe(60);
    expect(scoreDart(7, 'T')).toBe(21);
  });
  it('bull: 25 allows S and D; 50 allows S only', () => {
    expect(scoreDart(25, 'S')).toBe(25);
    expect(scoreDart(25, 'D')).toBe(50);
    expect(scoreDart(50, 'S')).toBe(50);
    expect(canApplyMultiplier(25, 'T')).toBe(false);
    expect(canApplyMultiplier(50, 'D')).toBe(false);
    expect(canApplyMultiplier(50, 'T')).toBe(false);
    expect(scoreDart(50, 'D')).toBe(0);
  });
  it('rejects segments outside the board', () => {
    expect(scoreDart(0, 'S')).toBe(0);
    expect(scoreDart(26, 'S')).toBe(0);
    expect(scoreDart(99, 'D')).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/__tests__/dartboard.test.ts`
Expected: FAIL — module not found / exports missing.

- [ ] **Step 3: Write the implementation**

Create `src/lib/dartboard.ts`:

```ts
// Pure dartboard geometry and scoring. No React imports — unit-testable in node.

export type Multiplier = 'S' | 'D' | 'T';
export type BullZone = 'inner' | 'outer' | null;

export const SEGMENT_ANGLE = 18; // degrees per wedge

/** Standard segment order, clockwise from 12 o'clock (segment 20). */
export const SEGMENT_ORDER: number[] = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
];

// Ring radii as fractions of board radius R=1 (standard dartboard proportions).
export const R_DOUBLE_IN = 0.953;
export const R_TRIPLE_OUT = 0.629;
export const R_TRIPLE_IN = 0.582;
export const R_OUTER_BULL = 0.094;
export const R_INNER_BULL = 0.037;

/** Normalize any angle to [0, 360). */
function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Map an angle to a segment number. 0° = 12 o'clock (20), clockwise.
 * Deg is measured from the screen direction (atan2(dx, -dy) in screen coords).
 */
export function segmentFromAngleDeg(deg: number): number {
  const idx = Math.floor(normalizeDeg(deg) / SEGMENT_ANGLE) % 20;
  return SEGMENT_ORDER[idx];
}

/** Classify a normalized radius (0..1) into bull zones; null = segment area. */
export function bullZoneFromRadius(r: number): BullZone {
  if (r <= R_INNER_BULL) return 'inner';
  if (r <= R_OUTER_BULL) return 'outer';
  return null;
}

/** Multiplier validity per segment: 1-20 any; 25 S/D; 50 (bull) S only. */
export function canApplyMultiplier(segment: number, m: Multiplier): boolean {
  if (Number.isInteger(segment) && segment >= 1 && segment <= 20) return true;
  if (segment === 25) return m === 'S' || m === 'D';
  if (segment === 50) return m === 'S';
  return false;
}

/** Points for one dart; 0 when the combination is not a real dart score. */
export function scoreDart(segment: number, m: Multiplier): number {
  if (!canApplyMultiplier(segment, m)) return 0;
  if (segment === 25) return m === 'D' ? 50 : 25;
  if (segment === 50) return 50;
  if (m === 'D') return segment * 2;
  if (m === 'T') return segment * 3;
  return segment;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/__tests__/dartboard.test.ts`
Expected: PASS. Then `npx tsc --noEmit` and `npm run lint` — clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dartboard.ts src/lib/__tests__/dartboard.test.ts
git commit -m "feat(darts): add pure dartboard geometry and scoring math"
```

---

### Task 3: `useDartTurn` — shared per-dart turn engine

**Files:**
- Create: `src/hooks/useDartTurn.ts`
- Test: `src/hooks/__tests__/useDartTurn.test.ts` (node — pure function) and `src/hooks/__tests__/useDartTurn.hook.test.tsx` (jsdom docblock)

**Interfaces:**
- Consumes: `Multiplier`, `scoreDart` from `@/lib/dartboard` (Task 2).
- Produces (locked):

```ts
export interface DartEntry { segment: number; multiplier: Multiplier; points: number; }
export type TurnStatus = 'continue' | 'bust' | 'finish';
export type TurnOutcome = 'added' | 'submitted' | 'bust' | 'finish';

// Pure decision function (node-testable):
export function resolveTurnStatus(
  darts: DartEntry[],
  remaining: number,
  checkout: 'double' | 'straight'
): TurnStatus;
// total > remaining                     -> 'bust'
// total === remaining:
//   straight                            -> 'finish'
//   double-out: last dart 'D' or segment 50 -> 'finish'  (bull counts as a double)
//   double-out otherwise                -> 'bust'
// else                                  -> 'continue'

export function useDartTurn(opts: {
  currentScore: number;
  checkout: 'double' | 'straight';
  onSubmit: (score: number, dartsUsed?: number, isBust?: boolean) => void;
}): {
  darts: DartEntry[];
  total: number;
  lastOutcome: TurnOutcome | null;
  addDart: (segment: number, multiplier: Multiplier) => TurnOutcome;
  undoDart: () => void;
};
// addDart appends the dart, re-checks:
//   'bust'  -> onSubmit(0, n, true), clears darts
//   'finish'-> onSubmit(total, n, false), clears darts
//   n === 3 -> onSubmit(total, 3, false), clears darts, outcome 'submitted'
//   else    -> outcome 'added'
// lastOutcome is reset to null on the next addDart and on undoDart.
// If currentScore changes (new turn / external undo), darts reset.
```

- [ ] **Step 1: Write the failing pure-function test**

Create `src/hooks/__tests__/useDartTurn.test.ts` (node):

```ts
import { describe, expect, it } from 'vitest';
import { resolveTurnStatus, type DartEntry } from '@/hooks/useDartTurn';

const dart = (segment: number, multiplier: 'S' | 'D' | 'T'): DartEntry => ({
  segment, multiplier, points: segment * (multiplier === 'S' ? 1 : multiplier === 'D' ? 2 : 3),
});

describe('resolveTurnStatus', () => {
  it('continues while total is below remaining', () => {
    expect(resolveTurnStatus([dart(20, 'T')], 300, 'double')).toBe('continue');
  });
  it('busts when total exceeds remaining (even on the 1st dart)', () => {
    expect(resolveTurnStatus([dart(20, 'S')], 10, 'double')).toBe('bust');
  });
  it('busts on the 2nd dart', () => {
    expect(resolveTurnStatus([dart(20, 'S'), dart(60, 'T')], 50, 'double')).toBe('bust');
  });
  it('finishes straight-out on exact match', () => {
    expect(resolveTurnStatus([dart(20, 'S')], 20, 'straight')).toBe('finish');
  });
  it('finishes double-out on a double', () => {
    expect(resolveTurnStatus([dart(20, 'D')], 40, 'double')).toBe('finish');
  });
  it('finishes double-out on bull (50 counts as a double)', () => {
    expect(resolveTurnStatus([{ segment: 50, multiplier: 'S', points: 50 }], 50, 'double')).toBe('finish');
  });
  it('busts double-out on an exact single (S20 on 20)', () => {
    expect(resolveTurnStatus([dart(20, 'S')], 20, 'double')).toBe('bust');
  });
  it('busts double-out on 1 remaining with a single 1', () => {
    expect(resolveTurnStatus([dart(1, 'S')], 1, 'double')).toBe('bust');
  });
  it('continues on a two-dart exact match only when not last-dart-double', () => {
    // T20 + S20 on 80: total 80 === remaining, last dart is a single -> bust in double-out
    expect(resolveTurnStatus([dart(20, 'T'), dart(20, 'S')], 80, 'double')).toBe('bust');
  });
});
```

- [ ] **Step 2: Write the failing hook test**

Create `src/hooks/__tests__/useDartTurn.hook.test.tsx` (FIRST LINE: `// @vitest-environment jsdom`):

```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDartTurn } from '@/hooks/useDartTurn';

const onSubmit = vi.fn();

describe('useDartTurn', () => {
  it('auto-submits after the 3rd dart with 3 darts', () => {
    const { result } = renderHook(() =>
      useDartTurn({ currentScore: 301, checkout: 'double', onSubmit })
    );
    act(() => result.current.addDart(20, 'S'));
    act(() => result.current.addDart(20, 'S'));
    expect(onSubmit).not.toHaveBeenCalled();
    act(() => result.current.addDart(20, 'S'));
    expect(onSubmit).toHaveBeenCalledWith(60, 3, false);
    expect(result.current.darts).toHaveLength(0);
  });

  it('submits a bust immediately with the actual dart count', () => {
    const { result } = renderHook(() =>
      useDartTurn({ currentScore: 10, checkout: 'double', onSubmit })
    );
    act(() => result.current.addDart(20, 'S'));
    expect(onSubmit).toHaveBeenCalledWith(0, 1, true);
    expect(result.current.lastOutcome).toBe('bust');
  });

  it('submits a finish on the 2nd dart with 2 darts used', () => {
    const { result } = renderHook(() =>
      useDartTurn({ currentScore: 80, checkout: 'double', onSubmit })
    );
    act(() => result.current.addDart(20, 'T')); // 60 < 80 — continue
    act(() => result.current.addDart(10, 'D')); // 20 → 80 === 80, last dart double
    expect(onSubmit).toHaveBeenCalledWith(80, 2, false);
  });

  it('undoDart removes the last dart and resets the outcome', () => {
    const { result } = renderHook(() =>
      useDartTurn({ currentScore: 301, checkout: 'double', onSubmit })
    );
    act(() => result.current.addDart(20, 'T'));
    act(() => result.current.addDart(7, 'D'));
    act(() => result.current.undoDart());
    expect(result.current.darts).toHaveLength(1);
    expect(result.current.total).toBe(60);
    expect(result.current.lastOutcome).toBeNull();
  });

  it('resets when currentScore changes', () => {
    const { result, rerender } = renderHook(
      ({ score }) => useDartTurn({ currentScore: score, checkout: 'double', onSubmit }),
      { initialProps: { score: 301 } }
    );
    act(() => result.current.addDart(20, 'S'));
    rerender({ score: 281 });
    expect(result.current.darts).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run both tests to verify they fail**

Run: `npm run test -- src/hooks/__tests__/useDartTurn.test.ts src/hooks/__tests__/useDartTurn.hook.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the implementation**

Create `src/hooks/useDartTurn.ts`:

```ts
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { scoreDart, type Multiplier } from '@/lib/dartboard';

export interface DartEntry {
  segment: number;
  multiplier: Multiplier;
  points: number;
}

export type TurnStatus = 'continue' | 'bust' | 'finish';
export type TurnOutcome = 'added' | 'submitted' | 'bust' | 'finish';

export function resolveTurnStatus(
  darts: DartEntry[],
  remaining: number,
  checkout: 'double' | 'straight'
): TurnStatus {
  if (darts.length === 0) return 'continue';
  const total = darts.reduce((sum, d) => sum + d.points, 0);
  if (total > remaining) return 'bust';
  if (total === remaining) {
    if (checkout === 'straight') return 'finish';
    const last = darts[darts.length - 1];
    if (last.multiplier === 'D' || last.segment === 50) return 'finish';
    return 'bust';
  }
  return 'continue';
}

interface UseDartTurnOptions {
  currentScore: number;
  checkout: 'double' | 'straight';
  onSubmit: (score: number, dartsUsed?: number, isBust?: boolean) => void;
}

export function useDartTurn({ currentScore, checkout, onSubmit }: UseDartTurnOptions) {
  const [darts, setDarts] = useState<DartEntry[]>([]);
  const [lastOutcome, setLastOutcome] = useState<TurnOutcome | null>(null);
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  // Ref mirror of darts so addDart computes OUTSIDE setState updaters.
  // Side effects inside updaters double-fire under React StrictMode (dev).
  const dartsRef = useRef<DartEntry[]>([]);
  useEffect(() => { dartsRef.current = darts; }, [darts]);

  // New turn (currentScore changed — after a submit or an external undo): clear.
  const scoreRef = useRef(currentScore);
  useEffect(() => {
    if (scoreRef.current !== currentScore) {
      scoreRef.current = currentScore;
      setDarts([]);
      setLastOutcome(null);
    }
  }, [currentScore]);

  const addDart = useCallback((segment: number, multiplier: Multiplier): TurnOutcome => {
    const points = scoreDart(segment, multiplier);
    const next = [...dartsRef.current, { segment, multiplier, points }];
    const status = resolveTurnStatus(next, scoreRef.current, checkout);

    if (status === 'bust') {
      setDarts([]);
      setLastOutcome('bust');
      onSubmitRef.current(0, next.length, true);
      return 'bust';
    }
    if (status === 'finish') {
      const total = next.reduce((sum, d) => sum + d.points, 0);
      setDarts([]);
      setLastOutcome('finish');
      onSubmitRef.current(total, next.length, false);
      return 'finish';
    }
    if (next.length === 3) {
      const total = next.reduce((sum, d) => sum + d.points, 0);
      setDarts([]);
      setLastOutcome('submitted');
      onSubmitRef.current(total, 3, false);
      return 'submitted';
    }
    setDarts(next);
    setLastOutcome('added');
    return 'added';
  }, [checkout]);

  const undoDart = useCallback(() => {
    setDarts((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
    setLastOutcome(null);
  }, []);

  const total = darts.reduce((sum, d) => sum + d.points, 0);

  return { darts, total, lastOutcome, addDart, undoDart };
}
```

> Note: `addDart` computes the next dart list from `dartsRef` (mirrored by effect after each commit) and performs ALL side effects (setState + onSubmit) in the handler body — never inside a setState updater, which React StrictMode double-invokes in dev and would double-submit. `addDart` returns the outcome directly for UI feedback; `lastOutcome` state mirrors it for render.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- src/hooks/__tests__/useDartTurn.test.ts src/hooks/__tests__/useDartTurn.hook.test.tsx`
Expected: PASS. Then `npx tsc --noEmit` and `npm run lint` — clean. (If a test expects a stale return value, adjust the test to read `result.current.lastOutcome` after `act` instead of the return value.)

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useDartTurn.ts src/hooks/__tests__/useDartTurn.test.ts src/hooks/__tests__/useDartTurn.hook.test.tsx
git commit -m "feat(darts): add shared per-dart turn engine (useDartTurn)"
```

---

### Task 4: TurnDisplay + MultiplierButtons + SingleDartPad

**Files:**
- Create: `src/components/scoring/TurnDisplay.tsx`
- Create: `src/components/scoring/MultiplierButtons.tsx`
- Create: `src/components/scoring/SingleDartPad.tsx`
- Test: `src/components/__tests__/singleDartPad.test.tsx`

**Interfaces:**
- Consumes: `useDartTurn` (Task 3), `canApplyMultiplier`, `type Multiplier` from `@/lib/dartboard` (Task 2), `cn` from `@/lib/utils`.
- Produces (locked — Task 5 reuses TurnDisplay and MultiplierButtons):

```tsx
// TurnDisplay.tsx
interface TurnDisplayProps {
  total: number;
  dartCount: number;
  breakdown: string;      // e.g. "T20 · S7"
  onUndo?: () => void;
  canUndo?: boolean;
  bustFlash?: boolean;    // true briefly after a bust (red flash)
}
export default function TurnDisplay(props: TurnDisplayProps): JSX.Element;

// MultiplierButtons.tsx
interface MultiplierButtonsProps {
  multiplier: Multiplier;                 // 'S' | 'D' | 'T'
  onChange: (m: Multiplier) => void;
}
export default function MultiplierButtons(props: MultiplierButtonsProps): JSX.Element;

// SingleDartPad.tsx — same props shape as NumberPad minus onUndo/canUndo (undo is internal per-dart):
interface SingleDartPadProps {
  onSubmit: (score: number, dartsUsed?: number, isBust?: boolean) => void;
  currentScore: number;
  checkout?: 'double' | 'straight';
}
export default function SingleDartPad(props: SingleDartPadProps): JSX.Element;
```

- [ ] **Step 1: Write the failing component tests**

Create `src/components/__tests__/singleDartPad.test.tsx` (FIRST LINE: `// @vitest-environment jsdom`):

```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SingleDartPad from '@/components/scoring/SingleDartPad';

function renderPad(overrides: { currentScore?: number; checkout?: 'double' | 'straight' } = {}) {
  const onSubmit = vi.fn();
  render(
    <SingleDartPad
      onSubmit={onSubmit}
      currentScore={overrides.currentScore ?? 301}
      checkout={overrides.checkout ?? 'double'}
    />
  );
  return { onSubmit };
}

describe('SingleDartPad', () => {
  it('records D20 = 40 after Double then 20, then resets to single', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderPad();
    await user.click(screen.getByRole('button', { name: /Double/ }));
    await user.click(screen.getByRole('button', { name: '20' }));
    expect(screen.getByText('40')).toBeInTheDocument();        // display total
    expect(screen.getByText(/1\/3/)).toBeInTheDocument();      // dart count
    await user.click(screen.getByRole('button', { name: '20' }));
    expect(screen.getByText('60')).toBeInTheDocument();        // 40 + S20
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('auto-submits on the 3rd dart', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderPad();
    await user.click(screen.getByRole('button', { name: '20' }));
    await user.click(screen.getByRole('button', { name: '20' }));
    await user.click(screen.getByRole('button', { name: '20' }));
    expect(onSubmit).toHaveBeenCalledWith(60, 3, false);
  });

  it('busts immediately on the 1st dart when exceeding the remaining score', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderPad({ currentScore: 10 });
    await user.click(screen.getByRole('button', { name: '20' }));
    expect(onSubmit).toHaveBeenCalledWith(0, 1, true);
  });

  it('finishes double-out with a double; a single on the same number busts', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderPad({ currentScore: 40 });
    await user.click(screen.getByRole('button', { name: /Double/ }));
    await user.click(screen.getByRole('button', { name: '20' }));
    expect(onSubmit).toHaveBeenCalledWith(40, 1, false);

    onSubmit.mockClear();
    await user.click(screen.getByRole('button', { name: '20' }));
    expect(onSubmit).toHaveBeenCalledWith(0, 1, true);
  });

  it('undoDart removes the last dart and restores the total', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderPad();
    await user.click(screen.getByRole('button', { name: '20' }));
    await user.click(screen.getByRole('button', { name: '20' }));
    await user.click(screen.getByRole('button', { name: /Undo/ }));
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks Triple on 25 and Double/Triple on BULL', async () => {
    const user = userEvent.setup();
    renderPad();
    await user.click(screen.getByRole('button', { name: /Triple/ }));
    expect(screen.getByRole('button', { name: '25' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /BULL/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Double/ }));
    expect(screen.getByRole('button', { name: /BULL/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: '25' })).toBeEnabled();
  });

  it('records Double + 25 = 50 (same as BULL)', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderPad({ currentScore: 201 });
    await user.click(screen.getByRole('button', { name: /Double/ }));
    await user.click(screen.getByRole('button', { name: '25' }));
    expect(screen.getByText('50')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /BULL/ }));
    await user.click(screen.getByRole('button', { name: '20' }));
    expect(onSubmit).toHaveBeenCalledWith(120, 3, false); // 50 + 50 + 20
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/components/__tests__/singleDartPad.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write TurnDisplay**

Create `src/components/scoring/TurnDisplay.tsx`:

```tsx
'use client';
import { cn } from '@/lib/utils';
import { IconRotateClockwise2 } from '@tabler/icons-react';

interface TurnDisplayProps {
  total: number;
  dartCount: number;
  breakdown: string;
  onUndo?: () => void;
  canUndo?: boolean;
  bustFlash?: boolean;
}

/**
 * Shared turn display for the per-dart pads. Same visual style as the
 * NumberPad display: big mono total, zinc-900/40 rounded container,
 * undo button on the right.
 */
export default function TurnDisplay({ total, dartCount, breakdown, onUndo, canUndo, bustFlash }: TurnDisplayProps) {
  return (
    <div className="flex-[0.8] min-h-[70px] relative">
      <div
        className={cn(
          'h-full flex items-center justify-center bg-zinc-900/40 rounded-2xl border border-white/5 overflow-hidden transition-colors duration-150',
          bustFlash && 'bg-red-500/20 border-red-500/40'
        )}
      >
        <span className={cn('text-5xl font-mono font-black tracking-widest tabular-nums', bustFlash ? 'text-red-500' : 'text-cyan-400')}>
          {total}
        </span>
        <span className="ml-3 text-sm font-mono text-zinc-500">
          {dartCount}/3
          {breakdown && <span className="ml-2 text-xs text-zinc-600">{breakdown}</span>}
        </span>
        {onUndo && (
          <button
            type="button"
            onPointerDown={(e) => { e.preventDefault(); if (canUndo) onUndo(); }}
            disabled={!canUndo}
            aria-label="Undo dart"
            className={cn(
              'absolute right-4 p-4 text-zinc-500 active:text-white transition-opacity',
              !canUndo && 'opacity-30'
            )}
          >
            <IconRotateClockwise2 size={24} />
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write MultiplierButtons**

Create `src/components/scoring/MultiplierButtons.tsx`:

```tsx
'use client';
import { cn } from '@/lib/utils';
import type { Multiplier } from '@/lib/dartboard';

interface MultiplierButtonsProps {
  multiplier: Multiplier;
  onChange: (m: Multiplier) => void;
}

/** Double / Triple selector — pressing a segment then auto-resets to 'S'. */
export default function MultiplierButtons({ multiplier, onChange }: MultiplierButtonsProps) {
  const press = (m: 'D' | 'T') => {
    if (navigator.vibrate) navigator.vibrate(5);
    onChange(multiplier === m ? 'S' : m); // toggle off by pressing again
  };
  const btn = (m: 'D' | 'T', label: string, activeCls: string, idleCls: string) => (
    <button
      type="button"
      onPointerDown={(e) => { e.preventDefault(); press(m); }}
      className={cn(
        'flex-1 flex items-center justify-center rounded-xl border py-3 transition-all duration-75 active:scale-95 font-black text-sm uppercase tracking-wider',
        multiplier === m ? activeCls : idleCls
      )}
    >
      {label}
    </button>
  );
  return (
    <div className="flex gap-2">
      {btn('D', 'Double', 'bg-cyan-500 text-black border-cyan-400', 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400')}
      {btn('T', 'Triple', 'bg-cyan-500 text-black border-cyan-400', 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400')}
    </div>
  );
}
```

- [ ] **Step 5: Write SingleDartPad**

Create `src/components/scoring/SingleDartPad.tsx`:

```tsx
'use client';
import { useMemo, useState } from 'react';
import { useDartTurn } from '@/hooks/useDartTurn';
import { canApplyMultiplier, type Multiplier } from '@/lib/dartboard';
import { cn } from '@/lib/utils';
import TurnDisplay from './TurnDisplay';
import MultiplierButtons from './MultiplierButtons';

interface SingleDartPadProps {
  onSubmit: (score: number, dartsUsed?: number, isBust?: boolean) => void;
  currentScore: number;
  checkout?: 'double' | 'straight';
}

const SEGMENTS = Array.from({ length: 25 }, (_, i) => i + 1); // 1..25

export default function SingleDartPad({ onSubmit, currentScore, checkout = 'double' }: SingleDartPadProps) {
  const [multiplier, setMultiplier] = useState<Multiplier>('S');
  const { darts, total, lastOutcome, addDart, undoDart } = useDartTurn({ currentScore, checkout, onSubmit });

  const breakdown = useMemo(
    () => darts.map((d) => `${d.multiplier === 'S' ? 'S' : d.multiplier}${d.segment}`).join(' · '),
    [darts]
  );

  const handleSegment = (segment: number) => {
    if (!canApplyMultiplier(segment, multiplier)) return;
    addDart(segment, multiplier);
    setMultiplier('S'); // reset after each dart
  };

  return (
    <div className="flex flex-col h-full w-full p-2 gap-2 bg-black select-none touch-none">
      <TurnDisplay
        total={total}
        dartCount={darts.length}
        breakdown={breakdown}
        onUndo={undoDart}
        canUndo={darts.length > 0}
        bustFlash={lastOutcome === 'bust'}
      />

      <MultiplierButtons multiplier={multiplier} onChange={setMultiplier} />

      {/* 1..25 grid — 5 columns */}
      <div className="flex-4 grid grid-cols-5 grid-rows-5 gap-1.5">
        {SEGMENTS.map((n) => (
          <button
            key={n}
            type="button"
            onPointerDown={(e) => { e.preventDefault(); handleSegment(n); }}
            disabled={!canApplyMultiplier(n, multiplier)}
            className={cn(
              'flex items-center justify-center rounded-xl bg-zinc-900 border border-white/5 text-2xl font-black text-white transition-colors duration-75 active:scale-95 active:bg-cyan-500 active:text-black select-none touch-none',
              !canApplyMultiplier(n, multiplier) && 'opacity-20 grayscale'
            )}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Bull */}
      <button
        type="button"
        onPointerDown={(e) => { e.preventDefault(); handleSegment(50); }}
        disabled={!canApplyMultiplier(50, multiplier)}
        className={cn(
          'flex items-center justify-center gap-2 rounded-xl border py-3 font-black text-sm uppercase tracking-widest transition-all duration-75 active:scale-95',
          multiplier === 'S'
            ? 'bg-green-500 text-black border-green-400'
            : 'bg-green-500/10 border-green-500/20 text-green-500',
          !canApplyMultiplier(50, multiplier) && 'opacity-20 grayscale'
        )}
      >
        BULL (50)
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run test -- src/components/__tests__/singleDartPad.test.tsx`
Expected: PASS. Then `npx tsc --noEmit` and `npm run lint` — clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/scoring/TurnDisplay.tsx src/components/scoring/MultiplierButtons.tsx src/components/scoring/SingleDartPad.tsx src/components/__tests__/singleDartPad.test.tsx
git commit -m "feat(darts): add single-dart segment selector pad"
```

---

### Task 5: DartBoard + DartBoardPad

**Files:**
- Create: `src/components/scoring/DartBoard.tsx`
- Create: `src/components/scoring/DartBoardPad.tsx`
- Test: `src/components/__tests__/dartBoardPad.test.tsx`

**Interfaces:**
- Consumes: `useDartTurn` (Task 3); `SEGMENT_ORDER`, `R_DOUBLE_IN`, `R_TRIPLE_OUT`, `R_TRIPLE_IN`, `bullZoneFromRadius`, `segmentFromAngleDeg`, `type Multiplier` from `@/lib/dartboard` (Task 2); `TurnDisplay`, `MultiplierButtons` (Task 4).
- Produces (locked — Task 6 renders it):

```tsx
// DartBoard.tsx
interface DartBoardProps {
  onPress: (segment: number) => void;   // 1..20 | 25 (outer bull) | 50 (inner bull)
  accentColor?: string;                 // active-player highlight
  className?: string;
}
export default function DartBoard(props: DartBoardProps): JSX.Element;

// DartBoardPad.tsx — same props shape as SingleDartPad:
interface DartBoardPadProps {
  onSubmit: (score: number, dartsUsed?: number, isBust?: boolean) => void;
  currentScore: number;
  checkout?: 'double' | 'straight';
}
export default function DartBoardPad(props: DartBoardPadProps): JSX.Element;
```

- [ ] **Step 1: Write the failing component tests**

Create `src/components/__tests__/dartBoardPad.test.tsx` (FIRST LINE: `// @vitest-environment jsdom`). The board is an `<svg>`; pointer hits are simulated by mocking `getBoundingClientRect` to a 200×200 box at (0,0) and firing `pointerdown` at board coordinates (`clientX/clientY`). Board center is (100,100), radius 100. 12 o'clock = (100,0) → segment 20.

```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DartBoardPad from '@/components/scoring/DartBoardPad';

const RECT = { x: 0, y: 0, width: 200, height: 200, top: 0, left: 0, right: 200, bottom: 200, toJSON: () => {} };

function renderPad(overrides: { currentScore?: number; checkout?: 'double' | 'straight' } = {}) {
  const onSubmit = vi.fn();
  render(
    <DartBoardPad
      onSubmit={onSubmit}
      currentScore={overrides.currentScore ?? 301}
      checkout={overrides.checkout ?? 'double'}
    />
  );
  return { onSubmit };
}

/** Fire a pointerdown at board-local (x, y) with (0,0) = top-left of the 200x200 svg. */
function tap(x: number, y: number) {
  const svg = document.querySelector('svg')!;
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue(RECT as DOMRect);
  fireEvent.pointerDown(svg, { clientX: x, clientY: y });
}

describe('DartBoardPad', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('records a single 20 when tapping 12 o\'clock in the segment area', () => {
    const { onSubmit } = renderPad();
    tap(100, 60); // r = 0.4 → segment area; angle 0° → 20
    tap(100, 60);
    tap(100, 60);
    expect(onSubmit).toHaveBeenCalledWith(60, 3, false);
  });

  it('records T20 when Triple is selected (multiplier from buttons, not ring position)', () => {
    const { onSubmit } = renderPad({ currentScore: 61 });
    const triple = screen.getByRole('button', { name: /Triple/ });
    fireEvent.pointerDown(triple, {});
    tap(100, 60); // tapping the SINGLE area with Triple active → T20 = 60
    tap(100, 60); // same again → 60+60 > 61 → bust on the 2nd dart
    expect(onSubmit).toHaveBeenCalledWith(0, 2, true);
  });

  it('bull: inner = 50, outer = 25, Double + outer = 50', () => {
    const { onSubmit } = renderPad({ currentScore: 201 });
    tap(100, 100);      // center → inner bull 50
    tap(100, 108.2);    // r = 0.082 → outer bull 25
    const dbl = screen.getByRole('button', { name: /Double/ });
    fireEvent.pointerDown(dbl, {});
    tap(100, 108.2);    // Double + outer bull → 50; total 125 < 201 → continues
    expect(screen.getByText('125')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.pointerDown(dbl, {}); // toggle Double off → S
    tap(100, 100);      // inner bull 50 → 175 < 201
    tap(100, 60);       // S20 → 195 < 201
    tap(100, 60);       // S20 → 215 > 201 → bust on 3rd dart
    expect(onSubmit).toHaveBeenCalledWith(0, 3, true);
  });

  it('undo removes the last dart', () => {
    renderPad();
    tap(100, 60); // S20
    fireEvent.pointerDown(screen.getByRole('button', { name: /Undo dart/ }), {});
    tap(100, 60); // S20
    tap(100, 60); // S20
    expect(screen.getByText('40')).toBeInTheDocument(); // 20 + 20, one undone
  });

  it('finishes double-out with D20 on 40', () => {
    const { onSubmit } = renderPad({ currentScore: 40 });
    fireEvent.pointerDown(screen.getByRole('button', { name: /Double/ }), {});
    tap(100, 60); // D20 = 40 === remaining → finish
    expect(onSubmit).toHaveBeenCalledWith(40, 1, false);
  });
});
```

> Rules fixed (do not relax): (a) ring position does NOT change the multiplier — only the Double/Triple buttons do; (b) inner bull = 50, outer bull = 25, Double+outer bull = 50; (c) a tap in the segment area at 12 o'clock is segment 20. If a coordinate lands on a boundary, nudge it (e.g. `tap(100, 70)` instead of `tap(100, 60)`) — keep the same assertions.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/components/__tests__/dartBoardPad.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write DartBoard**

Create `src/components/scoring/DartBoard.tsx`:

```tsx
'use client';
import { SEGMENT_ORDER, SEGMENT_ANGLE, R_DOUBLE_IN, R_TRIPLE_OUT, R_TRIPLE_IN, R_OUTER_BULL, R_INNER_BULL } from '@/lib/dartboard';

interface DartBoardProps {
  onPress: (segment: number) => void;
  accentColor?: string;
  className?: string;
}

const SIZE = 200;
const C = SIZE / 2; // 100

/** Polar → cartesian, angle in degrees measured clockwise from 12 o'clock. */
function polar(deg: number, r: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180; // 0° → screen-top
  return [C + r * Math.cos(rad), C + r * Math.sin(rad)];
}

/** One annular wedge between radii r1 > r2 at angle deg..deg+18. */
function wedgePath(deg: number, r1: number, r2: number): string {
  const [ax, ay] = polar(deg, r1);
  const [bx, by] = polar(deg + SEGMENT_ANGLE, r1);
  const [cx, cy] = polar(deg + SEGMENT_ANGLE, r2);
  const [dx, dy] = polar(deg, r2);
  return `M ${ax} ${ay} A ${r1} ${r1} 0 0 1 ${bx} ${by} L ${cx} ${cy} A ${r2} ${r2} 0 0 0 ${dx} ${dy} Z`;
}

const BOARD_RINGS = [
  { r1: 1.0, r2: R_DOUBLE_IN },        // double ring
  { r1: R_TRIPLE_OUT, r2: R_TRIPLE_IN },// triple ring
  { r1: R_TRIPLE_IN, r2: R_OUTER_BULL },// single area
];

export default function DartBoard({ onPress, className }: DartBoardProps) {
  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - C;
    const dy = y - C;
    const r = Math.sqrt(dx * dx + dy * dy) / (rect.width / 2);
    if (r > 1) return; // outside the board
    if (r <= R_OUTER_BULL) {
      onPress(r <= R_INNER_BULL ? 50 : 25);
      return;
    }
    const deg = (Math.atan2(dx, -dy) * 180) / Math.PI; // 0° at 12 o'clock, clockwise
    const idx = Math.floor((((deg % 360) + 360) % 360) / SEGMENT_ANGLE) % 20;
    onPress(SEGMENT_ORDER[idx]);
  };

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={className}
      style={{ touchAction: 'none', userSelect: 'none' }}
      onPointerDown={handlePointer}
      role="img"
      aria-label="Dartboard — tap where the dart landed"
    >
      {SEGMENT_ORDER.map((seg, i) => {
        const deg = i * SEGMENT_ANGLE;
        const fill = i % 2 === 0 ? '#18181b' : '#27272a'; // zinc-900 / zinc-800 alternation
        return (
          <g key={seg}>
            {BOARD_RINGS.map((ring, j) => (
              <path key={j} d={wedgePath(deg, ring.r1 * C, ring.r2 * C)} fill={fill} stroke="#3f3f46" strokeWidth="0.75" />
            ))}
            {/* segment labels at mid radius of the double ring */}
            <text
              x={polar(deg + SEGMENT_ANGLE / 2, ((R_DOUBLE_IN + R_TRIPLE_OUT) / 2) * C)[0]}
              y={polar(deg + SEGMENT_ANGLE / 2, ((R_DOUBLE_IN + R_TRIPLE_OUT) / 2) * C)[1]}
              textAnchor="middle" dominantBaseline="central"
              className="fill-zinc-400 text-[9px] font-mono"
            >
              {seg}
            </text>
          </g>
        );
      })}
      {/* bulls */}
      <circle cx={C} cy={C} r={R_OUTER_BULL * C} fill="#22c55e" stroke="#166534" strokeWidth="1" />
      <circle cx={C} cy={C} r={R_INNER_BULL * C} fill="#dc2626" stroke="#7f1d1d" strokeWidth="1" />
    </svg>
  );
}
```

- [ ] **Step 4: Write DartBoardPad**

Create `src/components/scoring/DartBoardPad.tsx`:

```tsx
'use client';
import { useMemo, useState } from 'react';
import { useDartTurn } from '@/hooks/useDartTurn';
import { type Multiplier } from '@/lib/dartboard';
import DartBoard from './DartBoard';
import TurnDisplay from './TurnDisplay';
import MultiplierButtons from './MultiplierButtons';

interface DartBoardPadProps {
  onSubmit: (score: number, dartsUsed?: number, isBust?: boolean) => void;
  currentScore: number;
  checkout?: 'double' | 'straight';
}

export default function DartBoardPad({ onSubmit, currentScore, checkout = 'double' }: DartBoardPadProps) {
  const [multiplier, setMultiplier] = useState<Multiplier>('S');
  const { darts, total, lastOutcome, addDart, undoDart } = useDartTurn({ currentScore, checkout, onSubmit });

  const breakdown = useMemo(
    () => darts.map((d) => `${d.multiplier === 'S' ? 'S' : d.multiplier}${d.segment}`).join(' · '),
    [darts]
  );

  /** Board tap → segment. Outer bull tap with Double active = 50 (decision 8). */
  const handleBoardPress = (segment: number) => {
    if (segment === 25 && multiplier === 'D') {
      addDart(50, 'S');
      setMultiplier('S');
      return;
    }
    addDart(segment, multiplier);
    setMultiplier('S');
  };

  return (
    <div className="flex flex-col h-full w-full p-2 gap-2 bg-black select-none touch-none">
      <TurnDisplay
        total={total}
        dartCount={darts.length}
        breakdown={breakdown}
        onUndo={undoDart}
        canUndo={darts.length > 0}
        bustFlash={lastOutcome === 'bust'}
      />

      <MultiplierButtons multiplier={multiplier} onChange={setMultiplier} />

      <div className="flex-1 flex items-center justify-center min-h-0">
        <DartBoard onPress={handleBoardPress} className="max-h-full max-w-full aspect-square" />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- src/components/__tests__/dartBoardPad.test.tsx`
Expected: PASS (implementer adjusts tap coordinates per the note in Step 1; rules fixed). Then `npx tsc --noEmit` and `npm run lint` — clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/scoring/DartBoard.tsx src/components/scoring/DartBoardPad.tsx src/components/__tests__/dartBoardPad.test.tsx
git commit -m "feat(darts): add touch dartboard pad for large screens"
```

---

### Task 6: ScoreInputPanel + match page wiring + flow test adaptation

**Files:**
- Create: `src/components/scoring/ScoreInputPanel.tsx`
- Modify: `src/app/match/page.tsx:6,68-76` (import + replace `<NumberPad>` with `<ScoreInputPanel>`)
- Modify: `src/components/__tests__/matchFlow.test.tsx` (only if the pad selector breaks)
- Test: `src/components/__tests__/scoreInputPanel.test.tsx`

**Interfaces:**
- Consumes: `NumberPad`, `SingleDartPad` (Task 4), `DartBoardPad` (Task 5).
- Produces (locked):

```tsx
export type ScoreInputMode = 'three' | 'single' | 'board';

// Same props as NumberPad (match page passes exactly these):
interface ScoreInputPanelProps {
  onSubmit: (score: number, dartsUsed?: number, isBust?: boolean) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  currentScore: number;
  checkout?: 'double' | 'straight';
  className?: string;
}
export default function ScoreInputPanel(props: ScoreInputPanelProps): JSX.Element;
```

- [ ] **Step 1: Write the failing panel tests**

Create `src/components/__tests__/scoreInputPanel.test.tsx` (FIRST LINE: `// @vitest-environment jsdom`):

```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScoreInputPanel from '@/components/scoring/ScoreInputPanel';

const onSubmit = vi.fn();

/** Control matchMedia for the 768px guard. */
function setMedia(matches: boolean) {
  const mql = {
    matches, media: '(min-width: 768px)', onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  };
  window.matchMedia = vi.fn().mockReturnValue(mql);
}

beforeEach(() => {
  onSubmit.mockClear();
  localStorage.clear();
});

describe('ScoreInputPanel', () => {
  it('defaults to the 3 DARTS numeric pad', () => {
    render(<ScoreInputPanel onSubmit={onSubmit} currentScore={501} />);
    expect(screen.getByRole('button', { name: /BUST/ })).toBeInTheDocument(); // NumberPad-only
  });

  it('switches to 1 DART and records D20', async () => {
    const user = userEvent.setup();
    render(<ScoreInputPanel onSubmit={onSubmit} currentScore={501} />);
    await user.click(screen.getByRole('button', { name: /1 DART/ }));
    expect(screen.getByRole('button', { name: '20' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Double/ }));
    await user.click(screen.getByRole('button', { name: '20' }));
    expect(screen.getByText('40')).toBeInTheDocument();
  });

  it('hides BOARD below 768px (jsdom matchMedia default)', () => {
    setMedia(false);
    render(<ScoreInputPanel onSubmit={onSubmit} currentScore={501} />);
    expect(screen.queryByRole('button', { name: /BOARD/ })).not.toBeInTheDocument();
  });

  it('shows BOARD at/above 768px', () => {
    setMedia(true);
    render(<ScoreInputPanel onSubmit={onSubmit} currentScore={501} />);
    expect(screen.getByRole('button', { name: /BOARD/ })).toBeInTheDocument();
  });

  it('falls back to 1 DART when BOARD becomes unavailable mid-session', async () => {
    const user = userEvent.setup();
    setMedia(true);
    render(<ScoreInputPanel onSubmit={onSubmit} currentScore={501} />);
    await user.click(screen.getByRole('button', { name: /BOARD/ }));
    expect(screen.getByRole('img', { name: /Dartboard/ })).toBeInTheDocument();
    setMedia(false);
    fireEvent(window, new Event('resize'));
    expect(screen.queryByRole('img', { name: /Dartboard/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '20' })).toBeInTheDocument(); // 1 DART pad
  });

  it('persists the selected mode in localStorage', async () => {
    const user = userEvent.setup();
    render(<ScoreInputPanel onSubmit={onSubmit} currentScore={501} />);
    await user.click(screen.getByRole('button', { name: /1 DART/ }));
    expect(localStorage.getItem('nomad-darts:score-input-mode')).toBe('single');
  });
});
```

> Implementation detail the panel MUST honor: `localStorage` key `nomad-darts:score-input-mode`; stored `'board'` is only honored while `matchMedia('(min-width: 768px)')` matches; invalid stored values fall back to `'three'`. The panel listens to `matchMedia` `change` events; in jsdom the fallback test fires a `resize` event, so ALSO listen to `resize` (belt and braces).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/components/__tests__/scoreInputPanel.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write ScoreInputPanel**

Create `src/components/scoring/ScoreInputPanel.tsx`:

```tsx
'use client';
import { useCallback, useEffect, useState } from 'react';
import NumberPad from './NumberPad';
import SingleDartPad from './SingleDartPad';
import DartBoardPad from './DartBoardPad';
import { cn } from '@/lib/utils';

export type ScoreInputMode = 'three' | 'single' | 'board';

interface ScoreInputPanelProps {
  onSubmit: (score: number, dartsUsed?: number, isBust?: boolean) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  currentScore: number;
  checkout?: 'double' | 'straight';
  className?: string;
}

const STORAGE_KEY = 'nomad-darts:score-input-mode';
const BOARD_QUERY = '(min-width: 768px)';

function useIsLargeScreen(): boolean {
  const [isLarge, setIsLarge] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia?.(BOARD_QUERY).matches
  );
  useEffect(() => {
    const mql = window.matchMedia(BOARD_QUERY);
    const onChange = () => setIsLarge(mql.matches);
    mql.addEventListener('change', onChange);
    window.addEventListener('resize', onChange); // jsdom/testing belt and braces
    return () => {
      mql.removeEventListener('change', onChange);
      window.removeEventListener('resize', onChange);
    };
  }, []);
  return isLarge;
}

export default function ScoreInputPanel({ onSubmit, onUndo, canUndo, currentScore, checkout = 'double', className }: ScoreInputPanelProps) {
  const isLarge = useIsLargeScreen();
  const [mode, setMode] = useState<ScoreInputMode>('three');

  // Restore persisted mode once on mount; BOARD only when large enough.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ScoreInputMode | null;
    if (stored === 'single' || stored === 'board' || stored === 'three') {
      setMode(stored === 'board' && !isLarge ? 'single' : stored);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // BOARD becomes unavailable → fall back to 1 DART (same per-dart logic).
  useEffect(() => {
    if (mode === 'board' && !isLarge) setMode('single');
  }, [mode, isLarge]);

  const selectMode = (m: ScoreInputMode) => {
    setMode(m);
    localStorage.setItem(STORAGE_KEY, m);
  };

  const tab = (m: ScoreInputMode, label: string) => (
    <button
      type="button"
      onClick={() => selectMode(m)}
      className={cn(
        'flex-1 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all duration-75 active:scale-95',
        mode === m
          ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
          : 'bg-zinc-900 border-white/5 text-zinc-500'
      )}
    >
      {label}
    </button>
  );

  const padProps = { onSubmit, currentScore, checkout };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex gap-2 px-2">
        {tab('three', '3 DARTS')}
        {tab('single', '1 DART')}
        {isLarge && tab('board', 'BOARD')}
      </div>
      {mode === 'three' && <NumberPad {...padProps} onUndo={onUndo} canUndo={canUndo} />}
      {mode === 'single' && <SingleDartPad {...padProps} />}
      {mode === 'board' && isLarge && <DartBoardPad {...padProps} />}
    </div>
  );
}
```

- [ ] **Step 4: Wire it into the match page**

In `src/app/match/page.tsx`:
- Line 6: replace `import { NumberPad } from '@/components/scoring/NumberPad';` with `import ScoreInputPanel from '@/components/scoring/ScoreInputPanel';`
- Lines 68–76: replace `<NumberPad … />` with `<ScoreInputPanel … />` (props unchanged).

- [ ] **Step 5: Run all tests — fix flow-test selector if needed**

Run: `npm run test`
Expected: PASS. The `matchFlow.test.tsx` helpers locate the NumberPad by `div.p-2.gap-2.bg-black` (still the NumberPad root inside the panel) and the submit button by `button.bg-cyan-500` — both unchanged, so flows should stay green. If any selector breaks, update only the helper functions in `matchFlow.test.tsx` (never change NumberPad's classes).

Then `npx tsc --noEmit` and `npm run lint` — clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/scoring/ScoreInputPanel.tsx src/app/match/page.tsx src/components/__tests__/scoreInputPanel.test.tsx
git commit -m "feat(darts): add score input mode switcher panel"
```

---

### Task 7: Durable documentation

**Files:**
- Create: `docs/decisions/ADR-0009-multi-score-input.md`
- Modify: `docs/10-system-overview.md` (score-entry section: mention the 3 modes)

**Interfaces:** none (docs only).

- [ ] **Step 1: Write the ADR**

Create `docs/decisions/ADR-0009-multi-score-input.md` following the repo's ADR format (see ADR-0007/0008). Cover: context (fixed 3-dart numeric entry, stats always 3 darts on bust), decision (3 modes; multiplier-first interaction; live bust/finish; bust records actual darts; bull rules; BOARD ≥768px; mode persistence), alternatives considered (numeric-only single-dart entry — rejected for impossible-score risk), consequences (reducer semantics change; FinishConfirmation dialog only in numeric mode).

- [ ] **Step 2: Update the system overview**

In `docs/10-system-overview.md`, update the score-entry description to mention `ScoreInputPanel` and the three modes (see how the file describes NumberPad today).

- [ ] **Step 3: Commit**

```bash
git add docs/decisions/ADR-0009-multi-score-input.md docs/10-system-overview.md
git commit -m "docs: add multi-mode score input ADR and system overview update"
```

---

## Integration verification (coordinator, after all tasks)

1. `npx tsc --noEmit` — clean
2. `npm run lint` — clean
3. `npm run test` — full suite green (expected ~199 existing + new)
4. Optional smoke: `npm run dev`, open a match on a wide viewport, verify BOARD tab appears and 1 DART works; on a narrow viewport BOARD is hidden.

## Self-review notes

- Spec coverage: every decision 1–14 in the spec maps to a task (1→T1, 2–5→T2/T4, 6–8→T4/T5, 9→T6, 10–11→T3, 12→T1, 13→T4/T5, 14→all component tasks; testing section → T2/T3/T4/T5/T6).
- Type consistency: `Multiplier`, `DartEntry`, `TurnStatus`, `TurnOutcome`, `SEGMENT_ORDER`, ring constants, pad props (`onSubmit(score, dartsUsed?, isBust?)`) are defined once each and reused verbatim across tasks.
- Placeholders: none — every code step contains full implementation.


## Research Summary and Evidence

_No artifacts recorded._

## Task State Summary

### T1

- **Objective:** Reducer: bust turns record actual darts used
- **Status:** `completed`
- **Agent:** `None`
- **Verification:** `npm run test -- src/lib/redux/__tests__/matchSlice.test.ts (pass); tsc/lint clean`
- **Review:** `not-recorded`
- **Dependencies:** None
- **Owned files:** src/lib/redux/matchSlice.ts, src/lib/redux/__tests__/matchSlice.test.ts

### T2

- **Objective:** lib/dartboard.ts: pure geometry and scoring math
- **Status:** `completed`
- **Agent:** `None`
- **Verification:** `npm run test -- src/lib/__tests__/dartboard.test.ts (pass); tsc/lint clean`
- **Review:** `not-recorded`
- **Dependencies:** None
- **Owned files:** src/lib/dartboard.ts, src/lib/__tests__/dartboard.test.ts

### T3

- **Objective:** useDartTurn: shared per-dart turn engine
- **Status:** `completed`
- **Agent:** `None`
- **Verification:** `npm run test -- src/hooks/__tests__/useDartTurn.test.ts src/hooks/__tests__/useDartTurn.hook.test.tsx (pass); tsc/lint clean`
- **Review:** `not-recorded`
- **Dependencies:** None
- **Owned files:** src/hooks/useDartTurn.ts, src/hooks/__tests__/useDartTurn.test.ts, src/hooks/__tests__/useDartTurn.hook.test.tsx

### T4

- **Objective:** TurnDisplay + MultiplierButtons + SingleDartPad components with tests
- **Status:** `completed`
- **Agent:** `wf-implement`
- **Verification:** `7/7 singleDartPad tests pass; tsc clean; lint clean; full suite 286/286; commit ad79a73`
- **Review:** `APPROVED (0 blocker, 1 medium: legOver parent-contract docstring, 3 low)`
- **Dependencies:** T2, T3
- **Owned files:** src/components/scoring/TurnDisplay.tsx, src/components/scoring/MultiplierButtons.tsx, src/components/scoring/SingleDartPad.tsx, src/components/__tests__/singleDartPad.test.tsx

### T5

- **Objective:** DartBoard + DartBoardPad touch components with tests
- **Status:** `completed`
- **Agent:** `wf-implement`
- **Verification:** `5/5 dartBoardPad tests pass; tsc clean; lint clean; full suite 291/291; commit c7a781f`
- **Review:** `APPROVED_WITH_NOTES (0 blocker, 1 medium inherited plan note: board allows 0-point bull-multiplier combos, 3 low)`
- **Dependencies:** T2, T3, T4
- **Owned files:** src/components/scoring/DartBoard.tsx, src/components/scoring/DartBoardPad.tsx, src/components/__tests__/dartBoardPad.test.tsx

### T6

- **Objective:** ScoreInputPanel + match page wiring + flow test adaptation
- **Status:** `completed`
- **Agent:** `wf-implement`
- **Verification:** `6/6 panel tests pass; full suite 297/297 (10 files, matchFlow 17/17 green, no changes needed); tsc clean; lint clean; commit e17e449`
- **Review:** `APPROVED_WITH_NOTES (0 blocker/high/medium, 7 low: latent hydration, localStorage guard, aria-pressed, etc.)`
- **Dependencies:** T4, T5
- **Owned files:** src/components/scoring/ScoreInputPanel.tsx, src/app/match/page.tsx, src/components/__tests__/scoreInputPanel.test.tsx, src/components/__tests__/matchFlow.test.tsx

### T7

- **Objective:** Durable docs: ADR-0009 + system overview update
- **Status:** `completed`
- **Agent:** `wf-implement`
- **Verification:** `ADR-0009 created (repo format, D1-D7, alternatives, consequences); system overview Score Entry section added; tsc/lint clean; commit d0d2474`
- **Review:** `APPROVED_WITH_NOTES (0 blocker/high/medium, 6 low nits: D6 md: guard wording, D3 button wording, D1 useDartTurn overstatement, etc.)`
- **Dependencies:** T6
- **Owned files:** docs/decisions/ADR-0009-multi-score-input.md, docs/10-system-overview.md


## Task Specifications

### `tasks\T4.md`

# Task T4 — TurnDisplay + MultiplierButtons + SingleDartPad

- **Workflow:** WF-20260817-104302-multi-score-input
- **Status:** pending → in_progress (on dispatch)
- **Depends on:** T2 (dartboard.ts), T3 (useDartTurn) — both committed and verified
- **Plan reference:** `docs/plans/WF-20260817-104302-multi-score-input.md` → Task 4 (lines 544–884)

## Objective

Create the single-dart segment selector pad: a shared turn display, a Double/Triple multiplier selector, and the SingleDartPad that combines them with `useDartTurn`.

## Owned files (create)

- `src/components/scoring/TurnDisplay.tsx`
- `src/components/scoring/MultiplierButtons.tsx`
- `src/components/scoring/SingleDartPad.tsx`
- `src/components/__tests__/singleDartPad.test.tsx`

## Forbidden files

- `src/components/scoring/NumberPad.tsx` (do NOT change root classes `p-2 gap-2 bg-black`)
- `src/lib/redux/matchSlice.ts`, `src/hooks/useDartTurn.ts`, `src/lib/dartboard.ts` (already done)
- Any file owned by T5/T6/T7

## Interfaces (locked — from plan Task 4)

```tsx
// TurnDisplay.tsx
interface TurnDisplayProps {
  total: number;
  dartCount: number;
  breakdown: string;      // e.g. "T20 · S7"
  onUndo?: () => void;
  canUndo?: boolean;
  bustFlash?: boolean;    // true briefly after a bust (red flash)
}

// MultiplierButtons.tsx
interface MultiplierButtonsProps {
  multiplier: Multiplier;                 // 'S' | 'D' | 'T'
  onChange: (m: Multiplier) => void;
}

// SingleDartPad.tsx — same props shape as NumberPad minus onUndo/canUndo
interface SingleDartPadProps {
  onSubmit: (score: number, dartsUsed?: number, isBust?: boolean) => void;
  currentScore: number;
  checkout?: 'double' | 'straight';
}
```

## Behavior rules (do not relax)

- Multiplier-first interaction: press Double then 20 → D20 = 40; multiplier auto-resets to 'S' after each dart.
- Pressing the active multiplier again toggles it off (back to 'S').
- 1..25 grid (5 columns × 5 rows) + BULL (50) button.
- `canApplyMultiplier` gates: Triple blocks 25 and BULL; Double blocks BULL.
- Live bust/finish via `useDartTurn`; undo removes the last dart.
- Buttons react on `pointerdown` (with `e.preventDefault()`); `select-none touch-none`; `navigator.vibrate(5)` on multiplier press (stubbed in setup).
- Design: dark theme, zinc-900 surfaces, `border-white/5`, `rounded-2xl`, cyan active, green bull, red bust flash; `font-black`/`font-mono`; Tabler icons (`IconRotateClockwise2` for undo).
- Root classes of SingleDartPad: `flex flex-col h-full w-full p-2 gap-2 bg-black select-none touch-none` (same as NumberPad).

## Acceptance criteria

1. `npm run test -- src/components/__tests__/singleDartPad.test.tsx` — all 7 tests pass (test file content is in the plan, Task 4 Step 1).
2. `npx tsc --noEmit` — clean.
3. `npm run lint` — clean.
4. Full suite still green: `npm run test` (no regressions).

## Verification commands

```bash
npm run test -- src/components/__tests__/singleDartPad.test.tsx
npx tsc --noEmit
npm run lint
npm run test
```

## Commit (exact message)

```bash
git add src/components/scoring/TurnDisplay.tsx src/components/scoring/MultiplierButtons.tsx src/components/scoring/SingleDartPad.tsx src/components/__tests__/singleDartPad.test.tsx
git commit -m "feat(darts): add single-dart segment selector pad"
```

## Report path

Write the implementation report to `.opencode/workflows/WF-20260817-104302-multi-score-input/reports/T4.md` (objective, files changed, test evidence with output, deviations, risks).

## Risks / edge cases

- Test `blocks Triple on 25 and Double/Triple on BULL` requires disabled buttons — use `disabled` attribute, not just styling.
- `getByText('40')` may match multiple elements — ensure the display total is unique (TurnDisplay shows total; breakdown shows "D20").
- StrictMode double-invocation: `useDartTurn` already handles it (T3); do not add side effects inside setState updaters.
- Do not change NumberPad or its tests.

### `tasks\T5.md`

# Task T5 — DartBoard + DartBoardPad

- **Workflow:** WF-20260817-104302-multi-score-input
- **Status:** pending → in_progress (on dispatch)
- **Depends on:** T2 (dartboard.ts), T3 (useDartTurn), T4 (TurnDisplay, MultiplierButtons)
- **Plan reference:** `docs/plans/WF-20260817-104302-multi-score-input.md` → Task 5 (lines 886–1173)

## Objective

Create the touch dartboard: an SVG board that maps pointer taps to segments/bulls, and DartBoardPad that combines it with `useDartTurn`, `TurnDisplay`, `MultiplierButtons`.

## Owned files (create)

- `src/components/scoring/DartBoard.tsx`
- `src/components/scoring/DartBoardPad.tsx`
- `src/components/__tests__/dartBoardPad.test.tsx`

## Forbidden files

- `src/components/scoring/NumberPad.tsx`, `src/lib/redux/matchSlice.ts`, `src/hooks/useDartTurn.ts`, `src/lib/dartboard.ts`
- `src/components/scoring/TurnDisplay.tsx`, `src/components/scoring/MultiplierButtons.tsx` (owned by T4 — import, never modify)
- Any file owned by T6/T7

## Interfaces (locked — from plan Task 5)

```tsx
// DartBoard.tsx
interface DartBoardProps {
  onPress: (segment: number) => void;   // 1..20 | 25 (outer bull) | 50 (inner bull)
  accentColor?: string;
  className?: string;
}

// DartBoardPad.tsx — same props shape as SingleDartPad
interface DartBoardPadProps {
  onSubmit: (score: number, dartsUsed?: number, isBust?: boolean) => void;
  currentScore: number;
  checkout?: 'double' | 'straight';
}
```

## Behavior rules (fixed — do not relax)

- Ring position does NOT change the multiplier — only the Double/Triple buttons do.
- Inner bull = 50, outer bull = 25; Double + outer bull = 50 (special case in `handleBoardPress`).
- A tap in the segment area at 12 o'clock is segment 20.
- Board is an `<svg>` with `viewBox="0 0 200 200"`, `role="img"`, `aria-label="Dartboard — tap where the dart landed"`, `touchAction: none`, `userSelect: none`, `onPointerDown` handler.
- Geometry: `SEGMENT_ORDER`, `SEGMENT_ANGLE`, `R_DOUBLE_IN`, `R_TRIPLE_OUT`, `R_TRIPLE_IN`, `R_OUTER_BULL`, `R_INNER_BULL` from `@/lib/dartboard`. Angle from `Math.atan2(dx, -dy)` (0° = 12 o'clock, clockwise).
- Wedges: double ring (1.0 → R_DOUBLE_IN), triple ring (R_TRIPLE_OUT → R_TRIPLE_IN), single area (R_TRIPLE_IN → R_OUTER_BULL); alternating zinc-900/zinc-800 fills; segment labels in the double ring; green outer bull, red inner bull.
- Multiplier auto-resets to 'S' after each dart.

## Acceptance criteria

1. `npm run test -- src/components/__tests__/dartBoardPad.test.tsx` — all 5 tests pass. Test file content is in the plan (Task 5 Step 1); it mocks `getBoundingClientRect` to a 200×200 box at (0,0) and fires `pointerdown` with `clientX/clientY`. If a coordinate lands on a boundary, nudge it (e.g. `tap(100, 70)` instead of `tap(100, 60)`) — keep the same assertions.
2. `npx tsc --noEmit` — clean.
3. `npm run lint` — clean.
4. Full suite still green: `npm run test`.

## Verification commands

```bash
npm run test -- src/components/__tests__/dartBoardPad.test.tsx
npx tsc --noEmit
npm run lint
npm run test
```

## Commit (exact message)

```bash
git add src/components/scoring/DartBoard.tsx src/components/scoring/DartBoardPad.tsx src/components/__tests__/dartBoardPad.test.tsx
git commit -m "feat(darts): add touch dartboard pad for large screens"
```

## Report path

Write the implementation report to `.opencode/workflows/WF-20260817-104302-multi-score-input/reports/T5.md` (objective, files changed, test evidence with output, deviations, risks).

## Risks / edge cases

- jsdom has no real layout: `getBoundingClientRect` must be mocked in tests; the component must guard `rect.width === 0`.
- Boundary coordinates: segment wedge boundaries at multiples of 18°; bull boundary at r = R_OUTER_BULL (0.094 × 100 = 9.4px from center).
- `screen.getByText('125')` requires the total display to be unique.
- StrictMode: no side effects inside setState updaters (useDartTurn handles it).

### `tasks\T6.md`

# Task T6 — ScoreInputPanel + match page wiring + flow test adaptation

- **Workflow:** WF-20260817-104302-multi-score-input
- **Status:** pending → in_progress (on dispatch)
- **Depends on:** T4 (SingleDartPad), T5 (DartBoardPad)
- **Plan reference:** `docs/plans/WF-20260817-104302-multi-score-input.md` → Task 6 (lines 1175–1403)

## Objective

Create the mode-switcher panel (3 DARTS / 1 DART / BOARD), wire it into the match page replacing NumberPad, and keep the flow tests green.

## Owned files

- Create: `src/components/scoring/ScoreInputPanel.tsx`
- Modify: `src/app/match/page.tsx` (import + replace `<NumberPad>` with `<ScoreInputPanel>`, props unchanged)
- Modify: `src/components/__tests__/matchFlow.test.tsx` (ONLY if the pad selector breaks — update only the helper functions; never change NumberPad's classes)
- Create: `src/components/__tests__/scoreInputPanel.test.tsx`

## Forbidden files

- `src/components/scoring/NumberPad.tsx` (do NOT change root classes `p-2 gap-2 bg-black` — `matchFlow.test.tsx` locates it by that selector)
- `src/lib/redux/matchSlice.ts`, `src/hooks/useDartTurn.ts`, `src/lib/dartboard.ts`
- `src/components/scoring/TurnDisplay.tsx`, `MultiplierButtons.tsx`, `SingleDartPad.tsx`, `DartBoard.tsx`, `DartBoardPad.tsx` (owned by T4/T5 — import, never modify)
- Any file owned by T7

## Interfaces (locked — from plan Task 6)

```tsx
export type ScoreInputMode = 'three' | 'single' | 'board';

interface ScoreInputPanelProps {
  onSubmit: (score: number, dartsUsed?: number, isBust?: boolean) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  currentScore: number;
  checkout?: 'double' | 'straight';
  className?: string;
}
```

## Behavior rules (fixed)

- Default mode: `'three'` (NumberPad).
- BOARD tab only rendered when `matchMedia('(min-width: 768px)')` matches; listen to both `matchMedia` `change` AND `window` `resize` events (jsdom belt-and-braces).
- BOARD becomes unavailable mid-session → fall back to `'single'` (same per-dart logic).
- Persist mode in `localStorage` key `nomad-darts:score-input-mode`; stored `'board'` only honored while ≥768px; invalid stored values fall back to `'three'`.
- Tab labels: `3 DARTS`, `1 DART`, `BOARD` (uppercase, `font-black`, active = cyan).
- NumberPad gets `onUndo`/`canUndo`; per-dart pads manage undo internally.

## Acceptance criteria

1. `npm run test -- src/components/__tests__/scoreInputPanel.test.tsx` — all 6 tests pass (test file content in the plan, Task 6 Step 1).
2. `npm run test` — full suite green (including `matchFlow.test.tsx`; if a selector breaks, fix only the helper functions).
3. `npx tsc --noEmit` — clean.
4. `npm run lint` — clean.

## Verification commands

```bash
npm run test -- src/components/__tests__/scoreInputPanel.test.tsx
npm run test
npx tsc --noEmit
npm run lint
```

## Commit (exact message)

```bash
git add src/components/scoring/ScoreInputPanel.tsx src/app/match/page.tsx src/components/__tests__/scoreInputPanel.test.tsx
git commit -m "feat(darts): add score input mode switcher panel"
```

(If `matchFlow.test.tsx` was modified, add it to the commit.)

## Report path

Write the implementation report to `.opencode/workflows/WF-20260817-104302-multi-score-input/reports/T6.md` (objective, files changed, test evidence with output, deviations, risks).

## Risks / edge cases

- jsdom `matchMedia` is undefined by default — the panel must guard `typeof window !== 'undefined' && window.matchMedia?.(...)`; tests stub `window.matchMedia`.
- The fallback test fires a `resize` event — the panel must listen to `resize` too.
- `localStorage` may be unavailable in some environments — tests clear it in `beforeEach`.
- Do NOT change NumberPad's root classes; `matchFlow.test.tsx` locates it by `div.p-2.gap-2.bg-black`.

### `tasks\T7.md`

# Task T7 — Durable documentation

- **Workflow:** WF-20260817-104302-multi-score-input
- **Status:** pending → in_progress (on dispatch)
- **Depends on:** T6 (all code tasks complete)
- **Plan reference:** `docs/plans/WF-20260817-104302-multi-score-input.md` → Task 7 (lines 1405–1428)

## Objective

Record the multi-mode score input decision as an ADR and update the system overview.

## Owned files

- Create: `docs/decisions/ADR-0009-multi-score-input.md`
- Modify: `docs/10-system-overview.md` (score-entry section: mention the 3 modes)

## Forbidden files

- Any `src/` file, any file owned by T1–T6.

## Content requirements

ADR-0009 (follow the repo's ADR format — see ADR-0007/0008):
- Context: fixed 3-dart numeric entry; stats always counted 3 darts on bust.
- Decision: 3 modes (3 DARTS numeric pad default, 1 DART segment selector, BOARD touch dartboard ≥768px); multiplier-first interaction; live per-dart bust/finish; bust records actual darts used; bull rules (25 S/D, 50 S only, Double+outer bull = 50); BOARD hidden below 768px with fallback to 1 DART; mode persistence in localStorage.
- Alternatives considered: numeric-only single-dart entry — rejected for impossible-score risk.
- Consequences: reducer semantics change (bust turns record actual dartsUsed); FinishConfirmation dialog only in numeric mode.

System overview: update the score-entry description to mention `ScoreInputPanel` and the three modes (see how the file describes NumberPad today).

## Acceptance criteria

1. ADR-0009 exists, follows repo format, covers the required sections.
2. `docs/10-system-overview.md` mentions ScoreInputPanel and the 3 modes.
3. No code changes; `npx tsc --noEmit` and `npm run lint` still clean (docs only).

## Verification commands

```bash
npx tsc --noEmit
npm run lint
```

## Commit (exact message)

```bash
git add docs/decisions/ADR-0009-multi-score-input.md docs/10-system-overview.md
git commit -m "docs: add multi-mode score input ADR and system overview update"
```

## Report path

Write the implementation report to `.opencode/workflows/WF-20260817-104302-multi-score-input/reports/T7.md` (objective, files changed, evidence, deviations).


## Implementation and Review Reports

### `reports\final-summary.md`

# Final Summary — WF-20260817-104302-multi-score-input

## Objective

Score entry keyboard: multiple input modes — Single dart, Three darts, Touch (dartboard shown, tap where dart landed); touch board on large screens depending on screen size.

## Outcome

All 7 tasks complete, verified, and independently reviewed. The match page now offers three score-entry modes via `ScoreInputPanel`:

1. **3 DARTS** — the existing numeric pad (default, unchanged behavior)
2. **1 DART** — per-dart entry via a 1–25 segment grid + Double/Triple multiplier buttons (`SingleDartPad`)
3. **BOARD** — graphical touch dartboard (`DartBoardPad` + SVG `DartBoard`), shown only on screens ≥768px, with automatic fallback to 1 DART when the screen shrinks

## Tasks

| Task | Description | Status | Commit |
|------|-------------|--------|--------|
| T1 | Reducer: bust turns record actual darts used | completed (pre-existing, verified) | b989204 |
| T2 | `lib/dartboard.ts` — pure geometry and scoring math | completed (pre-existing, verified) | b652e1d |
| T3 | `useDartTurn` — shared per-dart turn engine | completed (pre-existing, verified) | d93d2ff |
| T4 | TurnDisplay + MultiplierButtons + SingleDartPad | completed, APPROVED | ad79a73 |
| T5 | DartBoard + DartBoardPad | completed, APPROVED_WITH_NOTES | c7a781f |
| T6 | ScoreInputPanel + match page wiring | completed, APPROVED_WITH_NOTES | e17e449 |
| T7 | ADR-0009 + system overview update | completed, APPROVED_WITH_NOTES | d0d2474 |
| — | Lint cleanup (unused test imports) | completed | 2351893 |

## Key decisions (recorded in ADR-0009)

- Multiplier-first interaction (Double then 20 = D20); multiplier auto-resets to Single
- Live per-dart bust/finish; bust records actual darts used (reducer no longer forces 3)
- Bull rules: 25 accepts S/D, 50 accepts S only; Double+25 = 50; Double+outer bull tap = 50
- BOARD only ≥768px; mode persisted in `localStorage` (`nomad-darts:score-input-mode`)
- FinishConfirmation dialog remains numeric-mode only

## Verification

- `npx tsc --noEmit` — clean
- `npm run lint` — clean (0 errors, 0 warnings)
- `npm run test` — 297/297 pass (10 files), including all 17 matchFlow tests unmodified

## Review results

- T4: APPROVED (1 medium: legOver parent-contract docstring; 3 low)
- T5: APPROVED_WITH_NOTES (1 medium inherited plan note: board allows 0-point bull+multiplier combos; 3 low)
- T6: APPROVED_WITH_NOTES (7 low: latent hydration, localStorage guard, aria-pressed, etc.)
- T7: APPROVED_WITH_NOTES (6 low wording nits)

## Failures & recovery

- T6 agent session truncated mid-work (panel files created, page wiring incomplete) → resumed same session, completed, verified
- T7 agent session truncated mid-investigation (system overview has no score-entry section) → resumed with coordinator guidance, adapted scope
- Workflow state was stale on recovery (T1–T3 committed but unrecorded) → verified via test runs and recorded

## Deferred / known risks

- Board pad allows 0-point darts for Triple+outer-bull and Double/Triple+inner-bull combos (plan-verbatim; T4's pad disables these)
- Latent hydration hazard if the match page ever becomes server-renderable (mode restore)
- `localStorage` access unguarded (fine in PWA context)
- Tabs lack `aria-pressed`
- legOver reset depends on parent contract (currentScore changes after finish)

## Changed files

- `src/lib/redux/matchSlice.ts`, `src/lib/redux/__tests__/matchSlice.test.ts` (T1)
- `src/lib/dartboard.ts`, `src/lib/__tests__/dartboard.test.ts` (T2)
- `src/hooks/useDartTurn.ts`, `src/hooks/__tests__/useDartTurn.test.ts`, `src/hooks/__tests__/useDartTurn.hook.test.tsx` (T3)
- `src/components/scoring/TurnDisplay.tsx`, `MultiplierButtons.tsx`, `SingleDartPad.tsx` + test (T4)
- `src/components/scoring/DartBoard.tsx`, `DartBoardPad.tsx` + test (T5)
- `src/components/scoring/ScoreInputPanel.tsx`, `src/app/match/page.tsx` + test (T6)
- `docs/decisions/ADR-0009-multi-score-input.md`, `docs/10-system-overview.md` (T7)

### `reports\T4-review.md`

# T4 Review - TurnDisplay + MultiplierButtons + SingleDartPad

- **Reviewer:** independent (not the implementer)
- **Commit reviewed:** `ad79a73` - `feat(darts): add single-dart segment selector pad`
- **Date:** 2026-08-17
- **Verdict:** APPROVED

## 1. Spec compliance

All locked interfaces and behavior rules from `tasks/T4.md` are met exactly:

- **Interfaces** - `TurnDisplayProps` (`total`, `dartCount`, `breakdown`, `onUndo?`, `canUndo?`, `bustFlash?`), `MultiplierButtonsProps` (`multiplier`, `onChange`), `SingleDartPadProps` (`onSubmit`, `currentScore`, `checkout?`) match the locked signatures; default exports as required for T5 reuse.
- **Multiplier-first interaction** - `handleSegment` calls `addDart(segment, multiplier)` then `setMultiplier('S')`; auto-reset verified by test 1 (D20 = 40, then S20 = 60).
- **Toggle-off** - `onChange(multiplier === m ? 'S' : m)` in `MultiplierButtons.press`. (Present but untested - see LOW-2.)
- **1..25 grid + BULL (50)** - `SEGMENTS = 1..25`, 5x5 grid, separate bull button. OK
- **canApplyMultiplier gating** - `disabled={!canApplyMultiplier(n, multiplier)}` (real `disabled` attribute, not just styling) per the T4.md risk note; Triple blocks 25/BULL, Double blocks BULL. Verified by test 6. OK
- **Live bust/finish via useDartTurn; undo** - wired; `canUndo={darts.length > 0}`. OK
- **pointerdown + `e.preventDefault()`** on all segment/multiplier/undo buttons; `select-none touch-none` on root; `navigator.vibrate(5)` guarded with `if (navigator.vibrate)` (stubbed in `src/test/setup.ts`). OK
- **Design tokens** - zinc-900 surfaces, `border-white/5`, `rounded-2xl`, cyan active, green bull, red bust flash, `font-black`/`font-mono`, `IconRotateClockwise2`. Root classes exactly `flex flex-col h-full w-full p-2 gap-2 bg-black select-none touch-none` (NumberPad-identical). OK
- **Forbidden files** - `git show ad79a73 --name-only` lists only the 4 owned files; `NumberPad.tsx`, `matchSlice.ts`, `useDartTurn.ts`, `dartboard.ts` untouched. OK
- **No new dependencies** - imports are `@/lib/utils`, `@/lib/dartboard`, `@/hooks/useDartTurn`, `@tabler/icons-react` (already used by NumberPad), all pre-existing. OK

## 2. The 4 deviations - scrutiny

### D1: `afterEach(() => { cleanup(); })` in the test file - **CORRECT**
`vitest.config.ts` has no `globals: true`, so RTL's auto-cleanup `afterEach` registration never runs; without manual cleanup every `render()` appends to the same `document.body` and later tests hit "multiple elements". The repo's own `matchFlow.test.tsx` (line 145) uses the exact same pattern. Consistent with repository conventions; the plan snippet simply omitted it. Necessary and correct.

### D2: `import '@testing-library/jest-dom/vitest'` - **CORRECT**
`src/test/setup.ts` explicitly documents "T4 imports `@testing-library/jest-dom/vitest` per file" (jest-dom intentionally not global), and `matchFlow.test.tsx` line 14 does the same. The matchers used (`toBeInTheDocument`, `toBeDisabled`, `toBeEnabled`) require it. Correct.

### D3: Test 5 `getByText('20')` -> `getByText('20', { selector: 'span' })` - **CORRECT, still asserts the right thing**
After undo the DOM contains two elements with exact text "20": the TurnDisplay total span and the segment button "20" - `getByText('20')` would throw on 2 matches. With `{ selector: 'span' }` the query matches only the total span: the breakdown span's text is "S20" (exact match "20" fails) and the dart-count span's text is "1/3S20". So the assertion still verifies the display total = 20 after undo, which is the test's intent. The plan's risk note anticipated the '40' collision but not '20'; the fix is the minimal viable one (implementation-side fixes would have broken the other tests' exact-text assertions). An alternative like `selector: 'span.text-5xl'` would be marginally more robust but not required.

### D4: `legOver` state in SingleDartPad - **CORRECT** (see full analysis in section 3)
## 3. legOver analysis (deviation 4) - CORRECT

**Why it was needed:** Plan test 4 requires that after D20 finishes a 40 leg, a subsequent S20 calls `onSubmit(0, 1, true)`. With plan code verbatim, `useDartTurn` clears darts on finish but `currentScore` stays 40, so S20 (20 < 40) -> 'continue' -> no submit -> the plan's own test fails. A behavioral deviation was mandatory.

**How it works:**
- `legOver` state; `currentScore: legOver ? 0 : currentScore` passed into `useDartTurn` -> after a finish, remaining = 0, so any dart busts (`20 > 0` -> `onSubmit(0, 1, true)`). Test 4 passes.
- Set in `handleSegment` when `addDart` returns `'finish'` - a handler-time set, no effect, no updater side effects.
- Reset via the render-time adjustment pattern (`if (prevScore !== currentScore) { setPrevScore(...); setLegOver(false); }`) - the same documented pattern `useDartTurn` (T3) uses; conditional so no infinite loop; StrictMode-safe (idempotent under double-render; no side effects in `setState` updaters).

**Edge-case trace (all verified by reading the code):**
- *Undo after finish:* darts are cleared on finish -> `canUndo = darts.length > 0` = false -> undo disabled. No stale-undo hazard.
- *Finish on 3rd dart:* `resolveTurnStatus` checks 'finish' before the 3-dart submit branch -> `'finish'` returned -> `legOver` set. OK
- *Bust:* `legOver` untouched -> pad stays usable (parent expected to pass a new score). OK
- *'submitted' (3 darts, no finish):* `legOver` untouched. OK
- *StrictMode double-render:* the adjustment is conditional and idempotent; `handleSegment` is an event handler (not double-invoked). OK
- *Interplay with useDartTurn's own prevScore:* when `legOver` becomes true, useDartTurn sees `currentScore` 40->0 and clears `darts` (already empty) and `lastOutcome` ('finish'->null). No visible effect (`bustFlash` only keys on 'bust'). OK

**Residual risk (why not HIGH):** the reset depends on the parent changing `currentScore` after a finish. In the planned integration (T6 `ScoreInputPanel` renders `<SingleDartPad {...padProps} />` with no `key`, so the pad persists), the matchSlice sets the winner's score to 0 on finish (verified in `matchFlow.test.tsx`: `[a.score, b.score] = [0, 21]`), so `currentScore` goes 101->0->101 and the flag resets during `leg_finished`. The hazard would only materialize if a future parent keeps `currentScore` constant across a finish (e.g., a practice mode, or a new leg whose starting score equals the finishing score without an intermediate value change - reachable in 101 straight-out/double-out where a player can finish from 101). In that case every dart busts forever - which is arguably the correct "leg over" semantic, but it is an undocumented contract dependency. The simpler alternative (derive `remaining=0` from `lastOutcome === 'finish'` instead of a parallel flag) has identical reset semantics and does not fix the hazard; a true fix would need a "new turn" signal, which is outside the locked interface. Recommendation: document the parent contract in the component docstring and verify it during T6 integration review (see MEDIUM-1).

**Conclusion:** The legOver implementation is correct for the plan's test 4 and for the planned integration; the deviation is acceptable.

## 4. Engineering quality

- **StrictMode safety:** no side effects in `setState` updaters; both render-time adjustments are conditional; lint's `react-hooks/set-state-in-effect` rule (from eslint-config-next) is satisfied - the handler-based approach is cleaner than an effect.
- **Accessibility basics:** undo button has `aria-label="Undo dart"`; segment/multiplier/bull buttons derive accessible names from text. Multiplier buttons lack `aria-pressed` (toggle semantics) - plan-verbatim, minor (LOW-3).
- **Repository conventions:** plan code is verbatim for TurnDisplay/MultiplierButtons (diff-verified); test file matches matchFlow.test.tsx conventions; commit message exact per task spec; working tree clean at HEAD `ad79a73`.
- **Minor cosmetic:** all 4 files lack a trailing newline - no prettier config exists, lint is clean; cosmetic only (LOW-1).
## 5. Verification evidence (run by reviewer)

| Command | Result |
|---|---|
| `npm run test -- src/components/__tests__/singleDartPad.test.tsx` | Test Files 1 passed; Tests 7 passed (7) |
| `npx tsc --noEmit` | exit 0, clean |
| `npm run lint` | 0 errors; 2 pre-existing warnings in `src/lib/__tests__/dartboard.test.ts` (T2 file: unused `R_TRIPLE_OUT`/`R_DOUBLE_IN` imports); T4 files 0 problems |
| `npm run test` | Test Files 8 passed (8); Tests 286 passed (286) |

All match the implementer's reported evidence exactly. No regressions.

## 6. Findings

### MEDIUM

**MEDIUM-1 - `legOver` reset depends on an undocumented parent contract.**
- **Location:** `src/components/scoring/SingleDartPad.tsx` (legOver state + render-time reset).
- **Problem:** the flag resets only when the `currentScore` prop changes. Any parent that keeps `currentScore` constant after a finish (practice mode; or a new leg starting at a score equal to the finishing score without an intermediate change - reachable for 101 straight-out/double-out) leaves the pad permanently in leg-over mode: every dart submits a bust `(0, 1, true)`.
- **Impact:** latent; not triggered by the planned T6 integration because matchSlice drops the winner's score to 0 on finish, which resets the flag. But the dependency is invisible to future callers.
- **Recommended correction:** add a docstring to `SingleDartPad` stating the contract "the parent MUST change `currentScore` after a finish (new leg / score change); the pad treats remaining as 0 until then", and confirm the contract during the T6 integration review. No code change required for this task's acceptance criteria.

### LOW

**LOW-1 - Missing trailing newline at EOF in all 4 new files.**
- **Location:** `TurnDisplay.tsx`, `MultiplierButtons.tsx`, `SingleDartPad.tsx`, `singleDartPad.test.tsx` (last line).
- **Impact:** cosmetic; no prettier config, lint and diff tooling unaffected.
- **Recommended correction:** append a final newline (e.g., during a future formatting pass).

**LOW-2 - Toggle-off behavior is untested.**
- **Location:** `src/components/__tests__/singleDartPad.test.tsx` - test 6 switches Triple->Double but never presses the active multiplier again.
- **Impact:** the behavior rule "pressing the active multiplier again toggles it off (back to 'S')" has no regression guard in this file; T5's dartBoardPad test does exercise toggle-off (`fireEvent.pointerDown(dbl, {})` twice), which partially covers the shared `MultiplierButtons` logic.
- **Recommended correction:** optionally add a one-line test (press Double, press Double, then verify a segment scores single) - inherited from the plan's test file, so not a T4 blocker.

**LOW-3 - Multiplier buttons lack `aria-pressed`.**
- **Location:** `src/components/scoring/MultiplierButtons.tsx` (button render).
- **Impact:** screen readers cannot determine the active multiplier state (toggle semantics).
- **Recommended correction:** add `aria-pressed={multiplier === m}` - plan-verbatim, defer to a polish pass.

## 7. Required fixes

None blocking.

## 8. Acceptance criteria

1. Focused test file: 7/7 pass - **met** (verified).
2. `npx tsc --noEmit` clean - **met** (verified, exit 0).
3. `npm run lint` clean - **met** (verified; 0 errors, warnings pre-existing in T2 file).
4. Full suite green: 286/286 - **met** (verified).

## Verdict: APPROVED

### `reports\T4.md`

# T4 Report — TurnDisplay + MultiplierButtons + SingleDartPad

- **Workflow:** WF-20260817-104302-multi-score-input
- **Task:** T4
- **Status:** complete
- **Commit:** `ad79a73` — `feat(darts): add single-dart segment selector pad`

## Objective

Create the single-dart segment selector pad: a shared turn display (`TurnDisplay`), a Double/Triple multiplier selector (`MultiplierButtons`), and `SingleDartPad` combining them with `useDartTurn` (T3) and `canApplyMultiplier`/`Multiplier` from `@/lib/dartboard` (T2). TDD: test first (red), then implement (green).

## Files created

| File | Notes |
|---|---|
| `src/components/__tests__/singleDartPad.test.tsx` | First line `// @vitest-environment jsdom`; 7 tests |
| `src/components/scoring/TurnDisplay.tsx` | Plan code verbatim |
| `src/components/scoring/MultiplierButtons.tsx` | Plan code verbatim |
| `src/components/scoring/SingleDartPad.tsx` | Plan code + one behavior fix (see deviations) |

No forbidden files touched (`NumberPad.tsx`, `matchSlice.ts`, `useDartTurn.ts`, `dartboard.ts` unchanged).

## Verification output (all commands run in order)

### 1. `npm run test -- src/components/__tests__/singleDartPad.test.tsx`

Red phase (test written first, components missing):

```
FAIL  src/components/__tests__/singleDartPad.test.tsx
Error: Failed to resolve import "@/components/scoring/SingleDartPad" ... Does the file exist?
Test Files  1 failed (1)
      Tests  no tests
```

Green phase (final):

```
Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  23:45:56
   Duration  3.90s
```

### 2. `npx tsc --noEmit`

Clean — no output, exit 0.

### 3. `npm run lint`

```
✖ 2 problems (0 errors, 2 warnings)
```

The 2 warnings are pre-existing in `src/lib/__tests__/dartboard.test.ts` (T2 file, unused `R_TRIPLE_OUT`/`R_DOUBLE_IN` imports) — not introduced by T4, warnings do not fail lint. T4 files: 0 problems.

### 4. `npm run test` (full suite)

```
Test Files  8 passed (8)
      Tests  286 passed (286)
   Duration  43.34s
```

No regressions.

## Deviations from plan code (with reasons)

1. **Test file: added `afterEach(() => { cleanup(); })`** (plus `afterEach`/`cleanup` imports).
   - Reason: `vitest.config.ts` does not enable `globals: true`, so RTL's auto-cleanup never registers and every `render()` appends to the same `document.body`. Without cleanup, tests 2–7 failed with "Found multiple elements" (the DOM dump showed the pad rendered N times). The repo's own `matchFlow.test.tsx` uses exactly this pattern (`afterEach(() => { cleanup(); })`), so this is the established convention the plan omitted.

2. **Test file: added `import '@testing-library/jest-dom/vitest';`**.
   - Reason: the test uses `toBeInTheDocument`/`toBeDisabled`/`toBeEnabled`, and `src/test/setup.ts` explicitly documents "T4 imports `@testing-library/jest-dom/vitest` per file" (jest-dom is intentionally NOT global). The plan's test snippet omitted the import.

3. **Test 5 ("undoDart removes the last dart and restores the total"): `getByText('20')` → `getByText('20', { selector: 'span' })`.**
   - Reason: after undo the display total is 20, but the segment button "20" also has exact text "20" → `getByText('20')` matches 2 elements and throws. The test's intent is to assert the display total; `{ selector: 'span' }` scopes to the TurnDisplay total span (the breakdown span text is "S20", not "20", so it stays unique). The T4.md risk note anticipated this class of collision for '40' but not '20'. Implementation-side fixes were not viable without breaking the other tests' exact-text assertions (`getByText('40')`, `getByText('60')`, `getByText('50')`) or the `getByRole('button', { name: '20' })` clicks.

4. **SingleDartPad: added `legOver` state so that after a finish, any further dart busts.**
   - Reason: plan test 4 asserts that after D20 finishes a 40 leg, a subsequent single 20 calls `onSubmit(0, 1, true)`. With the plan code verbatim, `useDartTurn` clears darts on finish but keeps `currentScore` at 40, so S20 = 20 < 40 → 'continue', no submit → test fails. Per the test's own name ("a single on the same number busts"), the intended behavior is that the leg is over after a finish: remaining is 0, so any dart busts. Implementation: `legOver` state; `currentScore: legOver ? 0 : currentScore` is passed to `useDartTurn`; `legOver` is set in `handleSegment` from `addDart`'s returned outcome (`outcome === 'finish'`) and reset via the render-time adjustment pattern on `currentScore` change (same pattern `useDartTurn` uses for `prevScore`).
   - Note: an initial version set `legOver` in a `useEffect`; `npm run lint` rejected it (`react-hooks/set-state-in-effect`). The handler-based version is lint-clean and avoids the effect entirely.

## Design decisions

- Multiplier-first interaction, auto-reset to 'S' after each dart, toggle-off on re-press — per plan (in `MultiplierButtons`/`SingleDartPad`).
- `disabled` attribute (not just styling) gates Triple on 25 and Double/Triple on BULL, per T4.md risk note.
- `pointerdown` + `e.preventDefault()`, `select-none touch-none`, `navigator.vibrate(5)` on multiplier press (stubbed in `src/test/setup.ts`).
- Dark theme per design system: zinc-900 surfaces, `border-white/5`, `rounded-2xl`, cyan active, green bull, red bust flash, `font-black`/`font-mono`, `IconRotateClockwise2` undo.
- SingleDartPad root classes unchanged from plan: `flex flex-col h-full w-full p-2 gap-2 bg-black select-none touch-none` (matches NumberPad).

## Risks / notes for reviewer

- **Post-finish behavior is a plan deviation** (deviation 4): after a finish, the pad treats remaining as 0 and any further dart submits a bust `(0, 1, true)`. This is required by the plan's own test 4 and matches real darts semantics (leg over). The `legOver` flag resets when `currentScore` changes (new leg). Behavior after a *bust* is unchanged (pad stays usable; parent is expected to update `currentScore`).
- The `legOver` reset uses the render-time adjustment pattern already used by `useDartTurn` (T3) — consistent with codebase conventions and lint rules.
- Pre-existing lint warnings in `src/lib/__tests__/dartboard.test.ts` (T2) remain; not T4's scope.
- `TurnDisplay` and `MultiplierButtons` are exported as default components with the locked interfaces — T5 can reuse them as planned.

## Ready for independent review

Yes — all acceptance criteria met: 7/7 focused tests, clean `tsc`, lint 0 errors, full suite 286/286, committed as `ad79a73`.

### `reports\T5-review.md`

# T5 Review — DartBoard + DartBoardPad

- **Reviewer:** independent (not the implementer)
- **Commit reviewed:** `c7a781f` — `feat(darts): add touch dartboard pad for large screens`
- **Date:** 2026-08-18
- **Verdict:** APPROVED_WITH_NOTES

## Summary

The task is complete and correct. The commit contains exactly the three owned files (224 insertions, no forbidden files touched, no new dependencies, exact commit message). Both components are plan code verbatim; all four acceptance criteria pass when re-run independently. The three documented deviations are all legitimate and verified. One inherited (plan-level) edge-case defect is flagged as MEDIUM with a follow-up recommendation; no required fixes.

---

## 1. Spec compliance (locked interfaces & fixed rules)

| Requirement | Status | Evidence |
|---|---|---|
| `DartBoardProps { onPress, accentColor?, className? }` | PASS | `DartBoard.tsx:8-12` |
| `DartBoardPadProps { onSubmit, currentScore, checkout? }` | PASS | `DartBoardPad.tsx:9-13` |
| Ring position does NOT change multiplier | PASS | `handlePointer` returns only a segment; multiplier applied solely in `handleBoardPress` via `MultiplierButtons` state. Test 2 proves it: tapping the SINGLE area with Triple active yields T20=60. |
| Inner bull 50 / outer bull 25 / Double+outer bull = 50 | PASS | `DartBoard.tsx:57-60` (`r <= R_INNER_BULL ? 50 : 25`); `DartBoardPad.tsx:26-30` special case `segment === 25 && multiplier === 'D'` -> `addDart(50, 'S')`. All three asserted in the rewritten bull test. |
| 12 o'clock = segment 20 | PASS | `Math.atan2(dx, -dy)` -> 0 deg at top; `SEGMENT_ORDER[0] = 20`. Verified numerically: `tap(100,60)` -> 20; `tap(100,0)` -> 20; 3/6/9 o'clock -> 6/3/11 (standard board). |
| `<svg viewBox="0 0 200 200">`, `role="img"`, aria-label, `touchAction: none`, `userSelect: none`, `onPointerDown` | PASS | `DartBoard.tsx:66-74` |
| Geometry from `@/lib/dartboard` constants; `atan2(dx, -dy)` | PASS | `DartBoard.tsx:15, 61-63`; radii `R_DOUBLE_IN/R_TRIPLE_OUT/R_TRIPLE_IN/R_OUTER_BULL/R_INNER_BULL` imported and used in `BOARD_RINGS` and bulls. |
| Wedges: double 1.0->R_DOUBLE_IN, triple R_TRIPLE_OUT->R_TRIPLE_IN, single R_TRIPLE_IN->R_OUTER_BULL; alternating zinc-900/800; labels in double ring; green outer / red inner bull | PASS | `DartBoard.tsx:41-45, 75-97`. `wedgePath` arc math verified: `polar(deg)` maps 0 deg to screen-top, sweep flags produce correct annular wedges. |
| Multiplier auto-resets to 'S' after each dart | PASS | Both branches of `handleBoardPress` call `setMultiplier('S')` (`DartBoardPad.tsx:28, 33`). |
| `rect.width === 0` guard; `r > 1` rejection | PASS | `DartBoard.tsx:49-50, 56`. |
| StrictMode safety | PASS | No side effects inside setState updaters; `addDart` computes via `dartsRef` outside updaters (T3 design); `handleBoardPress` is an event handler. |
| Forbidden files untouched | PASS | `git show c7a781f --name-only` = exactly the 3 owned files. |
| No new dependencies | PASS | Commit touches only the 3 files; no package.json change. |
| Commit message exact | PASS | `feat(darts): add touch dartboard pad for large screens`. |

## 2. The three deviations — scrutiny

### Deviation 1: `afterEach(cleanup)` + `import '@testing-library/jest-dom/vitest'` — LEGITIMATE
`vitest.config.ts` does not set `globals: true`, so RTL's auto-cleanup never registers and renders accumulate across tests; `toBeInTheDocument()` needs the jest-dom matcher. The identical pattern exists in `matchFlow.test.tsx:145-146` and `singleDartPad.test.tsx:11-12`. The plan's test code indeed lacked both. Correct and required.

### Deviation 2: `tap()` uses `document.querySelector('svg[role="img"]')` — LEGITIMATE, claim verified
`DartBoardPad` renders `TurnDisplay` first, whose undo button contains `<IconRotateClockwise2>` — a Tabler icon that renders an `<svg>` **before** the board's svg in DOM order. `document.querySelector('svg')` therefore returns the icon (no `onPointerDown` handler), and every tap silently no-ops. The fix targets the board via `role="img"` (Tabler icons render `aria-hidden` without `role="img"`, so the selector is unambiguous). All assertions unchanged. Correct fix.

### Deviation 3: Bull test rewrite — LEGITIMATE, and the plan's original test WAS impossible under T3
The plan's test (plan lines 968-982) threw 6 darts in one turn: 50, 25, D25->50, then 50, 20, 20, asserting `getByText('125')` mid-turn and `onSubmit` NOT called after the 3rd dart. The locked `useDartTurn` (`useDartTurn.ts:79-85`) auto-submits when `next.length === 3`: it clears `darts` and calls `onSubmit(total, 3, false)`. Therefore after the 3rd dart (50+25+50=125):
- the display resets to 0 (darts cleared) -> `getByText('125')` fails;
- `onSubmit` HAS been called -> `expect(onSubmit).not.toHaveBeenCalled()` fails.

The plan test contradicts the locked T3 semantics (T4's own test "auto-submits on the 3rd dart" confirms the semantics). The rewrite is correct:
- `tap(100,100)` -> r=0 -> inner bull 50 -> display "50" (unique: breakdown "S50" is a single text node and does not match exact "50") PASS
- `tap(100,108.2)` -> r=0.082 in (0.037, 0.094] -> outer bull 25 -> display "75" PASS
- Double + `tap(100,108.2)` -> special case -> `addDart(50,'S')` -> 3rd dart -> `onSubmit(125, 3, false)`; 125 = 50+25+50 PASS (arithmetic verified)

All three fixed rules remain asserted. The dropped 6-dart bust leg is unreachable under auto-submit and bust coverage exists in test 2 (T20: 60+20=80 > 61 -> `onSubmit(0, 2, true)`) and T4's suite. Acceptable.

## 3. Engineering quality

- Geometry independently re-verified with a numeric script: `tap(100,60)`->20, `tap(100,100)`->50, `tap(100,108.2)`->25, 12/3/6/9 o'clock -> 20/6/3/11 (standard board). All test coordinates land safely inside their zones (r = 0.4, 0, 0.082; bull boundary 0.094 not hit) — no nudges needed, as reported.
- Pointer handling: `rect.width === 0` guard, `r > 1` rejection, bull classification before angle math. Correct.
- Test quality: 5 tests cover single, multiplier-from-buttons + bust, all three bull rules, undo, double-out finish. `beforeEach(vi.restoreAllMocks)` prevents mock leakage. First line `// @vitest-environment jsdom` per spec.
- Minor: `DartBoard` inlines the `segmentFromAngleDeg`/`bullZoneFromRadius` logic instead of importing the T2 pure functions (the plan's interface lists them as consumed, but the plan's reference code also inlines — plan-internal inconsistency; implementation follows the reference). Drift risk only.

## 4. Verification evidence (re-run by reviewer)

| Command | Result |
|---|---|
| `npm run test -- src/components/__tests__/dartBoardPad.test.tsx` | PASS — 5 passed (5) |
| `npx tsc --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0 (2 pre-existing warnings in T2's `src/lib/__tests__/dartboard.test.ts`, untouched by this commit) |
| `npm run test` (full suite) | PASS — 9 files, 291 tests passed |

All match the implementer's report.

---

## Findings

### BLOCKER
None.

### HIGH
None.

### MEDIUM

**M1 — Triple+outer bull / Double|Triple+inner bull record a 0-point dart that consumes a turn dart**
- **Location:** `src/components/scoring/DartBoardPad.tsx:26-34` (`handleBoardPress`), interacting with `src/lib/dartboard.ts:42-47` (`canApplyMultiplier`).
- **Problem:** The special case only covers `segment === 25 && multiplier === 'D'`. For `25 + 'T'`, `50 + 'D'`, and `50 + 'T'`, `addDart(segment, multiplier)` is called and `scoreDart` returns 0 (verified: `scoreDart(25,'T')=0`, `scoreDart(50,'D')=0`, `scoreDart(50,'T')=0`). A 0-point dart is appended to the turn and counts toward the 3-dart limit.
- **Impact:** A player who selects Triple (or Double) and taps a bull gets 0 points instead of 25/50 and loses a dart in the turn — a scoring-correctness defect in real play. T4's NumberPad prevents this by disabling those buttons; the board has no equivalent guard.
- **Note:** This is inherited verbatim from the locked plan reference code, so it is NOT an implementer deviation and does not block this task. It needs a plan-level decision (e.g., treat as `addDart(25,'S')`/`addDart(50,'S')`, or ignore the tap) in a follow-up task.
- **Recommended correction (follow-up):** In `handleBoardPress`, normalize invalid multiplier/bull combinations before `addDart`, e.g. `if (segment === 50 || (segment === 25 && multiplier === 'D')) { addDart(50, 'S'); ... }` and for `segment === 25 && multiplier === 'T'` fall back to `addDart(25, 'S')` (or ignore). Requires plan amendment — out of T5 scope.

### LOW

**L1 — Duplicated geometry logic instead of T2 pure functions**
- **Location:** `src/components/scoring/DartBoard.tsx:57-63`.
- **Problem:** `handlePointer` re-implements `segmentFromAngleDeg` and `bullZoneFromRadius` inline; the plan interface lists those functions as consumed from `@/lib/dartboard`.
- **Impact:** If T2's normalization/classification logic changes, the board can drift. Currently identical behavior (verified numerically).
- **Recommended correction:** Import and use `segmentFromAngleDeg`/`bullZoneFromRadius` (optional; plan reference code inlines too).

**L2 — `accentColor` prop declared but unused**
- **Location:** `src/components/scoring/DartBoard.tsx:9, 47`.
- **Problem:** Destructured out (`{ onPress, className }`); no active-player highlight.
- **Impact:** None today; T6 is expected to consume it. Matches plan verbatim.
- **Recommended correction:** None for T5; confirm T6 uses it.

**L3 — Exact-boundary float quirk at r = R_OUTER_BULL**
- **Location:** `src/components/scoring/DartBoard.tsx:57`.
- **Problem:** A tap at exactly 9.4px from center computes `9.4/100 = 0.09400000000000000355 > R_OUTER_BULL`, classifying as segment area instead of outer bull (verified numerically).
- **Impact:** Negligible — a tap exactly on the bull boundary is physically ambiguous; no test uses it (tests use r=0.082).
- **Recommended correction:** None required; optionally use `bullZoneFromRadius` (L1) which has the same FP semantics anyway.

---

## Required fixes

None. All findings are notes/follow-ups; the task meets its acceptance criteria and the deviations are justified.

## Verdict

**APPROVED_WITH_NOTES** — spec-compliant, all verification passes, deviations 1-3 verified legitimate, bull-test rewrite correct and necessary. M1 (0-point bull darts) is inherited from the locked plan and should be addressed as a follow-up task.

### `reports\T5.md`

# T5 Report — DartBoard + DartBoardPad

- **Workflow:** WF-20260817-104302-multi-score-input
- **Task:** T5 — Create the touch dartboard (SVG board mapping pointer taps to segments/bulls) and DartBoardPad combining it with `useDartTurn`, `TurnDisplay`, `MultiplierButtons`
- **Status:** complete
- **Commit:** `c7a781f` — `feat(darts): add touch dartboard pad for large screens`

## Objective

Create exactly three files (TDD: test first, watch it fail, then implement):

- `src/components/scoring/DartBoard.tsx` — SVG dartboard; maps pointer taps to segments (1–20), outer bull (25), inner bull (50); ring position does NOT change the multiplier.
- `src/components/scoring/DartBoardPad.tsx` — same props shape as SingleDartPad; combines `useDartTurn` + `TurnDisplay` + `MultiplierButtons` + `DartBoard`; multiplier auto-resets to `'S'` after each dart; Double + outer bull tap = 50 special case.
- `src/components/__tests__/dartBoardPad.test.tsx` — 5 tests, first line `// @vitest-environment jsdom`.

## Files created

| File | Lines | Notes |
|---|---|---|
| `src/components/scoring/DartBoard.tsx` | 99 | Plan code verbatim |
| `src/components/scoring/DartBoardPad.tsx` | 60 | Plan code verbatim |
| `src/components/__tests__/dartBoardPad.test.tsx` | 87 | Plan code + 2 repo-convention additions + 2 documented fixes (below) |

No other files touched. `useDartTurn.ts`, `dartboard.ts`, `TurnDisplay.tsx`, `MultiplierButtons.tsx`, `NumberPad.tsx`, `matchSlice.ts` all unmodified (verified via `git status`/`git diff` before commit).

## Verification (actual output)

### 1. TDD red run (before implementation)

```
 FAIL  src/components/__tests__/dartBoardPad.test.tsx [ src/components/__tests__/dartBoardPad.test.tsx ]
Error: Failed to resolve import "@/components/scoring/DartBoardPad" from "src/components/__tests__/dartBoardPad.test.tsx". Does the file exist?
 Test Files  1 failed (1)
      Tests   no tests
```

### 2. `npm run test -- src/components/__tests__/dartBoardPad.test.tsx` — PASS

```
 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  00:07:58
   Duration  3.04s (transform 113ms, setup 29ms, import 723ms, tests 454ms, environment 1.52s)
```

### 3. `npx tsc --noEmit` — clean

```
TSC_EXIT=0
```

### 4. `npm run lint` — exit 0

```
D:\own\nomad-darts\src\lib\__tests__\dartboard.test.ts
  5:44  warning  'R_TRIPLE_OUT' is defined but never used  @typescript-eslint/no-unused-vars
  5:58  warning  'R_DOUBLE_IN' is defined but never used   @typescript-eslint/no-unused-vars

✖ 2 problems (0 errors, 2 warnings)
```

The 2 warnings are **pre-existing** in T2's `src/lib/__tests__/dartboard.test.ts` (file untouched by this task; `git status` showed only the 3 new files). Lint exits 0.

### 5. `npm run test` (full suite) — PASS

```
 Test Files  9 passed (9)
      Tests  291 passed (291)
   Start at  00:08:43
   Duration  44.23s
```

Includes T4's `singleDartPad.test.tsx` (8 tests) and `matchFlow.test.tsx` — all green.

## Commit

```
c7a781f feat(darts): add touch dartboard pad for large screens
 3 files changed, 224 insertions(+)
```

Working tree clean after commit.

## Deviations from the plan code (with reasons)

All deviations are in the **test file only**; both components are plan code verbatim.

1. **`afterEach(() => { cleanup(); })` + `import '@testing-library/jest-dom/vitest'` added** (plan test lacked both). Required by the repo convention (see `matchFlow.test.tsx` / `singleDartPad.test.tsx`): vitest globals are disabled so RTL auto-cleanup never registers (renders would accumulate across tests), and `toBeInTheDocument()` needs the jest-dom matcher. Without these the test cannot pass.

2. **`tap()` selects the board via `document.querySelector('svg[role="img"]')` instead of `document.querySelector('svg')`.** The plan's selector is ambiguous: `TurnDisplay`'s undo button renders a Tabler icon `<svg>` earlier in the DOM, so `querySelector('svg')` returns the icon (no handler) and every tap silently no-ops (all 5 tests failed with "Number of calls: 0"). Selecting by `role="img"` targets the board svg. All assertions unchanged.

3. **Bull test rewritten to respect the locked T3 auto-submit.** The plan's bull test threw 6 darts in one turn (50, 25, D25→50, 50, 20, 20) expecting the display to show 125 mid-turn and `onSubmit` NOT called. The committed, locked `useDartTurn` (T3) auto-submits on the 3rd dart (`next.length === 3` → `setDarts([])` + `onSubmit(total, 3, false)`), so the display can never show 125 and `onSubmit` IS called. The plan's expectation contradicts T3's locked behavior (T4's own test "auto-submits on the 3rd dart" confirms). The rewrite verifies the same three fixed rules within T3's semantics:
   - inner bull tap → 50 (display "50")
   - outer bull tap → 25 (display "75")
   - Double + outer bull tap → 50 special case → 3rd dart auto-submits `onSubmit(125, 3, false)` (50 + 25 + 50)
   
   The trailing bust-leg of the original test (6-dart turn) is unreachable under auto-submit; bust coverage already exists in test 2 ("records T20…" busts on the 2nd dart) and in T4's suite.

No coordinate nudges were needed — `tap(100, 60)`, `tap(100, 100)`, `tap(100, 108.2)` all land cleanly (r = 0.4, 0, 0.082; bull boundary is 0.094).

## Design decisions

- Components are plan code verbatim: `viewBox="0 0 200 200"`, `role="img"`, aria-label "Dartboard — tap where the dart landed", `touchAction: 'none'`, `userSelect: 'none'`, `onPointerDown`, `rect.width === 0` guard, `Math.atan2(dx, -dy)` angle (0° = 12 o'clock = segment 20), wedge rings (double 1.0→R_DOUBLE_IN, triple R_TRIPLE_OUT→R_TRIPLE_IN, single R_TRIPLE_IN→R_OUTER_BULL), alternating zinc-900/zinc-800 fills, green outer bull / red inner bull, labels in the double ring.
- Multiplier comes only from the Double/Triple buttons; ring position never changes it. `handleBoardPress` special-cases `segment === 25 && multiplier === 'D'` → `addDart(50, 'S')`.
- Multiplier resets to `'S'` after every dart (both branches of `handleBoardPress`).
- Dark theme per plan: `bg-black`, `border-white/5` (via TurnDisplay), cyan active (via MultiplierButtons), `font-black`/`font-mono`, `select-none touch-none`. No new npm dependencies.

## Risks / notes for the reviewer

- **Plan test inconsistency (item 3 above) is the main review point.** The plan's bull test assumed a turn can hold more than 3 darts without submitting; the locked T3 hook auto-submits at 3. The rewrite keeps all three fixed bull rules asserted. If the reviewer prefers the original 6-dart flow, that would require changing T3 (out of scope, forbidden file).
- The `svg[role="img"]` selector in `tap()` is slightly less literal than the plan's `svg` selector but is unambiguous and keeps the plan's mock-rect approach.
- Pre-existing lint warnings in `src/lib/__tests__/dartboard.test.ts` (T2 file) — not introduced by this task; lint exits 0.
- `accentColor` prop is declared in `DartBoardProps` (locked interface) but unused by the implementation — matches the plan code; T6 may use it for the active-player highlight.
- jsdom has no layout: tests mock `getBoundingClientRect` to a 200×200 box at (0,0); the component guards `rect.width === 0` for real-browser edge cases.

## Ready for independent review

Yes. All four verification commands pass, commit `c7a781f` contains exactly the three owned files, and the two test-file deviations are documented above with reasons.

### `reports\T6-review.md`

# T6 Review — ScoreInputPanel + match page wiring + flow test adaptation

- **Reviewer:** independent reviewer (not the implementer)
- **Commit reviewed:** `e17e449` — `feat(darts): add score input mode switcher panel` (3 files, +170/-2)
- **Date:** 2026-08-18
- **Verdict:** APPROVED_WITH_NOTES

## 1. Verification evidence (run by the reviewer, not taken from the report)

| Command | Result |
|---|---|
| `npm run test -- src/components/__tests__/scoreInputPanel.test.tsx` | **6/6 passed** (1 file) |
| `npm run test` (full suite) | **10 files / 297 tests passed** (45.0s) — includes all 17 `matchFlow` tests, unmodified |
| `npx tsc --noEmit` | **clean** (exit 0) |
| `npm run lint` | **0 errors, 2 warnings** — both pre-existing in `src/lib/__tests__/dartboard.test.ts` (unused `R_TRIPLE_OUT`/`R_DOUBLE_IN`; file not owned by T6, not in the diff) |
| Empirical lint probe | A scratch file with the plan's `useEffect(() => setMode(...))` pattern fails with **`react-hooks/set-state-in-effect` as a hard error** (eslint-plugin-react-hooks **v7.0.1** installed). Probe file deleted; `git status` clean afterwards. |
| Commit hygiene | `git show e17e449` touches exactly the 3 owned files (`ScoreInputPanel.tsx`, `scoreInputPanel.test.tsx`, `match/page.tsx`). No forbidden files. Commit message matches the spec verbatim. Working tree clean. |

The implementer's reported numbers (6/6, 297, tsc 0, lint 0 errors) are **reproduced exactly**.

## 2. Spec compliance (locked interface + behavior rules)

All locked requirements verified against `src/components/scoring/ScoreInputPanel.tsx`:

- **Interface** (lines 8-17): `ScoreInputMode` type and all 7 props (`onSubmit`, `onUndo`, `canUndo`, `currentScore`, `checkout`, `className`) match the locked spec exactly.
- **Default mode `'three'`** (lines 47-52 initializer, line 88): OK.
- **BOARD tab only >=768px** (line 86 `isLarge && tab('board', 'BOARD')`; line 90 render guard): OK.
- **Both `matchMedia` `change` AND `window` `resize` listeners** (lines 32-33): OK.
- **BOARD -> single fallback mid-session** (line 57): OK — locked test 5 passes.
- **localStorage persistence** (lines 19, 49-51, 61): key `nomad-darts:score-input-mode`; invalid stored values -> `'three'` (line 50); stored `'board'` honored only while `isLarge` (line 51). OK.
- **Tab labels** `3 DARTS` / `1 DART` / `BOARD`, uppercase, `font-black`, active cyan (lines 64-77): OK.
- **NumberPad gets `onUndo`/`canUndo`** (line 88); per-dart pads manage undo internally (they receive only `padProps`): OK.
- **matchFlow selectors intact**: `div.p-2.gap-2.bg-black` matches only NumberPad's root (panel wrapper is `flex flex-col gap-2` — no `p-2`/`bg-black`; tabs live outside the pad container); `button.bg-cyan-500` matches only NumberPad's submit (active tab is `bg-cyan-500/10`, a distinct class token, and outside the pad scope); digit lookups are scoped `within(pad)` and tab labels ("1 DART") do not exact-match digit names ("1"). All 17 flow tests pass **without modification** — the report's claim is accurate.

**Acceptance criteria: all 4 met** (verified by my own runs above).

## 3. Assessment of the 5 documented deviations

### Deviation 1 — named import of NumberPad: **CORRECT, the plan was wrong**
`NumberPad.tsx:18` is `export function NumberPad` — a named export. The plan's `import NumberPad from './NumberPad'` would bind `undefined` and crash every panel test ("Element type is invalid"). The fix matches the import style the match page already used. No issue.

### Deviation 2 — re-querying `window.matchMedia` in the handler: **CORRECT and justified**
The stale-matches claim is accurate for the locked test: test 5 calls `setMedia(false)` which **replaces** `window.matchMedia` with a new mock, then fires `resize`. The mql captured in the effect still reports `matches: true`; the plan's `() => setIsLarge(mql.matches)` would never trigger the fallback and the locked test would fail. Re-querying `window.matchMedia(BOARD_QUERY).matches` (line 31) reads the live mock -> `false` -> fallback fires. In real browsers the semantics are identical (a fresh MQL always reflects current state; the `change` event on the captured mql still fires and the handler re-queries live state). Listener cleanup (lines 34-37) uses the same captured `mql` and the same handler reference — correct. Verified: test 5 passes.

### Deviation 3 — lazy `useState` initializer instead of restore effect: **JUSTIFIED, with a latent (not active) hydration hazard**
I empirically confirmed the repo's eslint (react-hooks v7.0.1, `react-hooks/set-state-in-effect`) rejects the plan's effect-based restore as a **hard error** — the deviation was lint-mandated, not stylistic. The initializer (lines 47-52) preserves the exact first-render semantics (reads localStorage, honors `'board'` only when `isLarge`, invalid -> `'three'`, SSR guard).

**Hydration concern — assessed, severity LOW (latent only):** the implementer's risk note ("server renders 'three', client hydrates with persisted mode -> one post-hydration render flip") is **mechanically imprecise**: in the current wiring the panel is *never* part of server HTML. `matchSlice` initial state is `status: 'setup'` (matchSlice.ts:54), `match/page.tsx:45` returns `null` for setup status, and the store uses redux-persist with `PersistGate loading={null}` (store-provider.tsx:13) — on the server, persist storage is a no-op, so the server always renders `null` and the panel mounts only client-side after rehydration. No mismatch, no flip, no console error today. The hazard is **latent**: if the page ever server-renders with a non-setup match state (server-side persistence, removal of the early return), the lazy initializer would produce a hydration mismatch whenever the persisted mode != `'three'`, whereas the plan's effect approach would not. Recommend documenting this constraint (finding F1).

### Deviation 4 — render-time BOARD fallback: **CORRECT**
`if (mode === 'board' && !isLarge) setMode('single')` (line 57) is the React-sanctioned render-phase adjustment pattern (same component, converges in one re-render, no loop — after the set, `mode !== 'board'`). It is the exact pattern already lint-clean in `SingleDartPad.tsx:31-35` (T4). Satisfies the locked fallback test (verified passing). No issue.

### Deviation 5 — test harness additions: **CORRECT, matches repo convention**
`import '@testing-library/jest-dom/vitest'` and `afterEach(() => { cleanup(); })` mirror `matchFlow.test.tsx:14,145-151` exactly, and `src/test/setup.ts:8` explicitly documents per-file jest-dom imports as the convention. The 6 test bodies are verbatim from the plan. The `useCallback` wrap on `selectMode` is behavior-neutral. No issue.

## 4. Findings (ordered by severity)

### F1 — LOW — Latent hydration hazard from the lazy initializer
- **Location:** `src/components/scoring/ScoreInputPanel.tsx:47-52`
- **Problem:** the initializer reads `localStorage` during the client's first render. Today this cannot mismatch (the match page server-renders `null` — see deviation 3 analysis), but the code contains no guard tying the persisted-mode read to post-hydration execution.
- **Impact:** if the page ever becomes server-renderable with a non-setup match state, every load with a persisted mode != `'three'` would throw a React hydration-mismatch error (dev console) and flash the wrong pad (prod) before client re-render.
- **Recommended correction:** none required now; add a comment at line 47 documenting the dependency ("safe only because /match server-renders null while status === 'setup'"), or if the page is ever made server-renderable, gate the persisted read behind a hydration flag (e.g., `useSyncExternalStore` or a `mounted` state set in an effect callback — not the effect body, which the lint rule forbids).

### F2 — LOW — Unguarded `localStorage` access
- **Location:** `ScoreInputPanel.tsx:49` (`getItem`) and `:61` (`setItem`)
- **Problem:** both calls throw if storage is unavailable (disabled storage, some sandboxed/private contexts). The task spec's risk section explicitly calls out "localStorage may be unavailable in some environments"; the plan's code had the same gap, so this is a plan-level gap, not a regression.
- **Impact:** panel crash on mount or on tab click in such environments.
- **Recommended correction:** wrap in try/catch (or a small `safeStorage` helper): `try { const stored = localStorage.getItem(STORAGE_KEY) ... } catch { return 'three'; }` and `try { localStorage.setItem(STORAGE_KEY, m); } catch { /* non-fatal */ }`.

### F3 — LOW — Tab switcher lacks ARIA state
- **Location:** `ScoreInputPanel.tsx:64-77`
- **Problem:** active mode is conveyed only visually (`text-cyan-400` vs `text-zinc-500`); no `aria-pressed`, `role="tablist"`/`aria-selected`, or `aria-current`.
- **Impact:** screen-reader users cannot determine the active input mode. Consistent with the codebase's plain-button style, but a mode switcher is the canonical case for `aria-pressed`.
- **Recommended correction:** add `aria-pressed={mode === m}` to the tab button (one line, no test impact — `getByRole('button', { name })` queries still match).

### F4 — LOW — Persistence-restore paths untested
- **Location:** `src/components/__tests__/scoreInputPanel.test.tsx`
- **Problem:** the 6 locked tests cover default mode, switching, BOARD visibility, mid-session fallback, and persistence *write* — but not the *restore* paths: persisted `'single'` restored on mount, invalid stored value -> `'three'`, stored `'board'` + small screen -> `'single'` on mount. The behavior is implemented (lines 47-52) but unverified.
- **Impact:** regression risk in exactly the code that deviated from the plan.
- **Recommended correction:** add 3 tests (e.g., `localStorage.setItem('nomad-darts:score-input-mode', 'single')` before render -> expect 1 DART pad; `'garbage'` -> 3 DARTS pad; `'board'` + `setMedia(false)` -> 1 DART pad). Note: the task spec locked the plan's test file, so this is a plan-level gap; adding tests is a follow-up, not a T6 defect.

### F5 — LOW — `matchFlow.test.tsx` does not clear localStorage
- **Location:** `src/components/__tests__/matchFlow.test.tsx:145-151` (beforeEach)
- **Problem:** the panel now reads/writes `localStorage` on mount; flow tests never clear it. Currently safe (fresh jsdom per file, no flow test clicks tabs), but any future flow test that switches modes would leak state across tests in the file.
- **Impact:** latent cross-test contamination.
- **Recommended correction:** add `localStorage.clear()` to the flow test's `beforeEach` (one line).

### F6 — LOW — Report inaccuracies (non-functional)
- **Location:** `.opencode/workflows/WF-20260817-104302-multi-score-input/reports/T6.md`
- **Problem:** (a) deviation 3 cites "react-hooks v6" — the installed plugin is **v7.0.1** (substance unchanged: the rule exists and is enforced); (b) the hydration note's mechanism is imprecise — there is no server render of the panel at all today (page returns `null` on the server), so there is no "post-hydration render flip" either; the panel mounts purely client-side after persist rehydration.
- **Impact:** future readers may misjudge the hydration risk.
- **Recommended correction:** update the report's risk note to the accurate mechanism (see deviation 3 assessment above).

### F7 — LOW — Perf nit: MQL re-query on every resize event
- **Location:** `ScoreInputPanel.tsx:31`
- **Problem:** `resize` fires continuously during drag-resizing; each event allocates a fresh `MediaQueryList`. Browsers cache MQLs internally so this is cheap, and it is the price of test correctness (deviation 2).
- **Impact:** negligible.
- **Recommended correction:** none (acceptable trade-off); optionally debounce or read `mql.matches` when the mql is known-fresh.

## 5. Engineering quality notes (no action required)

- **onClick vs pointerdown:** tabs use `onClick` per the plan; pads use `onPointerDown` for input latency. Tabs are low-frequency controls — acceptable inconsistency, plan-specified.
- **No new dependencies**; all imports used; `strict` tsc clean.
- **No unintended scope expansion:** diff is exactly the 3 owned files; forbidden files untouched; `matchFlow.test.tsx` correctly left unmodified.
- **Fallback does not rewrite localStorage** to `'single'` — stored `'board'` re-resolves to `'single'` on next small-screen visit; consistent, spec-compliant.
- **StrictMode:** lazy initializer double-invocation is idempotent (read-only); render-phase setState is safe.

## 6. Conclusion

All 4 acceptance criteria verified by independent runs. All 5 deviations are justified: two are outright corrections of plan bugs (named import; stale captured mql), two are lint-mandated refactors with equivalent behavior (lazy initializer; render-time fallback — the lint rule was empirically confirmed as a hard error), and one is test-harness convention compliance. The hydration concern is real but **latent only** — it cannot manifest in the current wiring. No blockers, no HIGH or MEDIUM findings; the 7 LOW findings are notes and cheap hardening suggestions, none of which block the task.

**Verdict: APPROVED_WITH_NOTES**

### `reports\T6.md`

# Task T6 — ScoreInputPanel + match page wiring + flow test adaptation

- **Workflow:** WF-20260817-104302-multi-score-input
- **Status:** completed
- **Commit:** `e17e449` — `feat(darts): add score input mode switcher panel` (3 files, +170/-2)
- **Date:** 2026-08-18

## Objective

Create the mode-switcher panel (`3 DARTS` / `1 DART` / `BOARD`), wire it into the match page replacing `NumberPad` (props unchanged), and keep the flow tests green.

## Files created / modified

| File | Change |
|---|---|
| `src/components/scoring/ScoreInputPanel.tsx` | **Created** — mode switcher panel (owns `ScoreInputMode` type, 768px guard via `matchMedia` + `resize` listeners, localStorage persistence) |
| `src/components/__tests__/scoreInputPanel.test.tsx` | **Created** — 6 tests (plan Task 6 Step 1 content) |
| `src/app/match/page.tsx` | **Modified** — line 6 import swapped to `ScoreInputPanel`; `<NumberPad … />` JSX (lines 68–76) replaced with `<ScoreInputPanel … />`, props unchanged |
| `src/components/__tests__/matchFlow.test.tsx` | **NOT modified** — no selector broke (verified below) |

Forbidden files untouched: `NumberPad.tsx` (root classes `p-2 gap-2 bg-black` intact — `matchFlow` helper `renderMatchPage` still locates it), `matchSlice.ts`, `useDartTurn.ts`, `dartboard.ts`, `TurnDisplay.tsx`, `MultiplierButtons.tsx`, `SingleDartPad.tsx`, `DartBoard.tsx`, `DartBoardPad.tsx`.

## Verification (actual command output)

All four commands run in order on the final code:

### 1. `npm run test -- src/components/__tests__/scoreInputPanel.test.tsx`

```
 Test Files  1 passed (1)
      Tests  6 passed (6)
```

### 2. `npm run test` (full suite)

```
 Test Files  10 passed (10)
      Tests  297 passed (297)
   Duration  44.57s
```

Per-file (verbose run): matchFlow 17, scoreInputPanel 6, singleDartPad 7, dartBoardPad 5, useDartTurn 9 + 5 hook tests, dartboard 8, dart-rules 51, utils 18, matchSlice 171 → 297 total. **`matchFlow.test.tsx` passed without any modification.**

### 3. `npx tsc --noEmit`

```
TSC_EXIT=0  (no output — clean)
```

### 4. `npm run lint`

```
✖ 2 problems (0 errors, 2 warnings)
LINT_EXIT=0
```

The 2 warnings are pre-existing in `src/lib/__tests__/dartboard.test.ts` (unused imports `R_TRIPLE_OUT`/`R_DOUBLE_IN`, committed before this task, file not owned by T6). No errors.

## Deviations from plan code (with reasons)

1. **`NumberPad` import fixed to named import** — plan wrote `import NumberPad from './NumberPad'`, but `NumberPad.tsx` exports a named export (`export function NumberPad`); the default import is `undefined` and every panel test crashed with "Element type is invalid … got: undefined". Corrected to `import { NumberPad } from './NumberPad'`. (Same import style the match page already used.)

2. **`useIsLargeScreen` change/resize handler re-queries `window.matchMedia(BOARD_QUERY)` instead of reading captured `mql.matches`** — plan code captured `const mql = window.matchMedia(BOARD_QUERY)` in the effect and used `setIsLarge(mql.matches)`. The locked fallback test calls `setMedia(false)` (which installs a **new** matchMedia mock) then fires a window `resize`; the captured object still reports `matches: true`, so the mid-session fallback would never trigger and the test would fail. The handler now re-queries the live `window.matchMedia(BOARD_QUERY).matches` (same semantics in real browsers — the MediaQueryList can never go stale). `addEventListener`/`removeEventListener` still use the same captured `mql` object, so cleanup is correct.

3. **Mode-restore moved from `useEffect` into a lazy `useState` initializer** — plan used an effect calling `setMode` synchronously in the body; the repo's eslint (eslint-config-next, react-hooks v6) enforces `react-hooks/set-state-in-effect` and this was a hard error. The lazy initializer preserves the exact first-render semantics (reads `localStorage`, honors `'board'` only when `isLarge`, invalid values → `'three'`), with a `typeof window === 'undefined'` SSR guard (effects never ran on the server, so the guard preserves SSR safety).

4. **BOARD-unavailable fallback moved from `useEffect` to a render-time adjustment** — same lint rule flagged the second effect. Replaced with `if (mode === 'board' && !isLarge) setMode('single')` during render, the exact pattern already used and lint-clean in `SingleDartPad.tsx` (T4). It converges to `'single'` in one re-render; behavior identical to the plan's effect.

5. **Test file additions mandated by task spec conventions** (task spec is authoritative over plan): added `import '@testing-library/jest-dom/vitest'` (required for `toBeInTheDocument`) and `afterEach(() => { cleanup(); })` (vitest runs without `globals: true`, so RTL's auto-cleanup never fires and tests would collide on duplicate elements — e.g. test 5's `getByRole('BOARD')` after test 4's render). The 6 test bodies are verbatim from the plan. Also wrapped `selectMode` in `useCallback` (plan had a plain function; lint did not complain, this is a no-behavior cleanup — noted for transparency).

## Risks / notes for the reviewer

- The mid-session fallback path (`mode === 'board'` → screen shrinks) is exercised only by the jsdom `resize` test; real-browser behavior relies on the `change` listener, which re-queries live state — equivalent outcome.
- `localStorage` access in the lazy initializer is guarded for SSR; on the server the panel always starts in `'three'` (client hydrates with the persisted mode). Next.js hydration: server renders `'three'`, client initializer may pick `'single'`/`'board'` → one post-hydration render flip. Same observable behavior as the plan's effect, just one render earlier. Low risk.
- `selectMode` writes `localStorage` even for the fallback-free default tab clicks; key `nomad-darts:score-input-mode` matches spec.
- `matchFlow.test.tsx` needed **no** changes: the panel keeps NumberPad's root (`div.p-2.gap-2.bg-black`), display (`span.text-5xl`), submit (`button.bg-cyan-500`), and undo button intact; tab buttons live outside the pad container so scoped `within(pad)` queries are unaffected. All 17 flow tests pass.
- Pre-existing lint warnings in `dartboard.test.ts` (unused imports) are out of T6 scope.

## Ready for independent review

Yes. Implementation, verification, and commit are complete; the only files changed are the three owned by T6.

### `reports\T7-review.md`

# T7 Review — Durable documentation (ADR-0009 + system overview)

- **Reviewer:** independent reviewer (not the implementer)
- **Date:** 2026-08-18
- **Commit reviewed:** `d0d24743071e85ad2a4097fcb32c1585af330dba` ("docs: add multi-mode score input ADR and system overview update")
- **Scope:** `docs/decisions/ADR-0009-multi-score-input.md` (new), `docs/10-system-overview.md` (+5 lines)

## Verification results

| Command | Result |
|---|---|
| `npx tsc --noEmit` | Exit 0 — clean |
| `npm run lint` | Exit 0 — 0 errors, 2 warnings in `src/lib/__tests__/dartboard.test.ts` (T2-owned file, unused `R_TRIPLE_OUT`/`R_DOUBLE_IN` imports; pre-existing — a docs-only commit cannot cause them) |
| `git show d0d2474 --stat` | Exactly 2 files changed, both owned docs files; no `src/` files |
| `git status --short` | Clean; commit is HEAD |

## Axis 1 — Technical accuracy (ADR decisions vs. actual implementation)

All substantive claims verified against source; decisions D1–D7 match the code:

- **D1 (3 modes, 3 DARTS default):** `ScoreInputPanel.tsx:47-52` (lazy init defaults to `'three'`), `:84-90` (tabs). ✓
- **D2 (multiplier-first, no Single button, auto-reset):** `MultiplierButtons.tsx:12-31` (only D/T buttons), `SingleDartPad.tsx:46` and `DartBoardPad.tsx:28-32` (`setMultiplier('S')` after each dart). ✓
- **D3 (bull rules):** `dartboard.ts:42-47` (`canApplyMultiplier`: 25 → S/D, 50 → S only; T+25, T+BULL, D+BULL disabled); `DartBoardPad.tsx:26-29` (outer bull + Double → 50); `DartBoard.tsx:44-46` (inner bull → 50, outer → 25). ✓
- **D4 (live per-dart bust/finish, actual dartsUsed, no Submit, undo in display row):** `useDartTurn.ts:61-89` (bust → `onSubmit(0, next.length, true)`; finish → `onSubmit(total, next.length, false)`; 3rd dart auto-submit), `resolveTurnStatus` `:14-29` (double-out last dart must be D or segment 50); `TurnDisplay.tsx:35-48` (undo arrow in display row). ✓
- **D5 (reducer no longer forces 3 on bust; numeric mode unchanged):** `matchSlice.ts:143` (`dartsUsed: dartsUsed` — no `isBust ? 3` coercion); `NumberPad.tsx:64` (`onSubmit(0, 3, true)` — BUST still sends 3). ✓
- **D6 (BOARD hidden <768px, fallback to 1 DART):** `ScoreInputPanel.tsx:57` (`mode === 'board' && !isLarge` → `setMode('single')`), `:86` (`isLarge && tab('board', ...)`), `:90`. ✓ (see LOW-1 for the "CSS md:" wording)
- **D7 (mode persistence):** `ScoreInputPanel.tsx:19` (`STORAGE_KEY = 'nomad-darts:score-input-mode'`), `:61`; guard re-checked at render `:57`. ✓
- **FinishConfirmation only in numeric mode:** only `NumberPad.tsx:6,197` imports/renders it. ✓
- **Referenced commits:** b989204, b652e1d, d93d2ff, ad79a73, c7a781f, e17e449 all exist with messages matching the ADR's descriptions. ✓
- **Context:** matches ADR-0007 D14 (always-3-darts turns, FinishConfirmation darts count) and ADR-0008 D3 (bust forced 3 darts). ✓
- **Alternatives considered:** numeric-only single-dart entry rejected for impossible-score risk — consistent with `canApplyMultiplier`/`scoreDart` design intent. ✓

## Axis 2 — Completeness

All required sections present: Context, Decisions (D1–D7), Alternatives considered, Consequences. The consequences correctly capture the reducer semantics change, the FinishConfirmation scope, the new shared pieces (`useDartTurn`, `src/lib/dartboard.ts`), and the implementation commits. Acceptance criteria 1–3 of T7 are met.

## Axis 3 — Repo format

ADR-0009 follows the ADR-0007/0008 convention: long descriptive title, `- **Status:**` / `- **Date:**` bullets, `## Context`, `## Decisions` with D-numbered bold bullets, `## Consequences`. The added `## Alternatives considered` section is not present in 0007/0008 but was explicitly required by the T7 task spec and the plan — acceptable, and the deviation is documented in the implementer's report. Minor: file lacks a trailing newline (repo files end with one).

## Axis 4 — System overview

The new "Score Entry" section (lines 51–54) fits the file's Mongolian style, is placed after "Game Modes", and correctly describes `ScoreInputPanel` with the 3 modes (3 DARTS default, 1 DART segment selector + Double/Triple, BOARD ≥768px), plus persistence and actual-darts-on-bust. The implementer's deviation (no pre-existing score-entry section existed; a new section was added instead of editing a non-existent one) is legitimate and coordinator-confirmed.

## Axis 5 — Scope

Commit d0d2474 touches exactly the 2 owned files. No `src/` files, no files owned by T1–T6. Working tree clean.

## Findings

### BLOCKER
None.

### HIGH
None.

### MEDIUM
None.

### LOW

1. **ADR-0009 D6, line ~57 — "CSS `md:` + JS `matchMedia('(min-width: 768px)')` guard":** no CSS `md:` class exists in the implementation; the BOARD visibility guard is JS-only (`isLarge && tab('board', 'BOARD')` in `ScoreInputPanel.tsx:86`; grep for `md:` in `src/components/scoring` returns nothing). The claim is inherited from the spec, but the ADR should describe the shipped implementation. Impact: a future reader may look for a CSS guard that does not exist. Correction: reword to "JS `matchMedia('(min-width: 768px)')` guard (no CSS breakpoint)".

2. **ADR-0009 D3, line ~44 — "two separate buttons — `25` and `BULL (50)`":** in the implementation, 25 is a grid cell of the 1–25 grid (`SingleDartPad.tsx:15,63-77`), not a separate button; only `BULL (50)` is a standalone button. Impact: minor wording mismatch with the code. Correction: "25 is a grid cell (1–25 grid) and `BULL (50)` is a separate button".

3. **ADR-0009 D1, line ~35 — "All modes share one design system and one rules engine (`useDartTurn`)":** the numeric 3 DARTS pad does not use `useDartTurn` (its rules live in `NumberPad.tsx` + the reducer); only the two per-dart modes share the hook. Impact: overstatement in a durable record. Correction: "the two per-dart modes share one rules engine (`useDartTurn`); 3 DARTS keeps its existing reducer-driven behavior".

4. **ADR-0009 D6, line ~58 — "no data loss" on BOARD → 1 DART fallback:** in-progress turn darts are local pad state and are lost when the pad unmounts on mode switch; only match state is preserved. Impact: the claim is only true for match state. Correction: "no match-state loss" or drop the phrase.

5. **docs/10-system-overview.md:54 — "bust үед бодит шидсэн дартны тоог бүртгэнэ":** true only for the per-dart modes; numeric 3 DARTS mode still records 3 darts on bust (`NumberPad.tsx:64`). Impact: slight overgeneralization at overview level. Correction: optionally qualify as per-dart modes.

6. **ADR-0009 — missing trailing newline at end of file.** Impact: cosmetic; repo files end with a newline. Correction: add trailing newline.

## Verdict

APPROVED_WITH_NOTES — the ADR and system overview are substantively accurate, complete, in-repo-format, and in scope; all verification commands pass. The LOW findings are wording-level inaccuracies in a durable record and are recommended (not required) to be corrected in a follow-up docs commit.

### `reports\T7.md`

# T7 — Durable documentation (ADR-0009 + system overview)

- **Workflow:** WF-20260817-104302-multi-score-input
- **Status:** Complete
- **Date:** 2026-08-18

## Objective

Record the multi-mode score input decision as ADR-0009 and update the system overview to
mention `ScoreInputPanel` and the three input modes. Docs-only task — no code changes.

## Files created / modified

- **Created:** `docs/decisions/ADR-0009-multi-score-input.md`
- **Modified:** `docs/10-system-overview.md` (added "Score Entry" section after "Game Modes")

## Implementation summary

### ADR-0009

Follows the repo ADR format (frontmatter-style Status/Date bullets, `## Context`,
`## Decisions` with D-numbered bullets, `## Consequences` — per ADR-0007/0008), plus an
`## Alternatives considered` section as required by the task spec. Content:

- **Context:** fixed 3-dart numeric entry; stats always counted 3 darts on bust.
- **Decisions:** D1 three modes (3 DARTS numeric pad default, 1 DART segment selector,
  BOARD touch dartboard ≥768px); D2 multiplier-first interaction; D3 bull rules (25 S/D,
  50 S only, Double+outer bull = 50, no T-bull/D-bull); D4 live per-dart bust/finish;
  D5 bust records actual darts used (reducer change); D6 BOARD hidden below 768px with
  fallback to 1 DART; D7 mode persistence in localStorage
  (`nomad-darts:score-input-mode`).
- **Alternatives considered:** numeric-only single-dart entry — rejected for
  impossible-score risk.
- **Consequences:** reducer semantics change (bust turns record actual `dartsUsed`);
  FinishConfirmation dialog only in numeric mode; new shared pieces (`useDartTurn`,
  `src/lib/dartboard.ts`); implementation commits referenced (b989204, b652e1d, d93d2ff,
  ad79a73, c7a781f, e17e449).

Implementation details verified against source before writing: `STORAGE_KEY =
'nomad-darts:score-input-mode'` and `BOARD_QUERY = '(min-width: 768px)'` in
`ScoreInputPanel.tsx`; component/hook/lib files exist as referenced.

### System overview

`docs/10-system-overview.md` is a 49-line high-level product overview in Mongolian with
**no existing score-entry section** (the plan's instruction "see how the file describes
NumberPad today" assumed a section that does not exist). Added a concise "Score Entry"
section (Mongolian, matching file style) after "Game Modes" describing `ScoreInputPanel`
and the three modes (3 DARTS default, 1 DART segment selector, BOARD ≥768px), plus mode
persistence and actual-darts-on-bust note.

## Verification

| Command | Result |
|---|---|
| `npx tsc --noEmit` | Exit 0 — clean |
| `npm run lint` | Exit 0 — 0 errors, 2 pre-existing warnings in `src/lib/__tests__/dartboard.test.ts` (T2-owned file, unused `R_TRIPLE_OUT`/`R_DOUBLE_IN` imports; not caused by this docs-only change) |

## Commit

- `d0d24743071e85ad2a4097fcb32c1585af330dba` — "docs: add multi-mode score input ADR and system overview update"
- 2 files changed, 77 insertions(+)

## Deviations

- **System overview adaptation:** the plan assumed an existing score-entry section
  describing NumberPad; none exists. Instead of modifying a non-existent section, a new
  "Score Entry" section was added after "Game Modes" (coordinator-confirmed approach).
- ADR includes an `## Alternatives considered` section (required by task spec) which
  ADR-0007/0008 do not have; all other formatting matches the repo convention.
- ADR date set to 2026-08-18 (docs written today); implementation commits span
  2026-08-17/18, reflected in the Status line.

## Acceptance criteria

1. ADR-0009 exists, follows repo format, covers all required sections — **met**.
2. `docs/10-system-overview.md` mentions ScoreInputPanel and the 3 modes — **met**.
3. No code changes; `npx tsc --noEmit` and `npm run lint` clean — **met** (exit 0 both).

## Ready for independent review

Yes.


## Verification Evidence

_No artifacts recorded._

## Final Progress Snapshot

# Workflow Progress — WF-20260817-104302-multi-score-input

- **Objective:** Score entry keyboard: multiple input modes — Single dart, Three darts, Touch (dartboard shown, tap where dart landed); touch board on large screens depending on screen size
- **Status:** `compacting`
- **Current stage:** `completion`
- **Last checkpoint:** `final_summary_written`
- **Next action:** `{"path": "D:\\own\\nomad-darts\\docs\\implementations\\WF-20260817-104302-multi-score-input.md", "type": "write_final_report"}`
- **Updated:** 2026-08-17T20:29:36+00:00

## Task status

- **completed:** T1, T2, T3, T4, T5, T6, T7

## Completion gates

- Integration verification: `passed`
- Documentation updated: `True`
- Final summary written: `True`
- Compaction validated: `True`

Detailed evidence is stored in the workflow's research, tasks, reports, and verification directories.


## Event Timeline

| Time | Stage | Task | Event | Outcome |
|---|---|---|---|---|
| 2026-08-17T10:43:02+00:00 | intake_recovery |  | workflow_initialized | success |
| 2026-08-17T11:12:13+00:00 | intake_recovery |  | decisions | recorded |
| 2026-08-17T11:25:47+00:00 | intake_recovery |  | design | approved |
| 2026-08-17T11:33:03+00:00 | intake_recovery |  | plan | written |
| 2026-08-17T11:33:18+00:00 | intake_recovery |  | plan | written |
| 2026-08-17T11:33:41+00:00 | intake_recovery |  | plan | written |
| 2026-08-17T11:33:48+00:00 | planning |  | checkpoint_reached | success |
| 2026-08-17T11:33:51+00:00 | planning |  | plan | written |
| 2026-08-17T15:36:35+00:00 | execution |  | recovery | verified |
| 2026-08-17T15:36:45+00:00 | planning | T1 | task_state_changed | completed |
| 2026-08-17T15:36:51+00:00 | planning | T2 | task_state_changed | completed |
| 2026-08-17T15:36:53+00:00 | planning | T3 | task_state_changed | completed |
| 2026-08-17T15:37:03+00:00 | planning | T4 | task_state_changed | pending |
| 2026-08-17T15:37:06+00:00 | planning | T5 | task_state_changed | pending |
| 2026-08-17T15:37:08+00:00 | planning | T6 | task_state_changed | pending |
| 2026-08-17T15:37:11+00:00 | planning | T7 | task_state_changed | pending |
| 2026-08-17T15:37:19+00:00 | execution |  | checkpoint_reached | success |
| 2026-08-17T15:38:39+00:00 | execution | T4 | task_state_changed | in_progress |
| 2026-08-17T15:49:02+00:00 | execution | T4 | task_state_changed | in_review |
| 2026-08-17T15:49:07+00:00 | execution | T4 | task_verification | passed |
| 2026-08-17T16:00:01+00:00 | execution | T4 | task_state_changed | completed |
| 2026-08-17T16:00:06+00:00 | execution | T4 | task_review | approved |
| 2026-08-17T16:00:09+00:00 | execution | T5 | task_state_changed | in_progress |
| 2026-08-17T16:10:58+00:00 | execution | T5 | task_state_changed | in_review |
| 2026-08-17T16:11:03+00:00 | execution | T5 | task_verification | passed |
| 2026-08-17T16:20:28+00:00 | execution | T5 | task_state_changed | completed |
| 2026-08-17T16:20:30+00:00 | execution | T5 | task_review | approved |
| 2026-08-17T16:20:33+00:00 | execution | T6 | task_state_changed | in_progress |
| 2026-08-17T16:31:16+00:00 | execution | T6 | task_state_changed | in_review |
| 2026-08-17T16:31:18+00:00 | execution | T6 | task_verification | passed |
| 2026-08-17T20:17:11+00:00 | execution | T6 | task_state_changed | completed |
| 2026-08-17T20:17:17+00:00 | execution | T6 | task_review | approved |
| 2026-08-17T20:17:22+00:00 | execution | T7 | task_state_changed | in_progress |
| 2026-08-17T20:20:44+00:00 | execution | T7 | task_state_changed | in_review |
| 2026-08-17T20:20:49+00:00 | execution | T7 | task_verification | passed |
| 2026-08-17T20:25:16+00:00 | execution | T7 | task_state_changed | completed |
| 2026-08-17T20:25:21+00:00 | execution | T7 | task_review | approved |
| 2026-08-17T20:28:15+00:00 | integration |  | checkpoint_reached | success |
| 2026-08-17T20:28:21+00:00 | integration |  | integration_verification | passed |
| 2026-08-17T20:28:45+00:00 | completion |  | checkpoint_reached | success |
| 2026-08-17T20:28:50+00:00 | completion |  | final_summary | written |
| 2026-08-17T20:29:25+00:00 | integration |  | checkpoint_reached | success |
| 2026-08-17T20:29:28+00:00 | completion |  | checkpoint_reached | success |
| 2026-08-17T20:29:30+00:00 | completion |  | checkpoint_reached | success |
| 2026-08-17T20:29:36+00:00 | completion |  | compaction_validated | success |

## Retention

Durable system documentation, architecture decisions, source code, tests, and this final report remain permanent. Temporary workflow artifacts were eligible for cleanup only after this report was safely written and validated.
