'use client';
import { useCallback, useEffect, useState } from 'react';
import { NumberPad } from './NumberPad';
import SingleDartPad from './SingleDartPad';
import DartBoardPad from './DartBoardPad';
import { cn } from '@/lib/utils';

export type ScoreInputMode = 'three' | 'single' | 'board';

interface ScoreInputPanelProps {
  onSubmit: (score: number, dartsUsed?: number, isBust?: boolean) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  currentScore: number;
  checkout?: 'double' | 'straight';
  className?: string;
}

const STORAGE_KEY = 'nomad-darts:score-input-mode';
const BOARD_QUERY = '(min-width: 768px)';

function useIsLargeScreen(): boolean {
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
  return isLarge;
}

export default function ScoreInputPanel({ onSubmit, onUndo, canUndo, currentScore, checkout = 'double', className }: ScoreInputPanelProps) {
  const isLarge = useIsLargeScreen();

  // Restore persisted mode once on mount; BOARD only when large enough.
  // Lazy initializer (not an effect) — avoids setState in an effect body.
  const [mode, setMode] = useState<ScoreInputMode>(() => {
    if (typeof window === 'undefined') return 'three'; // SSR guard
    const stored = localStorage.getItem(STORAGE_KEY) as ScoreInputMode | null;
    if (stored !== 'single' && stored !== 'board' && stored !== 'three') return 'three';
    return stored === 'board' && !isLarge ? 'single' : stored;
  });

  // BOARD becomes unavailable → fall back to 1 DART (same per-dart logic).
  // Render-time adjustment (same pattern as SingleDartPad) — converges to
  // 'single' in one re-render, keeps react-hooks/set-state-in-effect happy.
  if (mode === 'board' && !isLarge) setMode('single');

  const selectMode = useCallback((m: ScoreInputMode) => {
    setMode(m);
    localStorage.setItem(STORAGE_KEY, m);
  }, []);

  const tab = (m: ScoreInputMode, label: string) => (
    <button
      type="button"
      onClick={() => selectMode(m)}
      className={cn(
        'flex-1 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all duration-75 active:scale-95',
        mode === m
          ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
          : 'bg-zinc-900 border-white/5 text-zinc-500'
      )}
    >
      {label}
    </button>
  );

  const padProps = { onSubmit, currentScore, checkout };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex gap-2 px-2">
        {tab('three', '3 DARTS')}
        {tab('single', '1 DART')}
        {isLarge && tab('board', 'BOARD')}
      </div>
      {mode === 'three' && <NumberPad {...padProps} onUndo={onUndo} canUndo={canUndo} />}
      {mode === 'single' && <SingleDartPad {...padProps} />}
      {mode === 'board' && isLarge && <DartBoardPad {...padProps} />}
    </div>
  );
}
