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

- Dev and build use webpack explicitly (`next dev --webpack`, `next build --webpack`).
- `pnpm build` is the ultimate correctness check — run it after non-trivial changes.

## Architecture & Key Files

### Routing (App Router)

- `src/app/page.tsx` — landing page (guest quick start, login/sign-up links).
- `src/app/match/setup/page.tsx` — match configuration (score, format, players).
- `src/app/match/page.tsx` — live scoring screen (scoreboard + number pad).
- `src/app/match/finished/page.tsx` — result screen; redirects home if match not finished.
- `src/app/auth/login|sign-up/page.tsx` — auth pages (Supabase).
- `src/app/dashboard/page.tsx` — reads the `matches` table from Supabase.
- `src/app/internal/*` — server routes. Auth routes are NOT wired to a real backend yet (they use stubbed tokens). Do not confuse these with Supabase auth, which is the live path.
- `src/app/proxy.ts` — session middleware that calls `updateSession` (`src/lib/supabase/proxy.ts`). It redirects unauthenticated users to `/login`, but the actual login page is `/auth/login` — keep this consistent if you touch it.

### State management

- `src/lib/redux/store.ts` — Redux store with `redux-persist`; only the `match` slice is persisted (`whitelist`).
- `src/lib/redux/matchSlice.ts` — all match actions: `startMatch`, `submitTurn`, `undo`, `startNextLeg`, `rematch`. **This is the core game logic.**
- `src/lib/redux/utils.ts` — pure helpers: leg/set creation, bust/checkout handling, `handleLegWin`, `finishSet`, `finishMatch`, snapshotting.
- `src/lib/redux/authSlice.ts` — stores the Supabase access token (slice name is `"counter"`, leave as-is).

### Game rules (matchSlice/utils)

- Bust: score overshoots 0, or lands on 1 with Double Out.
- Leg win sets status to `leg_finished`; the transition screen dispatches `startNextLeg`.
- Match ends via `finishSet` → `finishMatch` when a player reaches `firstToSets` (or `firstToLegs` with sets disabled).
- `undo` restores the last snapshot; snapshots are capped at 20.
- Turning order: first player of each leg alternates by completed-set count / legs-in-set — do not change without understanding `startNextLeg`.

### Data & types

- `src/types/darts.ts` — `Throw`, `Turn`, `LegType`, `SetType`, `Match`, `MatchState`. The hierarchical model is Throw → Turn → Leg → Set → Match.
- `src/types/index.ts` — `CustomResponse<T>` union used by the fetcher.
- `src/types/auth-types.ts` — token response shapes.

### Data fetching & auth

- `src/lib/fetcher/` — `coreFetcher` (base), `clientFetcher` (adds 401 refresh + redirect), `serverFetcher`.
- `src/lib/client-requests/index.ts` — deduped `refreshAccessToken`.
- `src/lib/supabase/` — `client.ts` (browser), `server.ts` (server components), `proxy.ts` (middleware). All read `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `src/lib/tokens.ts` — httpOnly cookie access/refresh token helpers (used by the stub auth flow).

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
8. `MatchFinished.tsx` and score sections assume exactly 2 players (`players[0]`, `players[1]`); `PlayerList` supports more. If you extend player count, update those assumptions.
9. **Bump `version` in `package.json` before every push to `main`** — the app version shown in the footer reads `NEXT_PUBLIC_APP_VERSION`, which `next.config.ts` derives from `package.json` at build time. Bump as a separate `chore(release): bump version to x.y.zz` commit.
