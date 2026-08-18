'use client';
import { useState } from 'react';
import { useDartTurn } from '@/hooks/useDartTurn';
import { canApplyMultiplier, type Multiplier } from '@/lib/dartboard';
import { cn } from '@/lib/utils';
import DartSlotsDisplay from './DartSlotsDisplay';
import MultiplierButtons from './MultiplierButtons';

interface SingleDartPadProps {
  onSubmit: (score: number, dartsUsed?: number, isBust?: boolean) => void;
  currentScore: number;
  checkout?: 'double' | 'straight';
}

const SEGMENTS = Array.from({ length: 25 }, (_, i) => i + 1); // 1..25

export default function SingleDartPad({ onSubmit, currentScore, checkout = 'double' }: SingleDartPadProps) {
  const [multiplier, setMultiplier] = useState<Multiplier>('S');
  // After a finish the leg is over: remaining is 0, so any further dart busts.
  const [legOver, setLegOver] = useState(false);

  const { darts, total, lastOutcome, addDart, undoDart } = useDartTurn({
    currentScore: legOver ? 0 : currentScore,
    checkout,
    onSubmit,
  });

  // Reset the leg-over flag when the parent starts a new leg (score changes).
  // Render-time adjustment (same pattern as useDartTurn) — avoids setState in
  // an effect body.
  const [prevScore, setPrevScore] = useState(currentScore);
  if (prevScore !== currentScore) {
    setPrevScore(currentScore);
    setLegOver(false);
  }

  const handleSegment = (segment: number) => {
    if (!canApplyMultiplier(segment, multiplier)) return;
    const outcome = addDart(segment, multiplier);
    if (outcome === 'finish') setLegOver(true); // leg over — remaining is 0
    setMultiplier('S'); // reset after each dart
  };

  return (
    <div className="flex flex-col h-full w-full p-2 gap-2 bg-black select-none touch-none">
      <DartSlotsDisplay
        darts={darts}
        total={total}
        onUndo={undoDart}
        canUndo={darts.length > 0}
        bustFlash={lastOutcome === 'bust'}
      />

      <MultiplierButtons multiplier={multiplier} onChange={setMultiplier} />

      {/* 1..25 grid — 5 columns */}
      <div className="flex-4 grid grid-cols-5 grid-rows-5 gap-1.5">
        {SEGMENTS.map((n) => (
          <button
            key={n}
            type="button"
            onPointerDown={(e) => { e.preventDefault(); handleSegment(n); }}
            disabled={!canApplyMultiplier(n, multiplier)}
            className={cn(
              'flex items-center justify-center rounded-xl bg-zinc-900 border border-white/5 text-2xl font-black text-white transition-colors duration-75 active:scale-95 active:bg-cyan-500 active:text-black select-none touch-none',
              !canApplyMultiplier(n, multiplier) && 'opacity-20 grayscale'
            )}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Bull */}
      <button
        type="button"
        onPointerDown={(e) => { e.preventDefault(); handleSegment(50); }}
        disabled={!canApplyMultiplier(50, multiplier)}
        className={cn(
          'flex items-center justify-center gap-2 rounded-xl border py-3 font-black text-sm uppercase tracking-widest transition-all duration-75 active:scale-95',
          multiplier === 'S'
            ? 'bg-green-500 text-black border-green-400'
            : 'bg-green-500/10 border-green-500/20 text-green-500',
          !canApplyMultiplier(50, multiplier) && 'opacity-20 grayscale'
        )}
      >
        BULL (50)
      </button>
    </div>
  );
}