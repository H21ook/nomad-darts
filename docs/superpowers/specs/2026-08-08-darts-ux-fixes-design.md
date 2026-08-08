# Darts UX Fixes — Design (approved 2026-08-08)

## Decisions (user-approved)
1. **Wizard skip fix**: remove `#order` hash history hack; use `router.replace('/match/setup?step=2')` + searchParams. Wizard always starts at step 1 on fresh navigation.
2. **Darts row**: it is a per-turn darts-used selector (1/2/3, default 3); selecting 2 records 2 darts for the turn (affects averages). Label clarified to "Darts used"; now also drives the FINISH button's darts count.
3. **Score page header**: replace custom thin header with shared `AppBar` (X button opens exit dialog).
4. **Exit dialog**: restyle to match `FinishConfirmation` design language (framer-motion overlay, zinc-900 rounded-3xl, big colored buttons).
5. **Not double bug**: "Not double"/Cancel must clear the pending input (value/displayMode/dartsUsed).
6. **FINISH button**: submits directly as a double finish (no Double/Not-double question), using the Darts-row count. Number-pad exact-score entry still shows the dialog.
7. **Undo button**: zinc/white styling, not red.
8. **Match result back**: back from result page → home (replace, no bounce loop); browser back from finished → home.
9. **Match result stats**: per-player PPR, avg darts/leg, avg score/turn, 100+ %, checkout % — computed via shared `src/lib/stats.ts`; replace hardcoded "32%" and fake date.

## Scope
4 implementation tasks (wizard, match page, number pad, stats). No schema changes, no new deps.
