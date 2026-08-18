'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IconCheck, IconSettings } from '@tabler/icons-react';
import type { ScoreInputMode } from '@/components/scoring/ScoreInputPanel';

interface ScoreInputModeMenuProps {
  mode: ScoreInputMode; // current mode
  onSelect: (m: ScoreInputMode) => void; // called when a mode is chosen (parent persists)
  isLarge: boolean; // ≥768px — BOARD option only when true
}

const MODES: { value: ScoreInputMode; label: string }[] = [
  { value: 'three', label: '3 DARTS' },
  { value: 'single', label: '1 DART' },
  { value: 'board', label: 'BOARD' },
];

export default function ScoreInputModeMenu({ mode, onSelect, isLarge }: ScoreInputModeMenuProps) {
  const [open, setOpen] = useState(false);

  // Escape closes the popover; listener lives only while open.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const select = (m: ScoreInputMode) => {
    onSelect(m);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Settings"
        aria-expanded={open}
        onPointerDown={(e) => {
          e.preventDefault();
          if (navigator.vibrate) navigator.vibrate(5);
          setOpen((o) => !o);
        }}
        className="w-14 h-14 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors p-2"
      >
        <IconSettings size={20} />
      </button>

      {/* Transparent backdrop — press closes (no vibrate). Outside AnimatePresence:
          it is invisible, and a transform on an animated ancestor would break its
          `fixed` positioning (transformed elements become containing blocks). */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onPointerDown={(e) => {
            e.preventDefault();
            setOpen(false);
          }}
        />
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            key="mode-menu"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-full mt-2 z-50 w-40 bg-zinc-900 border border-white/10 rounded-2xl p-2 shadow-xl"
          >
            {MODES.filter((m) => m.value !== 'board' || isLarge).map((m) => {
              const active = m.value === mode;
              return (
                <button
                  key={m.value}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    select(m.value);
                  }}
                  className={`w-full flex items-center justify-between py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors border border-transparent ${
                    active
                      ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                      : 'text-zinc-500 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span>{m.label}</span>
                  {active && <IconCheck size={14} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}