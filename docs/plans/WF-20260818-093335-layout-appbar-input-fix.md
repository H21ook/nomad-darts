# Implementation Plan — WF-20260818-093335-layout-appbar-input-fix

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the match page layout (scoreboard directly under AppBar, keyboard directly under scoreboard, no gaps) and move the keyboard mode switcher into the AppBar's right slot as a Settings icon button with a popover menu (3 DARTS / 1 DART / BOARD).

**Spec:** `docs/superpowers/specs/2026-08-18-match-layout-appbar-settings-design.md` (user-approved).

**Root cause (verified):** `ScoreInputPanel`'s root div (`flex flex-col gap-2`) has no height class → pads' `h-full` resolves to `auto` → cluster shrinks to content height, pinned by `justify-end` → empty band under AppBar, clipping on short screens. The mode-tab row + `gap-2` insert ~30–46px between scoreboard and pad.

## Global Constraints

- Path alias `@/` → `src/`.
- Test env: default `node`; component tests opt into jsdom with `// @vitest-environment jsdom` as the FIRST line. Never put `vi.mock` in `src/test/setup.ts`.
- Verification commands (every task, before claiming done): `npx tsc --noEmit`, `npm run lint`, `npm run test`.
- Design system: dark theme, zinc-900 surfaces, `border-white/5`, `rounded-2xl`; cyan = active, red = danger; buttons react on `pointerdown`; `select-none touch-none`; `navigator.vibrate` on press (stubbed in setup); `font-black`/`font-mono`; Tabler icons; framer-motion for overlays.
- Do NOT change: `ScoreBoard.tsx`, `NumberPad.tsx` root classes (`p-2 gap-2 bg-black`), submit `button.bg-cyan-500`, AppBar back `aria-label="Go back"`, `SingleDartPad.tsx`, `DartBoardPad.tsx`, `useDartTurn.ts`, `matchSlice.ts`, `app-bar.tsx`.
- No new npm dependencies.
- Commit after every task with the given message.

---

### Task 1: `useScoreInputMode` hook

**Files:**
- Create: `src/hooks/useScoreInputMode.ts`
- Test: `src/hooks/__tests__/useScoreInputMode.test.tsx` (jsdom docblock — needs matchMedia + localStorage mocks)

**Interfaces (locked — T3/T4 import exactly these):**

```ts
// Re-uses ScoreInputMode from '@/components/scoring/ScoreInputPanel' (type-only import).
export function useScoreInputMode(): {
  mode: ScoreInputMode;         // 'three' | 'single' | 'board'
  setMode: (m: ScoreInputMode) => void;
  isLarge: boolean;             // matchMedia('(min-width: 768px)').matches, live
};
```

- STORAGE_KEY stays `nomad-darts:score-input-mode` (existing persisted values must survive).
- Initial mode (lazy useState initializer, SSR-guarded): localStorage value validated against `three|single|board`; invalid → `'three'`; `'board'` honored only when `isLarge` else `'single'`.
- `setMode` updates state AND persists to localStorage.
- Live large-screen tracking: `window.matchMedia('(min-width: 768px)')` + `change` listener + `resize` listener (belt and braces, same as today's `useIsLargeScreen` — re-query on event, never read captured `mql.matches`).
- Render-time adjustment: `mode === 'board' && !isLarge` → `setMode('single')` (converges in one re-render; keeps `react-hooks/set-state-in-effect` happy).
- Tests (jsdom): default 'three' when storage empty; restores 'single' from storage; invalid storage → 'three'; stored 'board' on small screen → 'single'; setMode persists to localStorage; screen shrinks below 768px while 'board' → falls back to 'single'.

- [ ] **Step 1:** Write `src/hooks/__tests__/useScoreInputMode.test.tsx` (FIRST LINE `// @vitest-environment jsdom`; `afterEach(cleanup)` + jest-dom per repo convention; stub `window.matchMedia` and `localStorage`).
- [ ] **Step 2:** Run test → FAIL (module not found).
- [ ] **Step 3:** Write `src/hooks/useScoreInputMode.ts`.
- [ ] **Step 4:** Run test → PASS. Then `npx tsc --noEmit`, `npm run lint` — clean.
- [ ] **Step 5:** Commit:
```bash
git add src/hooks/useScoreInputMode.ts src/hooks/__tests__/useScoreInputMode.test.tsx
git commit -m "feat(darts): add useScoreInputMode hook (mode state + large-screen guard)"
```

---

### Task 2: ScoreInputPanel — controlled, tabs removed, height-chain fixed

**Files:**
- Modify: `src/components/scoring/ScoreInputPanel.tsx`
- Rewrite: `src/components/__tests__/scoreInputPanel.test.tsx`

**Interfaces (locked):**

```tsx
export type ScoreInputMode = 'three' | 'single' | 'board';  // KEEP this export (hook imports it)

interface ScoreInputPanelProps {
  mode: ScoreInputMode;                 // NEW — controlled
  onSubmit: (score: number, dartsUsed?: number, isBust?: boolean) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  currentScore: number;
  checkout?: 'double' | 'straight';
  className?: string;
}
```

- Remove: `useIsLargeScreen`, tab row JSX, `selectMode`, `useCallback` import if unused.
- Root div: `cn('flex flex-col h-full', className)` — **no `gap-2`** (the "2-unit gap" between scoreboard and keyboard).
- Render: `mode === 'three'` → `<NumberPad {...padProps} onUndo onCanUndo>`; `'single'` → `<SingleDartPad {...padProps}>`; `'board'` → `<DartBoardPad {...padProps}>`.
- Tests (rewrite `scoreInputPanel.test.tsx`, jsdom): renders NumberPad for 'three' (`/BUST/` button present); SingleDartPad for 'single' (segment button '20' present); DartBoardPad for 'board' (`role="img"` with Dartboard label present); panel renders no tab buttons (`queryByRole('button', { name: /1 DART/ })` null); NumberPad root keeps `p-2 gap-2 bg-black`.
- No matchMedia/localStorage stubbing needed in panel tests anymore (mode comes via props).

- [ ] **Step 1:** Rewrite `src/components/__tests__/scoreInputPanel.test.tsx` (FIRST LINE `// @vitest-environment jsdom`; `afterEach(cleanup)` + jest-dom per repo convention).
- [ ] **Step 2:** Run test → FAIL (new props required).
- [ ] **Step 3:** Refactor `ScoreInputPanel.tsx` per the interfaces above.
- [ ] **Step 4:** Run test → PASS. Then `npx tsc --noEmit`, `npm run lint` — clean.
- [ ] **Step 5:** Commit:
```bash
git add src/components/scoring/ScoreInputPanel.tsx src/components/__tests__/scoreInputPanel.test.tsx
git commit -m "fix(darts): make ScoreInputPanel controlled, remove tab row, restore pad height"
```

---

### Task 3: ScoreInputModeMenu — Settings button + popover

**Files:**
- Create: `src/components/scoring/ScoreInputModeMenu.tsx`
- Test: `src/components/__tests__/scoreInputModeMenu.test.tsx` (jsdom docblock)

**Interfaces (locked):**

```tsx
interface ScoreInputModeMenuProps {
  mode: ScoreInputMode;                 // current mode
  onSelect: (m: ScoreInputMode) => void; // called when a mode is chosen (parent persists)
  isLarge: boolean;                     // ≥768px — BOARD option only when true
}
export default function ScoreInputModeMenu(props: ScoreInputModeMenuProps): JSX.Element;
```

- Button: `IconSettings` (size 20), `aria-label="Settings"`, mirror AppBar back-button styling (`w-14 h-14 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors p-2`), `onPointerDown` + `navigator.vibrate(5)`.
- Popover (own open state): rendered when open, positioned absolutely below the button, right-aligned (`absolute right-0 top-full mt-2` inside a `relative` wrapper), `w-40`, `bg-zinc-900 border border-white/10 rounded-2xl p-2 shadow-xl`, framer-motion AnimatePresence (fade + slight scale, `initial={{ opacity: 0, scale: 0.95 }}`).
- Menu items: `3 DARTS`, `1 DART`, `BOARD` (BOARD only when `isLarge`); full-width buttons `py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors`; active: `bg-cyan-500/10 border-cyan-500/20 text-cyan-400` + `IconCheck` size 14 inline; inactive: `text-zinc-500 hover:bg-white/5 hover:text-white`.
- Dismissal: transparent backdrop `fixed inset-0 z-40` (press closes, no vibrate), Escape key, or selecting a mode (select calls `onSelect` then closes).
- Z-order: popover content `z-50` (within AppBar stacking context); backdrop `z-40`.
- Tests: button renders with aria-label "Settings"; popover hidden by default; press opens popover with 3 items (or 2 when `isLarge=false`); active mode marked (check icon present on the active item); clicking an item calls `onSelect` and closes; backdrop press closes; Escape closes. Accessible names must not collide with matchFlow selectors ("Go back", "Undo", "Exit", digits, "BUST"…).

- [ ] **Step 1:** Write `src/components/__tests__/scoreInputModeMenu.test.tsx` (FIRST LINE `// @vitest-environment jsdom`; `afterEach(cleanup)` + jest-dom per repo convention).
- [ ] **Step 2:** Run test → FAIL (module not found).
- [ ] **Step 3:** Write `src/components/scoring/ScoreInputModeMenu.tsx`.
- [ ] **Step 4:** Run test → PASS. Then `npx tsc --noEmit`, `npm run lint` — clean.
- [ ] **Step 5:** Commit:
```bash
git add src/components/scoring/ScoreInputModeMenu.tsx src/components/__tests__/scoreInputModeMenu.test.tsx
git commit -m "feat(darts): add appbar settings popover for score input modes"
```

---

### Task 4: Match page wiring

**Files:**
- Modify: `src/app/match/page.tsx`
- Verify: `src/components/__tests__/matchFlow.test.tsx` stays green (no changes expected)

**Interfaces (locked — consumes T1, T2, T3):**

```tsx
const { mode, setMode, isLarge } = useScoreInputMode();
...
<AppBar
  title={...}
  onBack={() => setShowExitDialog(true)}
  backButtonIcon={<IconX size={18} />}
  actions={<ScoreInputModeMenu mode={mode} onSelect={setMode} isLarge={isLarge} />}
/>
...
<ScoreInputPanel
  mode={mode}
  onSubmit={...}
  currentScore={...}
  checkout={...}
  onUndo={...}
  canUndo={canUndo}
/>
```

- Layout classes of the page and ScoreBoard stay untouched.
- **Tighten `mode` to required (T2 review follow-up):** T2 made `mode?: ScoreInputMode` optional (default `'three'`) so tsc stays green before wiring. Now that `page.tsx` passes `mode` explicitly, change the prop back to `mode: ScoreInputMode` (required) in `ScoreInputPanel.tsx` and re-run tsc/lint/tests.
- `matchFlow.test.tsx` must pass unchanged: NumberPad root `div.p-2.gap-2.bg-black`, submit `button.bg-cyan-500`, back `aria-label="Go back"` all preserved (they are — the panel no longer wraps with gap-2 but NumberPad itself keeps its classes).

- [ ] **Step 1:** Wire the hook, AppBar actions, and panel `mode` prop in `src/app/match/page.tsx`.
- [ ] **Step 2:** Run `npm run test` — full suite green (including matchFlow 17/17).
- [ ] **Step 3:** `npx tsc --noEmit`, `npm run lint` — clean.
- [ ] **Step 4:** Commit:
```bash
git add src/app/match/page.tsx
git commit -m "feat(darts): wire appbar settings menu and controlled input panel into match page"
```

---

### Task 5: Durable documentation

**Files:**
- Create: `docs/decisions/ADR-0010-score-input-mode-menu.md`
- Modify: `docs/10-system-overview.md` (only if the score-entry section needs the switcher mention — a one-line update)

**Interfaces:** none (docs only).

- ADR-0010 (follow repo format — see ADR-0009): context (layout break from panel wrapper height chain + tab-row gap; mode switching UX), decision (controlled ScoreInputPanel + `useScoreInputMode` hook + AppBar Settings popover; height-chain fix; tabs removed; BOARD ≥768px rule preserved in hook), alternatives (keep tabs in panel — rejected: gap + layout; cycle-on-tap — rejected: accidental skips; Redux uiSlice — rejected: overkill), consequences (panel API changed to controlled; scoreInputPanel tests rewritten; localStorage key unchanged; no ScoreBoard/NumberPad changes).

- [ ] **Step 1:** Write the ADR.
- [ ] **Step 2:** Update system overview if needed.
- [ ] **Step 3:** Verify `npx tsc --noEmit`, `npm run lint` still clean.
- [ ] **Step 4:** Commit:
```bash
git add docs/decisions/ADR-0010-score-input-mode-menu.md docs/10-system-overview.md
git commit -m "docs: add score input mode menu ADR and system overview update"
```

---

## Integration verification (coordinator, after all tasks)

1. `npx tsc --noEmit` — clean
2. `npm run lint` — clean
3. `npm run test` — full suite green (297 existing + new tests)
4. Optional smoke: `npm run dev`, open a match on a tall viewport — scoreboard directly under AppBar, keyboard fills remaining height; on a narrow viewport BOARD is hidden in the menu; switching modes via the Settings popover works and persists.

## Self-review notes

- Spec coverage: height fix → T2; tabs removal → T2; hook → T1; AppBar menu → T3; wiring → T4; docs → T5; acceptance criteria → T1/T2/T3/T4 tests.
- Type consistency: `ScoreInputMode` stays exported from ScoreInputPanel (T2 keeps the export); hook + menu + page import it from there.
- Placeholders: none — every step contains the full approach; implementers follow the spec's design system details.