import { describe, expect, it } from 'vitest';
import { resolveTurnStatus, type DartEntry } from '@/hooks/useDartTurn';

const dart = (segment: number, multiplier: 'S' | 'D' | 'T'): DartEntry => ({
  segment, multiplier, points: segment * (multiplier === 'S' ? 1 : multiplier === 'D' ? 2 : 3),
});

describe('resolveTurnStatus', () => {
  it('continues while total is below remaining', () => {
    expect(resolveTurnStatus([dart(20, 'T')], 300, 'double')).toBe('continue');
  });
  it('busts when total exceeds remaining (even on the 1st dart)', () => {
    expect(resolveTurnStatus([dart(20, 'S')], 10, 'double')).toBe('bust');
  });
  it('busts on the 2nd dart', () => {
    expect(resolveTurnStatus([dart(20, 'S'), dart(60, 'T')], 50, 'double')).toBe('bust');
  });
  it('finishes straight-out on exact match', () => {
    expect(resolveTurnStatus([dart(20, 'S')], 20, 'straight')).toBe('finish');
  });
  it('finishes double-out on a double', () => {
    expect(resolveTurnStatus([dart(20, 'D')], 40, 'double')).toBe('finish');
  });
  it('finishes double-out on bull (50 counts as a double)', () => {
    expect(resolveTurnStatus([{ segment: 50, multiplier: 'S', points: 50 }], 50, 'double')).toBe('finish');
  });
  it('busts double-out on an exact single (S20 on 20)', () => {
    expect(resolveTurnStatus([dart(20, 'S')], 20, 'double')).toBe('bust');
  });
  it('busts double-out on 1 remaining with a single 1', () => {
    expect(resolveTurnStatus([dart(1, 'S')], 1, 'double')).toBe('bust');
  });
  it('continues on a two-dart exact match only when not last-dart-double', () => {
    // T20 + S20 on 80: total 80 === remaining, last dart is a single -> bust in double-out
    expect(resolveTurnStatus([dart(20, 'T'), dart(20, 'S')], 80, 'double')).toBe('bust');
  });
});
