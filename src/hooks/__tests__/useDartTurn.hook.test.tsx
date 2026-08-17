// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDartTurn } from '@/hooks/useDartTurn';

const onSubmit = vi.fn();

describe('useDartTurn', () => {
  it('auto-submits after the 3rd dart with 3 darts', () => {
    const { result } = renderHook(() =>
      useDartTurn({ currentScore: 301, checkout: 'double', onSubmit })
    );
    act(() => result.current.addDart(20, 'S'));
    act(() => result.current.addDart(20, 'S'));
    expect(onSubmit).not.toHaveBeenCalled();
    act(() => result.current.addDart(20, 'S'));
    expect(onSubmit).toHaveBeenCalledWith(60, 3, false);
    expect(result.current.darts).toHaveLength(0);
  });

  it('submits a bust immediately with the actual dart count', () => {
    const { result } = renderHook(() =>
      useDartTurn({ currentScore: 10, checkout: 'double', onSubmit })
    );
    act(() => result.current.addDart(20, 'S'));
    expect(onSubmit).toHaveBeenCalledWith(0, 1, true);
    expect(result.current.lastOutcome).toBe('bust');
  });

  it('submits a finish on the 2nd dart with 2 darts used', () => {
    const { result } = renderHook(() =>
      useDartTurn({ currentScore: 80, checkout: 'double', onSubmit })
    );
    act(() => result.current.addDart(20, 'T')); // 60 < 80 — continue
    act(() => result.current.addDart(10, 'D')); // 20 → 80 === 80, last dart double
    expect(onSubmit).toHaveBeenCalledWith(80, 2, false);
  });

  it('undoDart removes the last dart and resets the outcome', () => {
    const { result } = renderHook(() =>
      useDartTurn({ currentScore: 301, checkout: 'double', onSubmit })
    );
    act(() => result.current.addDart(20, 'T'));
    act(() => result.current.addDart(7, 'D'));
    act(() => result.current.undoDart());
    expect(result.current.darts).toHaveLength(1);
    expect(result.current.total).toBe(60);
    expect(result.current.lastOutcome).toBeNull();
  });

  it('resets when currentScore changes', () => {
    const { result, rerender } = renderHook(
      ({ score }) => useDartTurn({ currentScore: score, checkout: 'double', onSubmit }),
      { initialProps: { score: 301 } }
    );
    act(() => result.current.addDart(20, 'S'));
    rerender({ score: 281 });
    expect(result.current.darts).toHaveLength(0);
  });
});
