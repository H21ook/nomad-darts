'use client';
import { useCallback, useEffect, useState } from 'react';
import type { ScoreInputMode } from '@/components/scoring/ScoreInputPanel';

const STORAGE_KEY = 'nomad-darts:score-input-mode';
const BOARD_QUERY = '(min-width: 768px)';

export function useScoreInputMode(): {
  mode: ScoreInputMode; // 'three' | 'single' | 'board'
  setMode: (m: ScoreInputMode) => void;
  isLarge: boolean; // matchMedia('(min-width: 768px)').matches, live
} {
  const [isLarge, setIsLarge] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia?.(BOARD_QUERY).matches
  );
  useEffect(() => {
    const mql = window.matchMedia(BOARD_QUERY);
    // Re-query on every event instead of reading the captured `mql.matches`:
    // the matchMedia mock can be swapped mid-session (tests) and the MediaQueryList
    // must never go stale (real browsers) — the live query is the source of truth.
    const onChange = () => setIsLarge(window.matchMedia(BOARD_QUERY).matches);
    mql.addEventListener('change', onChange);
    window.addEventListener('resize', onChange); // jsdom/testing belt and braces
    return () => {
      mql.removeEventListener('change', onChange);
      window.removeEventListener('resize', onChange);
    };
  }, []);

  // Restore persisted mode once on mount; BOARD only when large enough.
  // Lazy initializer (not an effect) — avoids setState in an effect body.
  const [mode, setModeState] = useState<ScoreInputMode>(() => {
    if (typeof window === 'undefined') return 'three'; // SSR guard
    const stored = localStorage.getItem(STORAGE_KEY) as ScoreInputMode | null;
    if (stored !== 'single' && stored !== 'board' && stored !== 'three') return 'three';
    return stored === 'board' && !isLarge ? 'single' : stored;
  });

  // BOARD becomes unavailable → fall back to 1 DART (same per-dart logic).
  // Render-time adjustment (same pattern as ScoreInputPanel) — converges to
  // 'single' in one re-render, keeps react-hooks/set-state-in-effect happy.
  if (mode === 'board' && !isLarge) setModeState('single');

  const setMode = useCallback((m: ScoreInputMode) => {
    setModeState(m);
    localStorage.setItem(STORAGE_KEY, m);
  }, []);

  return { mode, setMode, isLarge };
}
