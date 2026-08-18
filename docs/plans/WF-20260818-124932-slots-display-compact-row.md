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
