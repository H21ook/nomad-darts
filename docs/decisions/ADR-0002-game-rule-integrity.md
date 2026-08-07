# ADR-0002 — Game-rule data integrity (BUST semantics, darts-used stats, dead fields)

- **Status:** Accepted (implemented 2026-08-07, workflow WF-20260807-043915-research-plan)
- **Date:** 2026-08-07

## Context

Three data-integrity bugs were verified in research:
1. **BUST button** submitted `score: 0` → recorded as a non-bust 0-point turn (wrong semantics).
2. **Stats inflated:** `NumberPad` always submitted `dartsUsed: 3` for non-checkout turns.
3. **Dead fields:** `checkoutAttempts`, `lastThrows`, `dartsToFinish`, `Turn.throws`, `Throw` were unused or misleading.

## Decision

- **D4 (partial) — BUST semantics:** BUST now records `isBust: true, points: 0, dartsUsed: 3` (a bust consumes the visit).
- **Darts counter:** NumberPad tracks 1/2/3 darts per turn; defaults to 3 for non-checkout turns.
- **Dead fields removed** from the type model and slices (`checkoutAttempts`, `lastThrows`, `dartsToFinish`, `Turn.throws`, `Throw`).

## Consequences

- Stats (PPR, darts per leg) are now accurate.
- BUST is a real game event, not a 0-point turn.
- Model is leaner; no dead fields to confuse future work.

## Notes

- Double Out enforcement (finish-with-double confirmation) was implemented separately in T09 (see ADR-0003).
