# ADR-0001 — Rematch flow and session middleware fixes

- **Status:** Accepted (implemented 2026-08-07, workflow WF-20260807-043915-research-plan)
- **Date:** 2026-08-07

## Context

Research found two critical bugs:
1. Rematch was broken: `match/finished/page.tsx` redirected to `/` after `rematch()` — the user never reached `/match`.
2. Session middleware was dead code: `src/app/proxy.ts` was in the wrong location (Next.js 16 requires root or `src/` level); no route protection existed.

## Decision

- **D1 — Rematch:** Fix rematch to land on `/match` with persisted settings (roadmap intent "rematch with old settings").
- **D2 — Middleware:** Move session middleware to `src/proxy.ts` (correct Next.js 16 location), with an env-var guard and graceful fallback so dev works without Supabase env vars. Matcher: `["/dashboard/:path*", "/match/:path*"]`, redirect to `/auth/login` when unauthenticated.

## Consequences

- Rematch now lands on the live match screen with the previous match's settings.
- Route protection is restored for dashboard and match routes.
- Dev without env vars no longer crashes (guard added).
