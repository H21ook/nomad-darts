'use client';
import { IconRotateClockwise2 } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import type { DartEntry } from '@/hooks/useDartTurn';

interface DartSlotsDisplayProps {
  darts: DartEntry[]; // 0..3 entries — slot i shows darts[i], left to right
  total: number; // running turn total — shown dim below the slots
  onUndo: () => void;
  canUndo: boolean;
  bustFlash?: boolean;
}

/**
 * Per-dart turn display for single dart mode: three slots that fill with each
 * dart's points, and the turn total shown small and dim underneath — so the
 * running sum doesn't read as a score change.
 */
export default function DartSlotsDisplay({ darts, total, onUndo, canUndo, bustFlash }: DartSlotsDisplayProps) {
  return (
    <div className="flex-[0.8] min-h-[70px] relative">
      <div
        className={cn(
          'h-full flex flex-col items-center justify-center gap-1.5 bg-zinc-900/40 rounded-2xl border border-white/5 overflow-hidden transition-colors duration-150 px-2',
          bustFlash && 'bg-red-500/20 border-red-500/40'
        )}
      >
        <div className="grid grid-cols-3 gap-1.5 w-full">
          {[0, 1, 2].map((i) => {
            const dart = darts[i];
            return (
              <div
                key={i}
                className={cn(
                  'flex items-center justify-center rounded-xl border min-h-[48px]',
                  dart ? 'border-cyan-500/30' : 'border-white/5'
                )}
              >
                {dart && (
                  <span className="text-3xl font-mono font-black tracking-widest tabular-nums text-cyan-400">
                    {dart.points}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <span className="text-sm font-mono text-zinc-600 tabular-nums">{total}</span>
      </div>
      <button
        type="button"
        aria-label="Undo dart"
        onPointerDown={(e) => {
          e.preventDefault();
          if (navigator.vibrate) navigator.vibrate(15);
          if (canUndo) onUndo();
        }}
        disabled={!canUndo}
        className={cn(
          'absolute right-2 top-1/2 -translate-y-1/2 p-3 text-zinc-500 active:text-white transition-opacity',
          !canUndo && 'opacity-30'
        )}
      >
        <IconRotateClockwise2 size={24} />
      </button>
    </div>
  );
}
