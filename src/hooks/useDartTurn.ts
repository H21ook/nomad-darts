'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { scoreDart, type Multiplier } from '@/lib/dartboard';

export interface DartEntry {
  segment: number;
  multiplier: Multiplier;
  points: number;
}

export type TurnStatus = 'continue' | 'bust' | 'finish';
export type TurnOutcome = 'added' | 'submitted' | 'bust' | 'finish';

export function resolveTurnStatus(
  darts: DartEntry[],
  remaining: number,
  checkout: 'double' | 'straight'
): TurnStatus {
  if (darts.length === 0) return 'continue';
  const total = darts.reduce((sum, d) => sum + d.points, 0);
  if (total > remaining) return 'bust';
  if (total === remaining) {
    if (checkout === 'straight') return 'finish';
    const last = darts[darts.length - 1];
    if (last.multiplier === 'D' || last.segment === 50) return 'finish';
    return 'bust';
  }
  return 'continue';
}

interface UseDartTurnOptions {
  currentScore: number;
  checkout: 'double' | 'straight';
  onSubmit: (score: number, dartsUsed?: number, isBust?: boolean) => void;
}

export function useDartTurn({ currentScore, checkout, onSubmit }: UseDartTurnOptions) {
  const [darts, setDarts] = useState<DartEntry[]>([]);
  const [lastOutcome, setLastOutcome] = useState<TurnOutcome | null>(null);
  const onSubmitRef = useRef(onSubmit);
  useEffect(() => { onSubmitRef.current = onSubmit; }, [onSubmit]);

  // Ref mirror of darts so addDart computes OUTSIDE setState updaters.
  // Side effects inside updaters double-fire under React StrictMode (dev).
  const dartsRef = useRef<DartEntry[]>([]);
  useEffect(() => { dartsRef.current = darts; }, [darts]);

  // New turn (currentScore changed — after a submit or an external undo): clear.
  // Render-time adjustment (React's documented pattern for resetting state when
  // a prop changes) — avoids setState inside an effect body.
  const [prevScore, setPrevScore] = useState(currentScore);
  if (prevScore !== currentScore) {
    setPrevScore(currentScore);
    setDarts([]);
    setLastOutcome(null);
  }
  // Latest score for addDart's handler-time read, keeping addDart stable.
  const scoreRef = useRef(currentScore);
  useEffect(() => { scoreRef.current = currentScore; }, [currentScore]);

  const addDart = useCallback((segment: number, multiplier: Multiplier): TurnOutcome => {
    const points = scoreDart(segment, multiplier);
    const next = [...dartsRef.current, { segment, multiplier, points }];
    const status = resolveTurnStatus(next, scoreRef.current, checkout);

    if (status === 'bust') {
      setDarts([]);
      setLastOutcome('bust');
      onSubmitRef.current(0, next.length, true);
      return 'bust';
    }
    if (status === 'finish') {
      const total = next.reduce((sum, d) => sum + d.points, 0);
      setDarts([]);
      setLastOutcome('finish');
      onSubmitRef.current(total, next.length, false);
      return 'finish';
    }
    if (next.length === 3) {
      const total = next.reduce((sum, d) => sum + d.points, 0);
      setDarts([]);
      setLastOutcome('submitted');
      onSubmitRef.current(total, 3, false);
      return 'submitted';
    }
    setDarts(next);
    setLastOutcome('added');
    return 'added';
  }, [checkout]);

  const undoDart = useCallback(() => {
    setDarts((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
    setLastOutcome(null);
  }, []);

  const total = darts.reduce((sum, d) => sum + d.points, 0);

  return { darts, total, lastOutcome, addDart, undoDart };
}
