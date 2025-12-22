'use client';
import { Player } from '@/types/darts';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useAppSelector } from '@/lib/redux/hooks';

interface ScoreBoardProps {
    players: Player[];
    activePlayerIndex: number;
}

export function ScoreBoard({ players, activePlayerIndex }: ScoreBoardProps) {
    const match = useAppSelector(state => state.match);
    const active = match.active!;
    const currentLeg = active.currentLeg;
    return (
        <div className="flex w-full bg-black border-b border-white/5">
            {players.map((player, index) => {
                const isActive = index === activePlayerIndex;
                const playerColor = player.color || '#ffffff';

                const currentLegTurns = currentLeg.turns || [];
                const legDarts = currentLegTurns.filter(t => t.playerId === player.id).reduce((sum, t) => sum + (t.dartsUsed || 3), 0);
                const legPoints = currentLegTurns.filter(t => t.playerId === player.id).reduce((sum, t) => sum + (t.isBust ? 0 : t.points), 0);
                const legAvg = legDarts > 0 ? (legPoints / (legDarts / 3)).toFixed(1) : "0.0";

                return (
                    <div
                        key={player.id}
                        className={cn(
                            "flex-1 flex flex-col items-center pt-4 pb-6 px-3 transition-all duration-500 relative overflow-hidden",
                        )}
                        style={{
                            backgroundColor: isActive ? `${playerColor}08` : 'transparent'
                        }}
                    >
                        {/* Active Indicator Bar */}
                        {isActive && (
                            <motion.div
                                layoutId="active-bar"
                                className="absolute top-0 left-0 right-0 h-[3px] z-20"
                                style={{ backgroundColor: playerColor, boxShadow: `0 0 15px ${playerColor}` }}
                            />
                        )}

                        {/* Player Header */}
                        <div className="z-10 text-center w-full mb-2">
                            <h2 className={cn(
                                "text-[10px] font-black uppercase tracking-[0.15em] truncate px-2",
                                isActive ? "text-white" : "text-zinc-600"
                            )}>
                                {player.name}
                            </h2>
                        </div>

                        {/* Main Score - Хамгийн том, тод */}
                        <div className={cn(
                            "text-7xl font-black font-mono tracking-tighter tabular-nums leading-[0.9] my-2 transition-all duration-300",
                            isActive ? "text-white" : "text-zinc-600"
                        )}
                            style={isActive ? { textShadow: `0 0 30px ${playerColor}40` } : {}}
                        >
                            {player.score}
                        </div>

                        {/* Mini Stats Grid - 2 мөрөнд, нягт байрлалтай */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4">
                            <MiniStat label="SET" value={player.setsWon?.toString() || '0'} active={isActive} playerColor={playerColor} />
                            <MiniStat label="LEG" value={player.legsWon?.toString() || '0'} active={isActive} playerColor={playerColor} />
                            <MiniStat
                                label="AVG"
                                value={legAvg}
                                active={isActive}
                                playerColor={playerColor}
                            />
                            <MiniStat
                                label="DART"
                                value={legDarts?.toString() || '0'}
                                active={isActive}
                                playerColor={playerColor}
                            />
                        </div>

                        {index === 0 && (
                            <div className="absolute right-0 top-1/4 bottom-1/4 w-px bg-white/5" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function MiniStat({ label, value, active, playerColor }: { label: string, value: string, active: boolean, playerColor: string }) {
    return (
        <div className="flex flex-col items-start min-w-[35px]">
            <span className={cn(
                "text-[7px] font-black tracking-widest uppercase mb-0.5",
                active ? "opacity-40" : "opacity-20"
            )}
                style={{ color: active ? playerColor : '#fff' }}>
                {label}
            </span>
            <span
                className={cn(
                    "text-xs font-black font-mono leading-none transition-colors",
                    active ? "text-zinc-200" : "text-zinc-600"
                )}
            >
                {value}
            </span>
        </div>
    );
}