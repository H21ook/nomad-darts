# NOMADDARTS

The simple way to track your score.

A mobile-first darts (X01) scoreboard web app built with Next.js 16, React 19, and Redux Toolkit. It features full match tracking (legs and sets), in-game stats (PPR, darts, checkout), undoing turns, rematches, and optional Supabase-backed accounts and match history.

## Features

- **X01 game modes** with starting scores of 101, 201, 301, or 501
- **Legs & Sets formats** — best-of / first-to-leg and set-based matches
- **Double Out / Straight Out** checkout rules with bust handling
- **Player setup** — add/remove players, drag to reorder, randomize starting order
- **Fast score entry** — touch-optimized number pad with BUST, BULL, and FINISH shortcuts
- **Live stats** — per-leg average, darts thrown, sets/legs won
- **Undo** — snapshot-based, up to 20 turns back
- **Match flow** — animated leg transitions, finish confirmation, confetti victory screen, one-tap rematch
- **Accounts & dashboard** — sign up / sign in with Supabase, view recent matches
- **PWA** — installable, offline-capable (via `next-pwa`)

## Tech Stack

| Area | Tech |
| --- | --- |
| Framework | [Next.js](https://nextjs.org) 16 (App Router, RSC, webpack) |
| UI | [React](https://react.dev) 19, [Tailwind CSS](https://tailwindcss.com) v4, [shadcn/ui](https://ui.shadcn.com) (radix-vega, Tabler icons) |
| State | [Redux Toolkit](https://redux-toolkit.js.org) + `redux-persist` (match persisted locally) |
| Auth / Data | [Supabase](https://supabase.com) (`@supabase/ssr`) |
| Forms | `react-hook-form` + `zod` |
| Animation | `framer-motion`, `canvas-confetti` |
| Charts (planned) | `recharts` |

## Getting Started

### Prerequisites

- Node.js 20+
- `pnpm` (preferred)

### Install & run

```bash
# Install dependencies
pnpm install

# Run the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

> Note: `dev` and `build` scripts use `next --webpack` explicitly.

### Environment variables

Create a `.env.local` with your Supabase project credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Optional, used by the API fetcher for calling backend endpoints:

```env
NEXT_PUBLIC_API_URL=https://your-backend.example.com
```

## Scripts

```bash
pnpm dev        # Start development server (webpack)
pnpm build      # Production build (webpack)
pnpm start      # Start production server
pnpm lint       # Run ESLint
```

## Project Structure

```text
src/
├── app/                    # App Router pages
│   ├── page.tsx            # Landing page
│   ├── proxy.ts            # Session refresh middleware
│   ├── auth/               # Login / sign-up pages
│   ├── dashboard/          # Account dashboard (Supabase)
│   ├── match/              # Setup, live match, finished screens
│   └── internal/           # Server-side auth routes (login/logout/refresh, health)
├── components/
│   ├── forms/              # Login / sign-up forms
│   ├── match/              # Match setup UI, player list (drag-to-reorder)
│   ├── scoring/            # Scoreboard, number pad, leg/match result screens
│   └── ui/                 # shadcn/ui components
├── hooks/
├── lib/
│   ├── client-requests/    # Token refresh helper
│   ├── fetcher/            # Typed API fetchers (client/server/core)
│   ├── redux/              # Redux store, auth & match slices, match logic utils
│   ├── schema/             # Zod schemas for forms
│   ├── supabase/           # Browser/server/proxy clients
│   └── utils.ts            # cn(), player colors, checkout helpers
├── providers/              # Redux provider + persist gate
└── types/                  # Shared TypeScript types (darts, auth)
```

## Match Model

The match state is stored in Redux and persisted to `localStorage`:

- **Throw** — a single dart (score, multiplier, segment)
- **Turn** — one player's visit (up to 3 throws)
- **Leg** — one game from the starting score to zero (e.g., 501)
- **Set** — a group of legs (best-of)
- **Match** — sets/legs to win, players, history, and active state

## Contributing

1. Create a feature branch (see `AGENT.md` for conventions).
2. Make changes and verify with `pnpm lint` and `pnpm build`.
3. Open a merge request with a clear description of the change.

## License

Private project.
