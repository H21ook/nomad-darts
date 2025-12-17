'use client';
import { useState } from 'react';
import { useAppDispatch } from '@/lib/redux/hooks';
import { startMatch } from '@/lib/redux/matchSlice';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function MatchSetup() {
    const dispatch = useAppDispatch();
    const router = useRouter();

    const [gameType, setGameType] = useState<number>(501);
    const [sets, setSets] = useState(1);
    const [legs, setLegs] = useState(3);
    const [player1, setPlayer1] = useState('Player 1');
    const [player2, setPlayer2] = useState('Player 2');

    const handleStart = () => {
        dispatch(startMatch({
            startingScore: gameType,
            setsToWinMatch: sets,
            legsToWinSet: legs,
            players: [player1, player2]
        }));
        // Navigate is not needed if this component is conditionally rendered or used in a flow
        // But if we have a separate route:
        router.push('/match');
    };

    return (
        <div className="flex flex-col gap-8 p-6 max-w-md mx-auto w-full text-white">
            <h1 className="text-3xl font-bold text-cyan-400">New Match</h1>

            {/* Game Type */}
            <div className="space-y-3">
                <label className="text-sm text-gray-400 uppercase tracking-wider">Starting Score</label>
                <div className="flex bg-gray-900 rounded-lg p-1">
                    {[301, 501].map((type) => (
                        <button
                            key={type}
                            onClick={() => setGameType(type)}
                            className={cn(
                                "flex-1 py-3 mobile-touch-target rounded-md text-sm font-bold transition-all",
                                gameType === type ? "bg-cyan-600 text-black shadow-md" : "text-gray-400 hover:text-white"
                            )}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Players */}
            <div className="space-y-4">
                <label className="text-sm text-gray-400 uppercase tracking-wider">Players</label>
                <div className="space-y-3">
                    <input
                        value={player1}
                        onChange={(e) => setPlayer1(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-lg p-4 text-white placeholder-gray-600 focus:border-cyan-500 focus:outline-none transition-colors"
                        placeholder="Player 1 Name"
                    />
                    <input
                        value={player2}
                        onChange={(e) => setPlayer2(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-lg p-4 text-white placeholder-gray-600 focus:border-cyan-500 focus:outline-none transition-colors"
                        placeholder="Player 2 Name"
                    />
                </div>
            </div>

            {/* Format */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                    <label className="text-sm text-gray-400 uppercase tracking-wider">Sets</label>
                    <div className="flex items-center gap-3 bg-gray-900 rounded-lg p-2">
                        <button onClick={() => setSets(Math.max(1, sets - 1))} className="p-2 text-cyan-400 font-bold">-</button>
                        <span className="flex-1 text-center font-mono font-bold">{sets}</span>
                        <button onClick={() => setSets(sets + 1)} className="p-2 text-cyan-400 font-bold">+</button>
                    </div>
                </div>
                <div className="space-y-3">
                    <label className="text-sm text-gray-400 uppercase tracking-wider">Legs</label>
                    <div className="flex items-center gap-3 bg-gray-900 rounded-lg p-2">
                        <button onClick={() => setLegs(Math.max(1, legs - 1))} className="p-2 text-cyan-400 font-bold">-</button>
                        <span className="flex-1 text-center font-mono font-bold">{legs}</span>
                        <button onClick={() => setLegs(legs + 1)} className="p-2 text-cyan-400 font-bold">+</button>
                    </div>
                </div>
            </div>

            <button
                onClick={handleStart}
                className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(0,255,255,0.3)] transition-all active:scale-95"
            >
                START GAME
            </button>
        </div>
    );
}
