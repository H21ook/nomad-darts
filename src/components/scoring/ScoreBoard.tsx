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
        <div className="flex w-full bg-black border-b border-white/5">
            {players.map((player, index) => {
                const isActive = index === activePlayerIndex;
                // Тоглогч бүрт өөр өнгө оноох (Жишээ нь 1: Cyan, 2: Rose)
                const playerColorClass = index === 0 ? "cyan" : "rose";

                return (
                    <div
                        key={player.id}
                        className={cn(
                            "flex-1 flex flex-col items-center py-6 px-2 transition-all duration-500 relative",
                            isActive
                                ? index === 0 ? "bg-cyan-500/10" : "bg-rose-500/10"
                                : "bg-transparent opacity-40"
                        )}
                    >
                        {/* Active Indicator Bar - Хамгийн дээд талд */}
                        {isActive && (
                            <motion.div
                                layoutId="active-bar"
                                className={cn(
                                    "absolute top-0 left-0 right-0 h-1",
                                    index === 0 ? "bg-cyan-400" : "bg-rose-400"
                                )}
                            />
                        )}

                        <div className="z-10 text-center w-full space-y-1">
                            {/* Status - Нэрний дээд талд, жижигхэн */}
                            <div className={cn(
                                "text-[10px] font-black uppercase tracking-[0.2em] h-4 transition-colors",
                                isActive
                                    ? index === 0 ? "text-cyan-400" : "text-rose-400"
                                    : "text-transparent"
                            )}>
                                {isActive ? "• Shooting" : ""}
                            </div>

                            <h2 className={cn(
                                "text-xs font-bold uppercase tracking-widest truncate max-w-[120px] mx-auto",
                                isActive ? "text-white" : "text-gray-500"
                            )}>
                                {player.name}
                            </h2>

                            <div className={cn(
                                "text-7xl font-black font-mono tracking-tighter tabular-nums leading-none py-2",
                                isActive ? "text-white" : "text-gray-600"
                            )}>
                                {player.score}
                            </div>

                            {/* Sets & Legs - Илүү нягтралтай */}
                            <div className="flex justify-center gap-6 pt-2">
                                <MiniStat label="S" value={player.setsWon} active={isActive} />
                                <MiniStat label="L" value={player.legsWon} active={isActive} />
                                {/* <MiniStat label="AVG" value={player.average?.toFixed(1) || "0.0"} active={isActive} /> */}
                            </div>
                        </div>

                        {/* Дунд талын зааглагч зураас (Зөвхөн эхний тоглогчийн ард) */}
                        {index === 0 && (
                            <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-white/10" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function MiniStat({ label, value, active }: { label: string, value: any, active: boolean }) {
    return (
        <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold text-gray-600 tracking-tighter leading-none mb-1">{label}</span>
            <span className={cn("text-sm font-mono font-bold", active ? "text-gray-300" : "text-gray-600")}>{value}</span>
        </div>
    );
}