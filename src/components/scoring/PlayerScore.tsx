import { cn } from '@/lib/utils';
import { Player } from '@/types/darts';
import { motion } from 'framer-motion';

interface PlayerScoreProps {
    player: Player;
    isActive: boolean;
    legAvg: string;
    legDarts: number;
}

const PlayerScore = ({ player, isActive, legAvg, legDarts }: PlayerScoreProps) => {
    const playerColor = player.color;

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
                    layoutId="active-player-indicator"
                    className="absolute top-0 left-0 right-0 h-[3px]"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    style={{ backgroundColor: player.color }}
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

            {/* {index === 0 && (
                <div className="absolute right-0 top-1/4 bottom-1/4 w-px bg-white/5" />
            )} */}
        </div>
    )
}

export default PlayerScore

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