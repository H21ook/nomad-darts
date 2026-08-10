'use client';
import { useCallback, useState } from 'react';
import { checkFinishablePoint, cn } from '@/lib/utils';
import { IconBackspace, IconCheck, IconTargetArrow, IconX, IconTrophy, IconRotateClockwise2 } from '@tabler/icons-react';
import FastButton from './FastButton';
import { FinishConfirmation } from './FinishConfirmation';
import SubmitButton from './SubmitButton';

interface NumberPadProps {
    onSubmit: (score: number, dartsUsed?: number, isBust?: boolean) => void;
    onUndo?: () => void;
    canUndo?: boolean;
    currentScore: number;
    checkout?: 'double' | 'straight';
    className?: string;
}

export function NumberPad({ onSubmit, currentScore, onUndo, canUndo, checkout = 'double' }: NumberPadProps) {
    const [value, setValue] = useState('');
    const [displayMode, setDisplayMode] = useState<'number' | 'text'>('number');
    const [showFinishConfirm, setShowFinishConfirm] = useState(false);

    const canFinish = checkFinishablePoint(currentScore, checkout);

    const handlePress = useCallback((num: number) => {
        setDisplayMode('number');
        setValue(prev => {
            if (prev.length >= 3 || displayMode === 'text') return num.toString();
            const next = prev + num.toString();
            return parseInt(next) > 180 ? prev : next;
        });
        if (navigator.vibrate) navigator.vibrate(5);
    }, [displayMode]);

    const handleClear = () => {
        setValue('');
        if (navigator.vibrate) navigator.vibrate(15);
    };

    const handleStrategyClick = (type: 'BUST' | 'BULL' | 'FINISH') => {
        setDisplayMode('text');
        if (type === 'BUST') setValue('BUST');
        if (type === 'BULL') setValue('50');
        if (type === 'FINISH') {
            setValue('');
            setDisplayMode('number');
            setShowFinishConfirm(true);
            return;
        }
        if (navigator.vibrate) navigator.vibrate(10);
    };

    const handleClearOrUndo = () => {
        if (canUndo) {
            onUndo?.();
        }
        if (navigator.vibrate) navigator.vibrate(15);
    };

    const handleSubmit = () => {
        if (!value) return;

        if (value === 'BUST') {
            onSubmit(0, 3, true);
            setValue('');
            setDisplayMode('number');
            return;
        }

        let finalScore = 0;
        if (value === 'BULL') finalScore = 50;
        else if (value === 'FINISH') {
            finalScore = currentScore;
        }
        else finalScore = parseInt(value);

        if (finalScore === currentScore) {
            if (canFinish) {
                setShowFinishConfirm(true);
            }
            // Exact-score entry on a non-finishable score (e.g. 169): block the
            // submission entirely — submitting would incorrectly win the leg
            // (remaining would hit 0). Keep the typed input so the player can
            // correct it.
            return;
        }
        onSubmit(finalScore, 3);
        setValue('');
        setDisplayMode('number');
    };

    const handleActualSubmit = (dartsUsed?: number) => {
        onSubmit(currentScore, dartsUsed);
        setValue('');
        setShowFinishConfirm(false);
    };

    return (
        <div className="flex flex-col h-full w-full p-2 gap-2 bg-black select-none touch-none">

            {/* Display - Төвдөө голлуулсан */}
            <div className="flex-[0.8] min-h-[70px] relative">
                <div className="h-full flex items-center justify-center bg-zinc-900/40 rounded-2xl border border-white/5 overflow-hidden">
                    <span className={cn(
                        "text-5xl font-mono font-black tracking-widest tabular-nums",
                        value ? (value === 'BUST' ? "text-red-500" : "text-cyan-400") : "text-white/5"
                    )}>
                        {value || "0"}
                    </span>

                    {value && (
                        <button
                            onClick={handleClear}
                            className="absolute right-4 p-4 text-zinc-500 active:text-white"
                        >
                            <IconBackspace size={24} />
                        </button>
                    )}
                </div>
            </div>

            {/* Strategy Shortcuts */}
            <div className="flex-[0.6] grid grid-cols-3 gap-2">
                <button
                    onPointerDown={(e) => { e.preventDefault(); handleStrategyClick('BUST'); }}
                    className={cn(
                        "flex flex-col items-center justify-center rounded-xl border transition-all duration-75 active:scale-95",
                        value === 'BUST' ? "bg-red-500 text-black" : "bg-red-500/10 border-red-500/20 text-red-500"
                    )}
                >
                    <IconX size={18} />
                    <span className="text-[10px] font-black mt-1">BUST</span>
                </button>
                <button
                    onPointerDown={(e) => { e.preventDefault(); handleStrategyClick('BULL'); }}
                    className={cn(
                        "flex flex-col items-center justify-center rounded-xl border transition-all duration-75 active:scale-95",
                        value === '50' ? "bg-green-500 text-black" : "bg-green-500/10 border-green-500/20 text-green-500"
                    )}
                >
                    <IconTargetArrow size={18} />
                    <span className="text-[10px] font-black mt-1">BULL</span>
                </button>
                <button
                    disabled={!canFinish}
                    onPointerDown={(e) => { if (canFinish) { e.preventDefault(); handleStrategyClick('FINISH'); } }}
                    className={cn(
                        "flex flex-col items-center justify-center rounded-xl border transition-all duration-75 active:scale-95",
                        !canFinish ? "bg-zinc-900 border-white/5 text-zinc-700 opacity-30" :
                            value === 'FINISH' ? "bg-cyan-500 text-black" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                    )}
                >
                    <IconTrophy size={18} />
                    <span className="text-[10px] font-black mt-1">FINISH</span>
                </button>
            </div>

            {/* Number Grid - Хэт хурдан хариу үйлдэл */}
            <div className="flex-4 grid grid-cols-3 grid-rows-4 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <FastButton
                        key={num}
                        onPress={() => handlePress(num)}
                    >
                        {num}
                    </FastButton>
                ))}

                <SubmitButton
                    onClick={(e) => {
                        e.preventDefault();
                        handleClearOrUndo();
                    }}
                    disabled={!canUndo}
                    className='bg-zinc-900 text-zinc-400 border border-white/10 hover:bg-zinc-800 hover:text-white'
                >
                    <IconRotateClockwise2 size={24} />
                    <span className="text-[10px] font-black ml-0.5 mt-1 uppercase tracking-wider">
                        Undo
                    </span>
                </SubmitButton>

                <FastButton onPress={() => handlePress(0)}>
                    0
                </FastButton>

                <SubmitButton
                    onClick={handleSubmit}
                    disabled={!value}
                    className='bg-cyan-500 text-black'
                >
                    <IconCheck size={36} stroke={3} />
                </SubmitButton>
            </div>

            {showFinishConfirm && (
                <FinishConfirmation
                    onConfirm={handleActualSubmit}
                    onCancel={() => {
                        setValue('');
                        setDisplayMode('number');
                        setShowFinishConfirm(false);
                    }}
                />
            )}
        </div>
    );
}