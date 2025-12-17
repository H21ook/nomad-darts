'use client';
import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
// import { Vibration } from 'react-native'; // Not available in web, use navigator.vibrate

interface NumberPadProps {
    onSubmit: (score: number) => void;
    className?: string;
}

export function NumberPad({ onSubmit, className }: NumberPadProps) {
    const [value, setValue] = useState('');

    const handlePress = useCallback((num: number) => {
        setValue(prev => {
            // Limit to 3 digits (180 is max, actually we can type up to 180, but 999 is theoretical max input limit)
            if (prev.length >= 3) return prev;
            const next = prev + num.toString();
            if (parseInt(next) > 180) return prev; // Max score in one turn
            return next;
        });
        if (typeof navigator !== 'undefined') navigator.vibrate?.(10);
    }, []);

    const handleBackspace = useCallback(() => {
        setValue(prev => prev.slice(0, -1));
        if (typeof navigator !== 'undefined') navigator.vibrate?.(15);
    }, []);

    const handleSubmit = useCallback(() => {
        if (!value) return;
        onSubmit(parseInt(value, 10));
        setValue('');
        if (typeof navigator !== 'undefined') navigator.vibrate?.(20);
    }, [value, onSubmit]);

    const handleQuickScore = useCallback((score: number) => {
        onSubmit(score);
        setValue('');
        if (typeof navigator !== 'undefined') navigator.vibrate?.(20);
    }, [onSubmit]);

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key >= '0' && e.key <= '9') {
                handlePress(parseInt(e.key));
            } else if (e.key === 'Backspace') {
                handleBackspace();
            } else if (e.key === 'Enter') {
                handleSubmit();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlePress, handleBackspace, handleSubmit]);

    return (
        <div className={cn("flex flex-col gap-4 p-4 pb-8 bg-[#0D0D0D]", className)}>
            {/* Display */}
            <div className="h-16 flex items-center justify-center bg-gray-900 rounded-xl border border-gray-800 mb-2">
                <span className={cn("text-4xl font-mono text-cyan-400 font-bold tracking-widest", !value && "opacity-30")}>
                    {value || "0"}
                </span>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 justify-between mb-2">
                {[26, 41, 45, 60, 100, 140, 180].map((score) => (
                    <button
                        key={score}
                        onClick={() => handleQuickScore(score)}
                        className="flex-1 py-2 bg-gray-800 rounded-md text-gray-300 text-xs font-bold hover:bg-gray-700 active:bg-cyan-900 transition-colors"
                    >
                        {score}
                    </button>
                ))}
            </div>

            {/* Number Grid */}
            <div className="grid grid-cols-3 gap-3 flex-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                        key={num}
                        onClick={() => handlePress(num)}
                        className="h-16 bg-gray-800 rounded-xl text-2xl font-bold text-white shadow-lg active:scale-95 transition-transform active:bg-cyan-600 border-b-4 border-gray-950 active:border-b-0 active:translate-y-1"
                    >
                        {num}
                    </button>
                ))}

                <button
                    onClick={handleBackspace}
                    className="h-16 bg-red-900/30 rounded-xl text-xl font-bold text-red-400 active:scale-95 transition-transform border border-red-900/50"
                >
                    DEL
                </button>

                <button
                    onClick={() => handlePress(0)}
                    className="h-16 bg-gray-800 rounded-xl text-2xl font-bold text-white shadow-lg active:scale-95 transition-transform border-b-4 border-gray-950 active:border-b-0 active:translate-y-1"
                >
                    0
                </button>

                <button
                    onClick={handleSubmit}
                    className="h-16 bg-cyan-600 rounded-xl text-xl font-bold text-black shadow-[0_0_15px_rgba(0,255,255,0.3)] active:scale-95 transition-transform border-b-4 border-cyan-800 active:border-b-0 active:translate-y-1"
                >
                    ENTER
                </button>
            </div>
        </div>
    );
}
