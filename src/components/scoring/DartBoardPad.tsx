'use client';
import { useMemo, useState } from 'react';
import { useDartTurn } from '@/hooks/useDartTurn';
import { type Multiplier } from '@/lib/dartboard';
import DartBoard from './DartBoard';
import TurnDisplay from './TurnDisplay';
import MultiplierButtons from './MultiplierButtons';

interface DartBoardPadProps {
  onSubmit: (score: number, dartsUsed?: number, isBust?: boolean) => void;
  currentScore: number;
  checkout?: 'double' | 'straight';
}

export default function DartBoardPad({ onSubmit, currentScore, checkout = 'double' }: DartBoardPadProps) {
  const [multiplier, setMultiplier] = useState<Multiplier>('S');
  const { darts, total, lastOutcome, addDart, undoDart } = useDartTurn({ currentScore, checkout, onSubmit });

  const breakdown = useMemo(
    () => darts.map((d) => `${d.multiplier === 'S' ? 'S' : d.multiplier}${d.segment}`).join(' · '),
    [darts]
  );

  /** Board tap → segment. Outer bull tap with Double active = 50 (decision 8). */
  const handleBoardPress = (segment: number) => {
    if (segment === 25 && multiplier === 'D') {
      addDart(50, 'S');
      setMultiplier('S');
      return;
    }
    addDart(segment, multiplier);
    setMultiplier('S');
  };

  return (
    <div className="flex flex-col h-full w-full p-2 gap-2 bg-black select-none touch-none">
      <TurnDisplay
        total={total}
        dartCount={darts.length}
        breakdown={breakdown}
        onUndo={undoDart}
        canUndo={darts.length > 0}
        bustFlash={lastOutcome === 'bust'}
      />

      <MultiplierButtons multiplier={multiplier} onChange={setMultiplier} />

      <div className="flex-1 flex items-center justify-center min-h-0">
        <DartBoard onPress={handleBoardPress} className="max-h-full max-w-full aspect-square" />
      </div>
    </div>
  );
}
