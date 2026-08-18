'use client';
import { NumberPad } from './NumberPad';
import SingleDartPad from './SingleDartPad';
import DartBoardPad from './DartBoardPad';
import { cn } from '@/lib/utils';

export type ScoreInputMode = 'three' | 'single' | 'board';

interface ScoreInputPanelProps {
  mode: ScoreInputMode; // controlled — the match page passes it via useScoreInputMode
  onSubmit: (score: number, dartsUsed?: number, isBust?: boolean) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  currentScore: number;
  checkout?: 'double' | 'straight';
  className?: string;
}

export default function ScoreInputPanel({ mode, onSubmit, onUndo, canUndo, currentScore, checkout = 'double', className }: ScoreInputPanelProps) {
  const padProps = { onSubmit, currentScore, checkout };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {mode === 'three' && <NumberPad {...padProps} onUndo={onUndo} canUndo={canUndo} />}
      {mode === 'single' && <SingleDartPad {...padProps} />}
      {mode === 'board' && <DartBoardPad {...padProps} />}
    </div>
  );
}
