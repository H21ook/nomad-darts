# AGENT.md

Guidance for AI coding agents working in this repository.

## Project Overview

NOMADDARTS is a mobile-first darts (X01) scoreboard web app. Next.js 16 (App Router) + React 19 + TypeScript, with Redux Toolkit for state, `redux-persist` for local persistence, Supabase for auth/data, Tailwind CSS v4 + shadcn/ui for styling, and `framer-motion` for animation.

## Commands

Always run these to verify work before finishing:

```bash
# Install dependencies
pnpm install

# Typecheck
npx tsc --noEmit

# Lint (target: no errors; warnings should be removed for new code)
pnpm lint

# Build
pnpm build
```

- `dev` runs plain `next dev`; `build` uses `next build --webpack` explicitly.
- `pnpm build` is the ultimate correctness check — run it after non-trivial changes.

## Architecture & Key Files

### Routing (App Router)

- `src/app/page.tsx` — landing page (guest quick start, login/sign-up links).
- `src/app/match/setup/page.tsx` — match configuration (score, format, players).
- `src/app/match/page.tsx` — live scoring screen (scoreboard + number pad).
- `src/app/match/stats/page.tsx` — full statistics page (per-player PPR, darts, checkout).
- `src/app/match/finished/page.tsx` — result screen; redirects home if match not finished.
- `src/app/auth/login|sign-up/page.tsx` — auth pages (Supabase).
- `src/app/dashboard/page.tsx` — reads the `matches` table from Supabase.
- `src/app/internal/*` — server routes. Only a health check route remains; the stub auth routes were removed. Supabase auth is the live path.
- `src/proxy.ts` — session middleware that calls `updateSession` (`src/lib/supabase/proxy.ts`). It protects `/dashboard/:path*` and `/match/:path*` and redirects unauthenticated users to `/auth/login` — keep the redirect path consistent if you touch it.

### State management

- `src/lib/redux/store.ts` — Redux store with `redux-persist`; only the `match` and `matchHistory` slices are persisted (`whitelist`).
- `src/lib/redux/matchSlice.ts` — all match actions: `startMatch`, `submitTurn`, `undo`, `startNextLeg`, `rematch`. **This is the core game logic.**
- `src/lib/redux/utils.ts` — pure helpers: leg/set creation, bust/checkout handling, `handleLegWin`, `finishSet`, `finishMatch`, snapshotting.
- `src/lib/redux/authSlice.ts` — stores the Supabase access token (slice name is `"auth"`).
- `src/lib/redux/matchHistorySlice.ts` — local (guest) match history persisted in the browser (slice name is `"matchHistory"`).

### Game rules (matchSlice/utils)

- Bust: score overshoots 0, or lands on 1 with Double Out.
- Leg win sets status to `leg_finished`; the transition screen dispatches `startNextLeg`.
- Match ends via `finishSet` → `finishMatch` when a player reaches `firstToSets` (or `firstToLegs` with sets disabled).
- `undo` restores the last snapshot; snapshots are capped at 20.
- Turning order: first player of each leg alternates by completed-set count / legs-in-set — do not change without understanding `startNextLeg`.

### Data & types

- `src/types/darts.ts` — `Throw`, `Turn`, `LegType`, `SetType`, `Match`, `MatchState`. The hierarchical model is Throw → Turn → Leg → Set → Match.

### Data fetching & auth

- `src/lib/supabase/` — `client.ts` (browser), `server.ts` (server components), `proxy.ts` (middleware). All read `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

### UI conventions

- All shadcn/ui components live in `src/components/ui/`. Use them; do not hand-roll primitives.
- Dark theme only. Design tokens are CSS variables in `src/app/globals.css` (charcoal `#0D0D0D` + electric cyan primary).
- Icons come from `@tabler/icons-react` (import as `Icon*`).
- Styling helper: `cn()` from `src/lib/utils.ts`.
- Player colors: use `PLAYER_COLORS` / `getRandomPlayerColor()` from `src/lib/utils.ts`.
- Scoring screens are `touch-none select-none` and use `onPointerDown` for low-latency input.

## Conventions & Rules

1. Never hardcode secrets or real credentials. Env access via `process.env.NEXT_PUBLIC_*` only.
2. Follow existing naming (PascalCase components, camelCase functions, `kebab-case` files).
3. Keep client components lean; prefer server components unless interactivity/state is required.
4. Do not introduce new runtime deps without checking they are truly needed.
5. Remove debug logging (`console.log`, `console.trace`) from new code.
6. When changing game logic in `matchSlice.ts`, verify against the typecheck, lint, and build.
7. UI copy is currently English with some Mongolian developer comments in `matchSlice.ts`/scoring components — keep comments consistent with their existing language where you edit them.
8. Scoring components (`ScoreBoard`, `MatchFinished`, `LegTransition`, `StatsPage`) map over `players` and are N-player safe — no hardcoded `players[0]`/`players[1]` assumptions. Keep it that way when extending player count.
9. **Bump `version` in `package.json` before every push to `main`** — the app version shown in the footer reads `NEXT_PUBLIC_APP_VERSION`, which `next.config.ts` derives from `package.json` at build time. Procedure: (1) bump `version` to the next semver value (never decrease it), (2) commit ONLY `package.json` with message `chore(release): bump version to x.y.zz`, (3) then push to `main`. Do not fold the bump into feature commits.
