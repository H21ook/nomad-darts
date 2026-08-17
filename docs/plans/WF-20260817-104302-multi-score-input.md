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

  // New turn (currentScore changed — after a submit or an external undo): clear.
  const scoreRef = useRef(currentScore);
  useEffect(() => {
    if (scoreRef.current !== currentScore) {
      scoreRef.current = currentScore;
      setDarts([]);
      setLastOutcome(null);
    }
  }, [currentScore]);

  const addDart = useCallback((segment: number, multiplier: Multiplier) => {
    const points = scoreDart(segment, multiplier);
    setDarts((prev) => {
      const next = [...prev, { segment, multiplier, points }];
      const status = resolveTurnStatus(next, scoreRef.current, checkout);

      if (status === 'bust') {
        setLastOutcome('bust');
        onSubmitRef.current(0, next.length, true);
        return [];
      }
      if (status === 'finish') {
        const total = next.reduce((sum, d) => sum + d.points, 0);
        setLastOutcome('finish');
        onSubmitRef.current(total, next.length, false);
        return [];
      }
      if (next.length === 3) {
        const total = next.reduce((sum, d) => sum + d.points, 0);
        setLastOutcome('submitted');
        onSubmitRef.current(total, 3, false);
        return [];
      }
      setLastOutcome('added');
      return next;
    });
    return lastOutcome;
  }, [checkout, lastOutcome]);

  const undoDart = useCallback(() => {
    setDarts((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
    setLastOutcome(null);
  }, []);

  const total = darts.reduce((sum, d) => sum + d.points, 0);

  return { darts, total, lastOutcome, addDart, undoDart };
}
```

> Note: the returned `lastOutcome` inside `addDart` is stale by design — component code reads `lastOutcome` from the render cycle after state settles. Keep the `return lastOutcome;` line or drop it; the hook's contract is `lastOutcome` in state.

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
