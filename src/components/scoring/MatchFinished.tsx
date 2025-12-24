"use client";

import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { rematch, undo } from "@/lib/redux/matchSlice"; // Rematch хийхэд ашиглана
import { Player } from "@/types/darts";
import { IconTrophy, IconCrown, IconChartBar, IconArrowBarToLeftDashed } from "@tabler/icons-react";
import { motion, Transition } from "framer-motion";
import { useEffect } from "react";
import confetti from "canvas-confetti";
import { AppBar } from "../ui/app-bar";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface MatchFinishedProps {
    winner: Player;
}

export function MatchFinished({ winner }: MatchFinishedProps) {
    const dispatch = useAppDispatch();
    const match = useAppSelector(state => state.match);
    const players = match.players;
    const router = useRouter();

    // Статистик тооцоолох функц
    const getAvg = (p: Player) => (p.totalPointsScored / (p.totalDartsThrown / 3 || 1)).toFixed(1);

    // Undo үйлдэл
    const handleUndoMatch = () => dispatch(undo());
    const handleRematch = () => dispatch(rematch());

    useEffect(() => {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;

        const defaults = {
            startVelocity: 30,
            spread: 360,
            ticks: 60,
            zIndex: 300, // ✅ FIX
        };

        const randomInRange = (min: number, max: number) =>
            Math.random() * (max - min) + min;

        const interval = setInterval(() => {
            if (document.hidden) return;
            if (window.matchMedia('(prefers-reduced-motion)').matches) return;

            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) {
                clearInterval(interval);
                return;
            }

            const particleCount = 50 * (timeLeft / duration);

            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
                colors: [winner.color],
            });

            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
                colors: [winner.color],
            });
        }, 300);

        return () => clearInterval(interval);
    }, [winner.color]);


    const backToMenu = () => {
        router.push('/');
    };

    const fadeInUp = {
        initial: { opacity: 0, y: 15 },
        animate: { opacity: 1, y: 0 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transition: { duration: 0.5, ease: "easeOut" } as Transition<any>
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-200 bg-zinc-950 flex flex-col pb-safe overflow-hidden"
        >
            {/* 1. AppBar: Undo холбогдсон */}
            <AppBar
                title="Match Result"
                onBack={backToMenu}
                backButtonIcon={<IconArrowBarToLeftDashed size={24} />}
                description={`ID: #${match?.id?.slice(0, 6) || 'B829-X'} • 24 OCT 2023`}
            />

            <div className="flex-1 flex flex-col justify-between p-4 max-w-sm mx-auto w-full">

                {/* 2. Winner Section: Хэмжээг багасгасан */}
                <motion.div
                    {...fadeInUp}
                    transition={{ ...fadeInUp.transition, delay: 0.2 }}
                    className="flex flex-col items-center pt-2"
                >
                    <div className="relative mb-4">
                        <div className="absolute inset-0 rounded-full blur-xl opacity-20 animate-pulse" style={{ backgroundColor: winner.color }} />
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full border-[3px] p-1 flex items-center justify-center bg-zinc-950 shadow-2xl" style={{ borderColor: winner.color }}>
                                <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900 flex items-center justify-center">
                                    {winner.image ? (
                                        <Image src={winner.image} alt={winner.name} height={40} width={40} className="size-10 object-cover" />
                                    ) : (
                                        <IconCrown size={40} style={{ color: winner.color }} />
                                    )}
                                </div>
                            </div>
                            <div className="absolute -top-1 -right-1 w-8 h-8 bg-zinc-900 rounded-full border-2 border-zinc-800 flex items-center justify-center shadow-xl">
                                <IconTrophy size={16} className="text-yellow-500" />
                            </div>
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                                <div className="px-4 py-0.5 rounded-full shadow-lg border border-white/10 flex items-center justify-center" style={{ backgroundColor: winner.color }}>
                                    <span className="text-[10px] font-black text-black uppercase tracking-widest">Winner</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <h1 className="text-2xl font-black italic text-white uppercase tracking-tighter">{winner.name}</h1>
                </motion.div>

                {/* 3. Score Section: Зайг шахав */}
                <motion.div
                    {...fadeInUp}
                    transition={{ ...fadeInUp.transition, delay: 0.4 }}
                    className="flex flex-col items-center"
                >
                    <div className="flex items-center gap-8">
                        <span className="text-6xl font-black italic text-white leading-none">{players[0].setsWon}</span>
                        <div className="flex flex-col items-center gap-1 opacity-20">
                            <span className="text-xs font-black italic tracking-widest">VS</span>
                            <div className="h-10 w-px bg-white" />
                        </div>
                        <span className="text-6xl font-black italic text-white leading-none">{players[1].setsWon}</span>
                    </div>
                    <p className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.5em] mt-6">Match Result</p>
                </motion.div>

                {/* 4. Statistics & Full View Link */}
                <motion.div
                    {...fadeInUp}
                    transition={{ ...fadeInUp.transition, delay: 0.6 }}
                    className="space-y-4"
                >
                    <div className="grid grid-cols-3 gap-2 px-2">
                        <StatBox label="Average" value={getAvg(players[0])} color={winner.color} />
                        <StatBox label="Darts" value={players[0].totalDartsThrown.toString()} color={winner.color} />
                        <StatBox label="Checkout" value="32%" color={winner.color} />
                    </div>
                    <button className="flex items-center gap-2 mx-auto text-zinc-600 hover:text-white transition-colors py-1">
                        <IconChartBar size={14} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Full Statistics</span>
                    </button>
                </motion.div>

                {/* 5. Action Buttons: Доор нь тулгаж өгөв */}
                <motion.div
                    {...fadeInUp}
                    transition={{ ...fadeInUp.transition, delay: 0.8 }}
                    className="space-y-2 mt-2"
                >
                    <button onClick={handleRematch}
                        className="w-full py-4 rounded-xl font-black text-lg transition-all active:scale-95 bg-cyan-500 text-black shadow-2xl">
                        PLAY REMATCH
                    </button>
                    <button onClick={() => {
                        handleUndoMatch();
                    }}
                        className="w-full py-2 text-zinc-600 font-black text-[10px] uppercase tracking-[0.3em] active:text-white">
                        Undo last turn
                    </button>
                </motion.div>
            </div>
        </motion.div>
    );
}

// Статистик харьцуулах жижиг мөр
function StatBox({ label, value, isPositive }: {
    label: string;
    value: string;
    isPositive?: boolean;
    color?: string;
}) {
    return (
        <div className="bg-zinc-900/60 border border-white/5 p-3 rounded-2xl text-center">
            <p className="text-[8px] font-bold text-zinc-600 uppercase mb-1">{label}</p>
            <p className={cn("text-xs font-black", isPositive ? "text-cyan-400" : "text-white")}>{value}</p>
        </div>
    );
}