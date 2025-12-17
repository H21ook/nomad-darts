'use client';
import { Player } from '@/types/darts';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ScoreBoardProps {
    players: Player[];
    activePlayerIndex: number;
}

export function ScoreBoard({ players, activePlayerIndex }: ScoreBoardProps) {
    return (
        <div className="flex w-full bg-[#0D0D0D] pt-4">
            {players.map((player, index) => {
                const isActive = index === activePlayerIndex;
                return (
                    <div
                        key={player.id}
                        className={cn(
                            "flex-1 flex flex-col items-center justify-center p-4 transition-colors duration-300 relative border-b-2",
                            isActive ? "bg-[#1A1A1A] border-cyan-400" : "bg-[#0D0D0D] border-transparent opacity-50"
                        )}
                    >
                        {/* Active Indicator Glow */}
                        {isActive && (
                            <motion.div
                                layoutId="active-glow"
                                className="absolute inset-0 bg-cyan-500/5 z-0"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            />
                        )}

                        <div className="z-10 text-center w-full">
                            <h2 className={cn("text-lg font-bold mb-1 truncate px-2", isActive ? "text-cyan-400" : "text-gray-500")}>
                                {player.name}
                            </h2>

                            <div className="text-7xl font-mono font-bold tracking-tighter text-white tabular-nums my-2">
                                {player.score}
                            </div>

                            {/* Sets / Legs */}
                            <div className="flex justify-center gap-4 text-xs font-mono text-gray-400 mt-2">
                                <div className="flex flex-col items-center">
                                    <span className="uppercase text-[10px] tracking-wider text-gray-600">Sets</span>
                                    <span className="text-xl font-bold text-white">{player.setsWon}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="uppercase text-[10px] tracking-wider text-gray-600">Legs</span>
                                    <span className="text-xl font-bold text-white">{player.legsWon}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
