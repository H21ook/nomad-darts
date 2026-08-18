# Design — Match Layout Fix + AppBar Settings Mode Switcher

- **Date:** 2026-08-18
- **Status:** Approved by user
- **Workflow:** WF-20260818-093335-layout-appbar-input-fix

## Problem

After the ScoreInputPanel refactor (commit e17e449) the match page layout broke:

1. **Empty band below the AppBar:** `ScoreInputPanel`'s root div has no height class, so the pads' `h-full` (NumberPad/SingleDartPad/DartBoardPad) resolves to `auto` against an auto-height parent. The scoreboard+pad cluster shrinks to content height and is pinned to the bottom by `justify-end`, leaving a large empty band between the AppBar and the scoreboard. On short screens the pad overflows and gets clipped by `overflow-hidden`.
2. **Gap between scoreboard and keyboard:** the mode-switcher tab row (3 DARTS / 1 DART / BOARD) plus the panel's `gap-2` insert ~30–46px between the scoreboard and the pad.
3. **Mode switcher placement:** the tab row inside the panel is the source of the gap and takes vertical space; the user wants the switching action moved to the AppBar's right side behind a Settings icon.

## Requirements (user-confirmed)

- Scoreboard must sit **directly below the AppBar** (no empty band).
- Keyboard must attach **directly below the scoreboard** (no gap in between).
- Scoreboard itself stays **exactly as it is** — no visual/content changes.
- Keyboard mode switching moves to the **AppBar right slot** as a **Settings icon button** opening a **popover menu** with 3 DARTS / 1 DART / BOARD.

## Design

### 1. Height-chain fix (root cause)

- `ScoreInputPanel` root div becomes `flex flex-col h-full` (drop `gap-2`). This restores the pre-refactor behavior where the pad was a direct flex child with `h-full`: the pad now fills all remaining height below the scoreboard, the scoreboard is pushed to the top (directly under the AppBar), and no clipping occurs on short screens.
- The match page structure (`page.tsx:61–77`) stays as-is: `flex-1 flex flex-col justify-end pb-safe overflow-hidden` > ScoreBoard + ScoreInputPanel. With correct heights the scoreboard naturally sits at the top of the flex area.

### 2. Remove the tab row from ScoreInputPanel

- Delete the `tab()` row (ScoreInputPanel.tsx:64–87) and the `isLarge`/`useIsLargeScreen` usage from the panel (moves to the mode hook).
- `ScoreInputPanel` becomes a controlled component:

```tsx
interface ScoreInputPanelProps {
  mode: ScoreInputMode;                 // 'three' | 'single' | 'board'
  onSubmit: (score, dartsUsed?, isBust?) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  currentScore: number;
  checkout?: 'double' | 'straight';
  className?: string;
}
```

- Renders exactly one pad: `mode === 'three'` → NumberPad, `'single'` → SingleDartPad, `'board'` → DartBoardPad. The BOARD guard (`isLarge`) lives in the hook so `mode` is never `'board'` on small screens.

### 3. `useScoreInputMode()` hook (new file `src/hooks/useScoreInputMode.ts`)

Owns the mode state, shared by the page (for the AppBar menu) and the panel (for rendering):

```ts
export function useScoreInputMode(): {
  mode: ScoreInputMode;         // 'three' | 'single' | 'board'
  setMode: (m: ScoreInputMode) => void;
  isLarge: boolean;             // matchMedia('(min-width: 768px)').matches, live
};
```

- Initial value: localStorage `nomad-darts:score-input-mode`, validated (`three|single|board`), fallback `'three'`; `'board'` honored only when `isLarge` (else `'single'`).
- `setMode` persists to localStorage and updates state.
- BOARD unavailable (screen shrinks below 768px) → state falls back to `'single'` (render-time adjustment, same pattern as today).
- SSR guard: `typeof window === 'undefined'` → `'three'`.
- Keeps the same localStorage key so existing persisted preferences survive.

### 4. AppBar Settings button + popover (new file `src/components/scoring/ScoreInputModeMenu.tsx`)

- Rendered into the match page AppBar's `actions` prop (right slot, `w-14`).
- Button: `IconSettings` (size 20–24), mirroring the AppBar back button styling: `w-14 h-14 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors` + `aria-label="Settings"`. `pointerdown` + `navigator.vibrate(5)` per app convention.
- Popover: absolutely positioned under the button (right-aligned), `bg-zinc-900 border border-white/10 rounded-2xl p-2` (design system), framer-motion AnimatePresence fade/scale.
- Menu items (3 DARTS / 1 DART / BOARD): full-width buttons, `font-black uppercase tracking-widest`, active mode highlighted cyan (`bg-cyan-500/10 border-cyan-500/20 text-cyan-400`), inactive `text-zinc-500`; each shows the current mode with a check or highlight.
- BOARD item only rendered when `isLarge`.
- Dismissal: transparent backdrop layer (`fixed inset-0`) that closes the menu on press, Escape key, and selecting a mode.
- Z-index: menu must sit above pads but below dialogs (z-60): use `z-50` within the AppBar's stacking context (AppBar wrapper is `sticky top-0 z-50`).

### 5. Match page wiring (`src/app/match/page.tsx`)

- `const { mode, setMode, isLarge } = useScoreInputMode();`
- `<AppBar actions={<ScoreInputModeMenu mode={mode} onSelect={setMode} isLarge={isLarge} />} … />`
- `<ScoreInputPanel mode={mode} … />` (existing props unchanged).

### 6. Tests

- Rewrite `src/components/__tests__/scoreInputPanel.test.tsx`: panel is now controlled — renders NumberPad for `'three'` (BUST button present), SingleDartPad for `'single'` (segment 20 present), DartBoardPad for `'board'` (board img present). No tabs, no matchMedia stubbing needed for the panel itself (BOARD guard is the hook's job — hook tests cover it).
- New `src/components/__tests__/useScoreInputMode.test.ts(x)`: hook behavior — default 'three', localStorage restore, invalid value → 'three', 'board' on small screen → 'single', fallback when screen shrinks, setMode persists.
- New `src/components/__tests__/scoreInputModeMenu.test.tsx`: Settings button renders, popover opens on press, 3 options shown (BOARD hidden when `isLarge=false`), active mode highlighted, click switches mode (onSelect called), dismiss on outside click / Escape, aria-label="Settings".
- `matchFlow.test.tsx`: must stay green without changes — NumberPad root `div.p-2.gap-2.bg-black`, submit `button.bg-cyan-500`, back `aria-label="Go back"` all preserved. (The panel root no longer carries `gap-2`, but NumberPad itself still does.)

### 7. Docs

- New `docs/decisions/ADR-0010-score-input-mode-menu.md`: context (layout break from panel wrapper, tab row gap, mode switching UX), decision (controlled panel + hook + AppBar Settings popover; height-chain fix; tabs removed), alternatives (keep tabs in panel — rejected for gap/layout; cycle-on-tap — rejected for accidental skips; Redux uiSlice — rejected, overkill for one piece of UI state), consequences (panel API change; scoreInputPanel tests rewritten; localStorage key unchanged).

## Non-goals

- No changes to ScoreBoard, NumberPad (root classes), SingleDartPad, DartBoardPad, useDartTurn, matchSlice.
- No new npm dependencies (framer-motion + Tabler already present).
- Settings menu only on the match page (the only page with a keyboard).

## Acceptance criteria

1. On a tall screen: scoreboard directly under the AppBar, keyboard fills the remaining height, no empty band.
2. On a short screen: nothing clipped; pads shrink correctly (flex behavior preserved).
3. No gap between scoreboard and keyboard (no tab row, no gap-2).
4. Settings icon in the AppBar right slot opens the popover; switching modes changes the pad; BOARD hidden <768px; mode persists across reloads.
5. Full suite green: `npm run test`, `npx tsc --noEmit`, `npm run lint`.