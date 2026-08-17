'use client';
import { useState, useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { selectCanUndo, submitTurn, undo, abandonMatch } from '@/lib/redux/matchSlice';
import { ScoreBoard } from '@/components/scoring/ScoreBoard';
import ScoreInputPanel from '@/components/scoring/ScoreInputPanel';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { LegTransition } from '@/components/scoring/LegTransition';
import { AppBar } from '@/components/ui/app-bar';
import { ExitConfirmation } from '@/components/match/ExitConfirmation';
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

    const prevStatusRef = useRef(match.status);

    useEffect(() => {
        if (match.status === 'match_finished') {
            if (prevStatusRef.current === 'match_finished') {
                // Arrived via browser back — go home, no bounce
                router.replace('/');
            } else {
                router.replace('/match/finished');
            }
        }
        prevStatusRef.current = match.status;
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
            {/* Match header — AppBar */}
            <AppBar
                title={`${match.settings.startingScore} · ${match.settings.checkout === 'double' ? 'D/O' : 'S/O'}`}
                onBack={() => setShowExitDialog(true)}
                backButtonIcon={<IconX size={18} />}
            />

            <div className="flex-1 flex flex-col justify-end pb-safe overflow-hidden">
                <ScoreBoard
                    players={match.players}
                    activePlayerIndex={currentPlayerIndex}
                    active={match.active!}
                />

                <ScoreInputPanel
                    onSubmit={(score, dartsUsed, isBust) =>
                        dispatch(submitTurn({ score, dartsUsed, isBust }))
                    }
                    currentScore={match.players[currentPlayerIndex].score}
                    checkout={match.settings.checkout}
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
            <ExitConfirmation
                open={showExitDialog}
                onOpenChange={setShowExitDialog}
                onConfirm={handleAbandon}
            />
        </div>
    );
}
