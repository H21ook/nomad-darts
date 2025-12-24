'use client';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { selectCanUndo, submitTurn, undo } from '@/lib/redux/matchSlice';
import { ScoreBoard } from '@/components/scoring/ScoreBoard';
import { NumberPad } from '@/components/scoring/NumberPad';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LegTransition } from '@/components/scoring/LegTransition';
import { MatchFinished } from '@/components/scoring/MatchFinished';

export default function MatchPage() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const match = useAppSelector(state => state.match);

    const winner = match.winnerId
        ? match.players.find(p => p.id === match.winnerId)
        : null;

    const lastLegWinner = match.lastLegWinnerId
        ? match.players.find(p => p.id === match.lastLegWinnerId)
        : null;

    const currentPlayerIndex = match.active?.playerIndex ?? 0;
    const canUndo = useAppSelector(selectCanUndo);

    useEffect(() => {
        if (match.status === 'setup') router.replace('/');
    }, [match.status, router]);
    if (match.status === 'setup') return null;

    return (
        <div className="flex flex-col h-dvh bg-[#0D0D0D] overflow-hidden">
            <div className="flex-1 flex flex-col justify-end pb-safe">
                <ScoreBoard
                    players={match.players}
                    activePlayerIndex={currentPlayerIndex}
                    active={match.active!}
                />

                <NumberPad
                    onSubmit={(score, dartsUsed) =>
                        dispatch(submitTurn({ score, dartsUsed }))
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

                {match.status === 'finished' && winner && (
                    <motion.div
                        key="match-finished"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50"
                    >
                        <MatchFinished winner={winner} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
