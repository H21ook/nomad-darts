'use client';
import { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { selectCanUndo, submitTurn, undo, abandonMatch } from '@/lib/redux/matchSlice';
import { ScoreBoard } from '@/components/scoring/ScoreBoard';
import { NumberPad } from '@/components/scoring/NumberPad';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { LegTransition } from '@/components/scoring/LegTransition';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { IconX } from '@tabler/icons-react';

export default function MatchPage() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const match = useAppSelector(state => state.match);
    const [showExitDialog, setShowExitDialog] = useState(false);

    const lastLegWinner = match.lastLegWinnerId
        ? match.players.find(p => p.id === match.lastLegWinnerId)
        : null;

    const currentPlayerIndex = match.active?.playerIndex ?? 0;
    const canUndo = useAppSelector(selectCanUndo);

    // Hardware/gesture back button-г interceptor хийх
    useEffect(() => {
        // Dummy history entry нэмж back button-г барих боломжтой болгоно
        window.history.pushState({ match: true }, '');

        const handlePopState = () => {
            setShowExitDialog(true);
            // Dialog-г хаасан ч дахин back дарах боломжтой байх
            window.history.pushState({ match: true }, '');
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    useEffect(() => {
        if (match.status === 'match_finished') {
            router.replace('/match/finished');
        }
    }, [match.status, router]);

    useEffect(() => {
        if (match.status === 'setup') router.replace('/');
    }, [match.status, router]);

    if (match.status === 'setup') return null;

    const handleAbandon = () => {
        dispatch(abandonMatch());
        router.replace('/');
    };

    return (
        <div className="flex flex-col h-dvh bg-background overflow-hidden">
            {/* Compact match header — X товч */}
            <div className="flex items-center justify-between px-3 h-10 shrink-0 border-b border-white/5">
                <button
                    onPointerDown={(e) => { e.preventDefault(); setShowExitDialog(true); }}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-600 active:text-white transition-colors"
                    aria-label="Тоглоомоос гарах"
                >
                    <IconX size={18} />
                </button>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700">
                    {match.settings.startingScore} · {match.settings.checkout === 'double' ? 'D/O' : 'S/O'}
                </span>
                <div className="w-8" />
            </div>

            <div className="flex-1 flex flex-col justify-end pb-safe overflow-hidden">
                <ScoreBoard
                    players={match.players}
                    activePlayerIndex={currentPlayerIndex}
                    active={match.active!}
                />

                <NumberPad
                    onSubmit={(score, dartsUsed, isBust) =>
                        dispatch(submitTurn({ score, dartsUsed, isBust }))
                    }
                    currentScore={match.players[currentPlayerIndex].score}
                    onUndo={() => dispatch(undo())}
                    canUndo={canUndo}
                />
            </div>

            <AnimatePresence>
                {match.status === 'leg_finished' && lastLegWinner && (
                    <motion.div
                        key="leg-finished"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50"
                    >
                        <LegTransition winner={lastLegWinner} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Тоглоомоос гарах confirmation dialog */}
            <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
                <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Тоглоомоос гарах уу?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Одоогийн тоглоомын явц устагдана.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Үргэлжлүүлэх</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={handleAbandon}
                        >
                            Гарах
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
