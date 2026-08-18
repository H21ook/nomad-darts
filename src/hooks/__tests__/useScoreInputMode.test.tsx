// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, renderHook, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { useScoreInputMode } from '@/hooks/useScoreInputMode';

const STORAGE_KEY = 'nomad-darts:score-input-mode';

interface MqlStub {
  matches: boolean;
  media: string;
  onchange: null;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  addListener: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
  dispatchEvent: ReturnType<typeof vi.fn>;
  emitChange: () => void;
}

/** Control matchMedia for the 768px guard (same shape as scoreInputPanel.test.tsx). */
function setMedia(matches: boolean): MqlStub {
  const changeListeners: Array<() => void> = [];
  const mql: MqlStub = {
    matches,
    media: '(min-width: 768px)',
    onchange: null,
    addEventListener: vi.fn((_event: string, cb: () => void) => {
      changeListeners.push(cb);
    }),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    emitChange: () => {
      changeListeners.forEach((cb) => cb());
    },
  };
  window.matchMedia = vi.fn().mockReturnValue(mql);
  return mql;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('useScoreInputMode', () => {
  it("defaults to 'three' when storage is empty", () => {
    setMedia(true);
    const { result } = renderHook(() => useScoreInputMode());
    expect(result.current.mode).toBe('three');
  });

  it("restores 'single' from storage", () => {
    setMedia(true);
    localStorage.setItem(STORAGE_KEY, 'single');
    const { result } = renderHook(() => useScoreInputMode());
    expect(result.current.mode).toBe('single');
  });

  it("falls back to 'three' for an invalid stored value", () => {
    setMedia(true);
    localStorage.setItem(STORAGE_KEY, 'garbage');
    const { result } = renderHook(() => useScoreInputMode());
    expect(result.current.mode).toBe('three');
  });

  it("ignores stored 'board' on a small screen (<768px) → 'single'", () => {
    setMedia(false);
    localStorage.setItem(STORAGE_KEY, 'board');
    const { result } = renderHook(() => useScoreInputMode());
    expect(result.current.isLarge).toBe(false);
    expect(result.current.mode).toBe('single');
  });

  it('setMode updates state and persists to localStorage', () => {
    setMedia(true);
    const { result } = renderHook(() => useScoreInputMode());
    act(() => result.current.setMode('board'));
    expect(result.current.mode).toBe('board');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('board');
  });

  it('falls back to single when the screen shrinks below 768px while in board mode', () => {
    const mql = setMedia(true);
    localStorage.setItem(STORAGE_KEY, 'board');
    const { result } = renderHook(() => useScoreInputMode());
    expect(result.current.isLarge).toBe(true);
    expect(result.current.mode).toBe('board');
    // Screen shrinks: matchMedia flips AND fires its change listener.
    mql.matches = false;
    act(() => mql.emitChange());
    expect(result.current.isLarge).toBe(false);
    expect(result.current.mode).toBe('single');
  });

  it('tracks isLarge live via resize events (re-queries matchMedia, never stale)', () => {
    const mql = setMedia(true);
    const { result } = renderHook(() => useScoreInputMode());
    expect(result.current.isLarge).toBe(true);
    mql.matches = false;
    act(() => fireEvent(window, new Event('resize')));
    expect(result.current.isLarge).toBe(false);
    mql.matches = true;
    act(() => fireEvent(window, new Event('resize')));
    expect(result.current.isLarge).toBe(true);
  });

  it('removes both change and resize listeners on unmount', () => {
    const mql = setMedia(true);
    const removeResize = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useScoreInputMode());
    unmount();
    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(removeResize).toHaveBeenCalledWith('resize', expect.any(Function));
    removeResize.mockRestore();
  });
});
