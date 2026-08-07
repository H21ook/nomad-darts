# ADR-0003 — Double Out enforcement and Resume feature

- **Status:** Accepted (implemented 2026-08-07, workflow WF-20260807-043915-research-plan)
- **Date:** 2026-08-07

## Context

- Double Out was not enforced: any score landing on 0 won the leg; only "landing on 1 with double-out" was a bust.
- Resume CTA/logic was missing (roadmap Goal 1 must-have).

## Decision

- **D4 — Double Out:** Implement "finish with double" confirmation in `FinishConfirmation` — when a player reaches 0, ask "Was the last dart a double?"; a non-double answer dispatches a bust. No per-dart entry in this phase (per-dart Throw model is a larger redesign).
- **D6 — Resume:** Resume only when `status === 'playing'` and a match exists in persisted state. Landing page shows a Resume CTA when `canResume` is true.

## Consequences

- Double Out is now enforced at the finish step without a Throw-model redesign.
- Users can resume an in-progress match from the landing page.
