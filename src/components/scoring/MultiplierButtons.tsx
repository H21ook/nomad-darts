'use client';
import { cn } from '@/lib/utils';
import type { Multiplier } from '@/lib/dartboard';

interface MultiplierButtonsProps {
  multiplier: Multiplier;
  onChange: (m: Multiplier) => void;
}

/** Double / Triple selector — pressing a segment then auto-resets to 'S'. */
export default function MultiplierButtons({ multiplier, onChange }: MultiplierButtonsProps) {
  const press = (m: 'D' | 'T') => {
    if (navigator.vibrate) navigator.vibrate(5);
    onChange(multiplier === m ? 'S' : m); // toggle off by pressing again
  };
  const btn = (m: 'D' | 'T', label: string, activeCls: string, idleCls: string) => (
    <button
      type="button"
      onPointerDown={(e) => { e.preventDefault(); press(m); }}
      className={cn(
        'flex-1 flex items-center justify-center rounded-xl border py-3 transition-all duration-75 active:scale-95 font-black text-sm uppercase tracking-wider',
        multiplier === m ? activeCls : idleCls
      )}
    >
      {label}
    </button>
  );
  return (
    <div className="flex gap-2">
      {btn('D', 'Double', 'bg-cyan-500 text-black border-cyan-400', 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400')}
      {btn('T', 'Triple', 'bg-cyan-500 text-black border-cyan-400', 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400')}
    </div>
  );
}