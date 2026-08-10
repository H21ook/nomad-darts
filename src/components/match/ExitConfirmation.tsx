"use client";
import { motion, AnimatePresence } from "framer-motion";

interface ExitConfirmationProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}

export function ExitConfirmation({ open, onOpenChange, onConfirm }: ExitConfirmationProps) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="bg-zinc-900 p-8 rounded-3xl border border-white/10 w-[90%] max-w-sm text-center"
                    >
                        <h2 className="text-2xl font-black text-white mb-6">Exit game?</h2>
                        <p className="text-zinc-400 text-sm mb-8">Current match progress will be lost.</p>
                        <div className="grid grid-cols-2 gap-3 mb-8">
                            <button
                                onClick={() => onOpenChange(false)}
                                className="h-20 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 text-xl font-black hover:bg-green-500 hover:text-black transition-all"
                            >
                                Continue
                            </button>
                            <button
                                onClick={onConfirm}
                                className="h-20 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xl font-black hover:bg-red-500 hover:text-black transition-all"
                            >
                                Exit
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}