# System Documentation

This directory documents how the current system works.

- [System Overview](../10-system-overview.md) — product goals, game modes, architecture
- [PWA / Offline](../30-pwa-offline.md) — serwist PWA setup
- [Roadmap](../40-roadmap.md) — product roadmap

## Current implementation state (2026-08-07)

Implemented in workflow WF-20260807-043915-research-plan:

- **Rematch** lands on `/match` with persisted settings (was broken — redirected home).
- **Session middleware** at `src/proxy.ts` (Next.js 16 correct location) protects `/dashboard/*` and `/match/*`; env-var guard for dev without Supabase.
- **Game-rule integrity:** BUST records `isBust: true, points: 0, dartsUsed: 3`; real dart counter (1/2/3); dead fields removed from the model.
- **Double Out enforcement:** finish confirmation asks "Was the last dart a double?"; non-double → bust.
- **Resume feature:** landing page Resume CTA when an in-progress match exists.
- **Statistics page** at `/match/stats` (PPR, darts, legs/sets, checkouts).
- **Guest match history:** local (localStorage via redux-persist) dashboard card.
- **Client 401-refresh fixed:** `refreshAccessToken` now POSTs to the refresh route.
- **Cleanup:** dead stub auth + fetcher layer removed; 10 unused deps and 41 unused ui components removed; generated service worker no longer committed.
