import { describe, expect, it } from 'vitest';
import {
  SEGMENT_ORDER, canApplyMultiplier, scoreDart,
  bullZoneFromRadius, segmentFromAngleDeg,
  R_INNER_BULL, R_OUTER_BULL, R_TRIPLE_IN,
} from '@/lib/dartboard';

describe('segmentFromAngleDeg', () => {
  it('maps 0° (12 o\'clock) to segment 20', () => {
    expect(segmentFromAngleDeg(0)).toBe(20);
  });
  it('walks the 20 segments clockwise by 18°', () => {
    SEGMENT_ORDER.forEach((segment, i) => {
      expect(segmentFromAngleDeg(i * 18)).toBe(segment);
    });
  });
  it('wraps negative and >360 angles', () => {
    expect(segmentFromAngleDeg(-18)).toBe(SEGMENT_ORDER[19]);
    expect(segmentFromAngleDeg(360)).toBe(20);
    expect(segmentFromAngleDeg(9)).toBe(20);      // center of first wedge
  });
  it('normalizes 45° to the 3rd wedge boundary', () => {
    expect(segmentFromAngleDeg(36)).toBe(SEGMENT_ORDER[2]);
  });
});

describe('bullZoneFromRadius', () => {
  it('classifies inner bull, outer bull, and segment zones', () => {
    expect(bullZoneFromRadius(R_INNER_BULL * 0.5)).toBe('inner');
    expect(bullZoneFromRadius(R_OUTER_BULL * 0.9)).toBe('outer');
    expect(bullZoneFromRadius(R_TRIPLE_IN)).toBe(null);
    expect(bullZoneFromRadius(1)).toBe(null);
  });
});

describe('canApplyMultiplier / scoreDart', () => {
  it('scores normal segments with all multipliers', () => {
    expect(scoreDart(20, 'S')).toBe(20);
    expect(scoreDart(20, 'D')).toBe(40);
    expect(scoreDart(20, 'T')).toBe(60);
    expect(scoreDart(7, 'T')).toBe(21);
  });
  it('bull: 25 allows S and D; 50 allows S only', () => {
    expect(scoreDart(25, 'S')).toBe(25);
    expect(scoreDart(25, 'D')).toBe(50);
    expect(scoreDart(50, 'S')).toBe(50);
    expect(canApplyMultiplier(25, 'T')).toBe(false);
    expect(canApplyMultiplier(50, 'D')).toBe(false);
    expect(canApplyMultiplier(50, 'T')).toBe(false);
    expect(scoreDart(50, 'D')).toBe(0);
  });
  it('rejects segments outside the board', () => {
    expect(scoreDart(0, 'S')).toBe(0);
    expect(scoreDart(26, 'S')).toBe(0);
    expect(scoreDart(99, 'D')).toBe(0);
  });
});
