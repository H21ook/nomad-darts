'use client';
import { cn } from '@/lib/utils';
import { IconRotateClockwise2 } from '@tabler/icons-react';

interface TurnDisplayProps {
  total: number;
  dartCount: number;
  breakdown: string;
  onUndo?: () => void;
  canUndo?: boolean;
  bustFlash?: boolean;
}

/**
 * Shared turn display for the per-dart pads. Same visual style as the
 * NumberPad display: big mono total, zinc-900/40 rounded container,
 * undo button on the right.
 */
export default function TurnDisplay({ total, dartCount, breakdown, onUndo, canUndo, bustFlash }: TurnDisplayProps) {
  return (
    <div className="flex-[0.8] min-h-[70px] relative">
      <div
        className={cn(
          'h-full flex items-center justify-center bg-zinc-900/40 rounded-2xl border border-white/5 overflow-hidden transition-colors duration-150',
          bustFlash && 'bg-red-500/20 border-red-500/40'
        )}
      >
        <span className={cn('text-5xl font-mono font-black tracking-widest tabular-nums', bustFlash ? 'text-red-500' : 'text-cyan-400')}>
          {total}
        </span>
        <span className="ml-3 text-sm font-mono text-zinc-500">
          {dartCount}/3
          {breakdown && <span className="ml-2 text-xs text-zinc-600">{breakdown}</span>}
        </span>
        {onUndo && (
          <button
            type="button"
            onPointerDown={(e) => { e.preventDefault(); if (canUndo) onUndo(); }}
            disabled={!canUndo}
            aria-label="Undo dart"
            className={cn(
              'absolute right-4 p-4 text-zinc-500 active:text-white transition-opacity',
              !canUndo && 'opacity-30'
            )}
          >
            <IconRotateClockwise2 size={24} />
          </button>
        )}
      </div>
    </div>
  );
}