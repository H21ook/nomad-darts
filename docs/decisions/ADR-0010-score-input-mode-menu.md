# ADR-0010 — Score input mode menu: controlled panel, `useScoreInputMode` hook, AppBar Settings popover

- **Status:** Accepted (implemented 2026-08-18, workflow WF-20260818-093335-layout-appbar-input-fix)
- **Date:** 2026-08-18

## Context

ADR-0009 introduced multi-mode score entry as a `ScoreInputPanel` with three in-panel
tabs (3 DARTS / 1 DART / BOARD) and a BOARD guard for screens ≥768px. After that
refactor (commit e17e449) the match page layout broke:

1. **Empty band under the AppBar:** the panel's root div (`flex flex-col gap-2`) has
   no height class, so the pads' `h-full` resolves to `auto` against an auto-height
   parent. The scoreboard+pad cluster shrinks to content height and is pinned to the
   bottom by `justify-end`, leaving a large empty band between the AppBar and the
   scoreboard. On short screens the pad overflows and is clipped by `overflow-hidden`.
2. **Gap between scoreboard and keyboard:** the mode-tab row plus the panel's `gap-2`
   insert ~30–46px between the scoreboard and the pad.
3. **Mode-switching UX:** the switcher lived inside the panel as the tab row — the
   source of the vertical gap — and the user wanted the switching action moved to the
   AppBar's right slot behind a Settings icon.

## Decisions

- **D1 — Controlled ScoreInputPanel (commit 0fbcac5):** the panel is now controlled:
  it takes a required `mode: ScoreInputMode` prop and renders exactly one pad —
  `'three'` → `NumberPad`, `'single'` → `SingleDartPad`, `'board'` → `DartBoardPad`.
  The tab row, `useIsLargeScreen` usage, and `selectMode` are removed; the
  `ScoreInputMode` type stays exported from `ScoreInputPanel` (the hook and the menu
  import it from there).
- **D2 — `useScoreInputMode` hook (commit 571c4ac):** owns the mode state, shared by
  the match page (AppBar menu) and the panel (rendering). Initial value is read lazily
  from localStorage under the unchanged key `nomad-darts:score-input-mode`, validated
  against `three|single|board` (invalid → `'three'`), with an SSR guard (`'three'`
  when `window` is undefined). `'board'` is honored only when
  `matchMedia('(min-width: 768px)')` matches, otherwise the stored value resolves to
  `'single'`. `setMode` updates state AND persists to localStorage. Live large-screen
  tracking re-queries `window.matchMedia` on every `change`/`resize` event (never
  reads a captured `mql.matches`), and a render-time adjustment
  (`mode === 'board' && !isLarge` → `setMode('single')`) converges in one re-render so
  BOARD is never rendered on small screens even when persisted.
- **D3 — AppBar Settings popover (commits 373c737, ef2a5d7, 17f420e):** a new
  `ScoreInputModeMenu` component renders into the match page AppBar's right `actions`
  slot as an `IconSettings` button (`aria-label="Settings"`, mirroring the back-button
  styling). Pressing it opens a right-aligned popover with **3 DARTS** / **1 DART** /
  **BOARD** items (BOARD rendered only when `isLarge`); the active mode is highlighted
  cyan with an inline check icon. The popover closes on backdrop press, Escape, or
  selecting a mode (selection calls `onSelect`, the parent persists). The Settings
  press vibrates via `navigator.vibrate(5)` guarded with `if (navigator.vibrate)` so
  Safari (no vibrate API) does not throw.
- **D4 — Height-chain fix (commit 0fbcac5):** the panel root becomes
  `cn('flex flex-col h-full', className)` with **no `gap-2`**. The pad is again a
  direct flex child with `h-full`, so it fills all remaining height below the
  scoreboard: the scoreboard sits directly under the AppBar, the keyboard attaches
  directly below it, and nothing is clipped on short screens. The match page layout
  structure is unchanged.
- **D5 — Unchanged pieces:** `ScoreBoard`, `NumberPad` (root classes
  `p-2 gap-2 bg-black`, submit button), `SingleDartPad`, `DartBoardPad`, `useDartTurn`,
  and `matchSlice` are untouched. The BOARD ≥768px rule is preserved, moved from the
  panel into the hook.

## Alternatives considered

- **Keep the tabs in the panel:** rejected — the tab row plus `gap-2` are the source
  of the gap between scoreboard and keyboard, and the panel wrapper height chain is
  the source of the layout break; keeping them means keeping both defects.
- **Cycle-on-tap (tap the mode label to cycle):** rejected — cycling through three
  modes risks accidental skips (two taps to get back to the starting mode) and gives
  no overview of the available modes; a popover shows all options at once.
- **Redux `uiSlice` for mode state:** rejected — overkill for a single piece of UI
  state; a localStorage-backed hook is simpler and keeps the state co-located with
  the components that use it.

## Consequences

- `ScoreInputPanel`'s API changed to controlled: `mode` is now a required prop (was
  an internal state with tabs); any consumer must pass it via `useScoreInputMode`.
- `scoreInputPanel.test.tsx` was rewritten for the controlled API (renders the right
  pad per mode, no tab buttons); new tests added for the hook
  (`useScoreInputMode.test.tsx`) and the menu (`scoreInputModeMenu.test.tsx`). Panel
  tests no longer need matchMedia/localStorage stubbing (mode arrives via props).
- The localStorage key is unchanged (`nomad-darts:score-input-mode`), so existing
  persisted preferences survive the migration.
- Mode switching UX moved from the panel's tab row to the AppBar right slot; the
  match page wires `useScoreInputMode` + `ScoreInputModeMenu` + the panel's `mode`
  prop.
- `navigator.vibrate` is guarded for Safari in the Settings button.
- No changes to ScoreBoard, NumberPad, SingleDartPad, DartBoardPad, useDartTurn, or
  matchSlice.
- Implemented in commits 571c4ac (useScoreInputMode hook), 0fbcac5 (controlled
  ScoreInputPanel + height fix), 373c737 (ScoreInputModeMenu), ef2a5d7 (vibrate
  guard), 17f420e (match page wiring).
