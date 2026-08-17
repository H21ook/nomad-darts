// Pure dartboard geometry and scoring. No React imports — unit-testable in node.

export type Multiplier = 'S' | 'D' | 'T';
export type BullZone = 'inner' | 'outer' | null;

export const SEGMENT_ANGLE = 18; // degrees per wedge

/** Standard segment order, clockwise from 12 o'clock (segment 20). */
export const SEGMENT_ORDER: number[] = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
];

// Ring radii as fractions of board radius R=1 (standard dartboard proportions).
export const R_DOUBLE_IN = 0.953;
export const R_TRIPLE_OUT = 0.629;
export const R_TRIPLE_IN = 0.582;
export const R_OUTER_BULL = 0.094;
export const R_INNER_BULL = 0.037;

/** Normalize any angle to [0, 360). */
function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Map an angle to a segment number. 0° = 12 o'clock (20), clockwise.
 * Deg is measured from the screen direction (atan2(dx, -dy) in screen coords).
 */
export function segmentFromAngleDeg(deg: number): number {
  const idx = Math.floor(normalizeDeg(deg) / SEGMENT_ANGLE) % 20;
  return SEGMENT_ORDER[idx];
}

/** Classify a normalized radius (0..1) into bull zones; null = segment area. */
export function bullZoneFromRadius(r: number): BullZone {
  if (r <= R_INNER_BULL) return 'inner';
  if (r <= R_OUTER_BULL) return 'outer';
  return null;
}

/** Multiplier validity per segment: 1-20 any; 25 S/D; 50 (bull) S only. */
export function canApplyMultiplier(segment: number, m: Multiplier): boolean {
  if (Number.isInteger(segment) && segment >= 1 && segment <= 20) return true;
  if (segment === 25) return m === 'S' || m === 'D';
  if (segment === 50) return m === 'S';
  return false;
}

/** Points for one dart; 0 when the combination is not a real dart score. */
export function scoreDart(segment: number, m: Multiplier): number {
  if (!canApplyMultiplier(segment, m)) return 0;
  if (segment === 25) return m === 'D' ? 50 : 25;
  if (segment === 50) return 50;
  if (m === 'D') return segment * 2;
  if (m === 'T') return segment * 3;
  return segment;
}
