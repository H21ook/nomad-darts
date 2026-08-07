"use client";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { submitTurn } from '@/lib/redux/matchSlice';

interface Props {
    onConfirm: (num: number) => void;
    onCancel: () => void;
}

export function FinishConfirmation({ onConfirm, onCancel }: Props) {
    const dispatch = useAppDispatch();
    const checkout = useAppSelector((state) => state.match.settings.checkout);
    const [confirmedDouble, setConfirmedDouble] = useState(false);

    // Double-out mode: the last dart must be a double to finish.
    // A non-double finish is a bust (score unchanged, turn passes).
    const handleNotDouble = () => {
        dispatch(submitTurn({ score: 0, dartsUsed: 3, isBust: true }));
        onCancel();
    };

    const showDoubleQuestion = checkout === 'double' && !confirmedDouble;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="bg-zinc-900 p-8 rounded-3xl border border-white/10 w-[90%] max-w-sm text-center">
                <h2 className="text-2xl font-black text-white mb-6">CHECKOUT!</h2>

                {showDoubleQuestion ? (
                    <>
                        <p className="text-zinc-400 text-sm mb-8">Was the last dart a double?</p>

                        <div className="grid grid-cols-2 gap-3 mb-8">
                            <button
                                onClick={() => setConfirmedDouble(true)}
                                className="h-20 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 text-xl font-black hover:bg-green-500 hover:text-black transition-all"
                            >
                                Double ✓
                            </button>
                            <button
                                onClick={handleNotDouble}
                                className="h-20 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xl font-black hover:bg-red-500 hover:text-black transition-all"
                            >
                                Not double
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-zinc-400 text-sm mb-8">How many darts did you use to finish?</p>

                        <div className="grid grid-cols-3 gap-3 mb-8">
                            {[1, 2, 3].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => onConfirm(num)}
                                    className="h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-3xl font-black hover:bg-cyan-500 hover:text-black transition-all"
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                    </>
                )}

                <button
                    onClick={onCancel}
                    className="text-zinc-500 font-bold text-sm uppercase tracking-widest hover:text-white"
                >
                    Cancel
                </button>
            </div>
        </motion.div>
    );
}