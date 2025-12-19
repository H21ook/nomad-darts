'use client';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { selectCanUndo, submitTurn, undo, nextLeg } from '@/lib/redux/matchSlice';
import { ScoreBoard } from '@/components/scoring/ScoreBoard';
import { NumberPad } from '@/components/scoring/NumberPad';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { LegTransition } from '@/components/scoring/LegTransition';

export default function MatchPage() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const match = useAppSelector(state => state.match);
    const lastLegWinnerId = match.lastLegWinnerId;
    const lastLegWinner = match.players.find(p => p.id === lastLegWinnerId);
    const canUndo = useAppSelector(selectCanUndo);
    const currentPlayerIndex = match.active?.playerIndex ?? 0;
    // const currentPlayer = match.players[currentPlayerIndex];

    // Redirect if not playing or finished
    useEffect(() => {
        if (match.status === 'setup') {
            router.replace('/');
        }
    }, [match.status, router]);

    const handleSubmit = (score: number, dartsUsed?: number) => {
        dispatch(submitTurn({ score, dartsUsed }));
    };

    const handleUndo = () => {
        dispatch(undo());
    };

    const handleNewMatch = () => {
        router.replace('/');
    };

    if (match.status === 'setup') return null; // Or loading spinner

    // if (match.status === 'finished') {
    //     const winner = match.players.find(p => p.id === match.winnerId);
    //     return (
    //         <div className="flex flex-col items-center justify-center min-h-screen bg-[#0D0D0D] text-white p-6 space-y-8 animate-in fade-in">
    //             <IconTrophy size={64} className="text-yellow-400" />
    //             <div className="text-center">
    //                 <h1 className="text-5xl font-bold text-cyan-400 mb-2">{winner?.name} Wins!</h1>
    //                 <p className="text-gray-400 text-lg">Match Finished</p>
    //             </div>
    //             <button
    //                 onClick={handleNewMatch}
    //                 className="px-8 py-3 bg-cyan-600 text-black font-bold rounded-lg shadow-lg hover:bg-cyan-500 transition-all"
    //             >
    //                 Play Again
    //             </button>
    //         </div>
    //     );
    // }

    return (
        <div className="flex flex-col h-dvh bg-[#0D0D0D] overflow-hidden">
            {/* Undo Header - Small absolute or top bar */}
            {/* <div className="absolute top-4 left-4 z-50">
                <button
                    onClick={handleUndo}
                    disabled={match.history.length === 0}
                    className="p-2 bg-gray-800 rounded-full text-gray-400 disabled:opacity-30 hover:text-white"
                >
                    <IconArrowBackUp size={24} />
                </button>
            </div> */}

            <div className="flex-none">
                <ScoreBoard
                    players={match.players}
                    activePlayerIndex={currentPlayerIndex}
                />
            </div>

            <div className="flex-1 flex flex-col justify-end pb-safe">
                <NumberPad onSubmit={handleSubmit} className="flex-1" currentScore={match.players[currentPlayerIndex].score} onUndo={handleUndo} canUndo={canUndo} />
            </div>

            <AnimatePresence>
                {match.status === 'leg_finished' && lastLegWinner && match.active && (
                    <LegTransition
                        winner={lastLegWinner}
                        players={match.players}
                        currentLeg={match.active.currentLeg}
                        currentSet={match.active.currentSet}
                        onNextLeg={() => dispatch(nextLeg())}
                        onUndo={() => dispatch(undo())}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
