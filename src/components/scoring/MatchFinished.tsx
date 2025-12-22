"use client";

import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { startMatch } from "@/lib/redux/matchSlice"; // Rematch хийхэд ашиглана
import { Player } from "@/types/darts";
import { IconBolt, IconTarget, IconTrophy, IconRefresh, IconX, IconCrown } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";

interface MatchFinishedProps {
    winner: Player;
}

export function MatchFinished({ winner }: MatchFinishedProps) {
    const dispatch = useAppDispatch();
    const match = useAppSelector(state => state.match);
    const players = match.players;

    useEffect(() => {
        // Ялагчийн өнгөөр confetti буудуулах
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval = setInterval(() => {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }, colors: [winner.color] });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }, colors: [winner.color] });
        }, 250);

        return () => clearInterval(interval);
    }, [winner.color]);

    const handleRematch = () => {
        // Redux дээр match reset хийх логик
        // dispatch(startMatch());
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-6 overflow-y-auto"
        >
            <div className="w-full max-w-md my-auto">

                {/* 1. Champion Header */}
                <div className="text-center mb-10 relative">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", bounce: 0.6 }}
                        className="relative w-32 h-32 mx-auto mb-6"
                    >
                        <div className="absolute inset-0 rounded-full blur-3xl opacity-30 animate-pulse" style={{ backgroundColor: winner.color }} />
                        <div
                            className="relative w-full h-full flex items-center justify-center rounded-full border-4 shadow-2xl"
                            style={{ borderColor: winner.color, backgroundColor: `${winner.color}15` }}
                        >
                            <IconCrown size={60} color={winner.color} stroke={1.5} />
                        </div>
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="absolute -top-2 -right-2 bg-zinc-900 border border-white/10 p-2 rounded-xl"
                        >
                            <IconTrophy size={20} className="text-yellow-500" />
                        </motion.div>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="text-zinc-500 text-xs font-black uppercase tracking-[0.4em] mb-2"
                    >
                        Tournament Champion
                    </motion.p>
                    <motion.h1
                        initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
                        className="text-6xl font-black italic text-white uppercase tracking-tighter"
                    >
                        {winner.name}
                    </motion.h1>
                </div>

                {/* 2. Final Results Cards */}
                <div className="relative mb-8 px-2">
                    {/* Голын "VS" текст */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                        <span className="text-zinc-800 font-black italic text-sm tracking-widest">VS</span>
                    </div>

                    <div className="flex items-center gap-1 bg-zinc-900/40 p-1.5 rounded-[2.5rem] border border-white/5">
                        {players.map((player, idx) => {
                            const isWinner = player.id === winner.id;
                            const isFirst = idx === 0;

                            return (
                                <div key={player.id} className={cn(
                                    "flex flex-1 items-center gap-3 p-3 rounded-[2rem] transition-all",
                                    isWinner ? "bg-zinc-800/50 shadow-inner" : "opacity-60"
                                )}>
                                    {/* Текстийн хэсэг */}
                                    <div className={cn("flex-1", isFirst ? "text-right" : "text-left order-2")}>
                                        <h4 className={cn(
                                            "text-[10px] font-black uppercase tracking-wider leading-none mb-1",
                                            isWinner ? "text-white" : "text-zinc-500"
                                        )}>
                                            {player.name}
                                        </h4>
                                        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-tighter">
                                            {player.legsWon} Legs Won
                                        </p>
                                    </div>

                                    {/* Онооны блок */}
                                    <div className={cn(
                                        "w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-black italic transition-all",
                                        isWinner
                                            ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] scale-105"
                                            : "bg-zinc-900 text-zinc-600",
                                        !isFirst && "order-1"
                                    )}>
                                        {player.setsWon}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 3. Match Statistics Comparison */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                    className="bg-zinc-900/80 border border-white/5 rounded-[2.5rem] p-6 mb-10 shadow-2xl"
                >
                    <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest text-center mb-6">Match Statistics</h3>
                    <div className="space-y-6">
                        <StatRow
                            label="Match Average"
                            val1={(players[0].totalPointsScored / (players[0].totalDartsThrown / 3 || 1)).toFixed(1)}
                            val2={(players[1].totalPointsScored / (players[1].totalDartsThrown / 3 || 1)).toFixed(1)}
                            winnerId={winner.id}
                            players={players}
                        />
                        <StatRow
                            label="Total Darts"
                            val1={players[0].totalDartsThrown}
                            val2={players[1].totalDartsThrown}
                            winnerId={winner.id}
                            players={players}
                            inverse
                        />
                        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-white/5">
                            <div className="text-center">
                                <p className="text-[8px] font-bold text-zinc-600 uppercase mb-1">High Scores</p>
                                <p className="text-lg font-black text-white">{winner.totalPointsScored > 0 ? "8" : "0"}</p>
                            </div>
                            <div className="text-center border-x border-white/5">
                                <p className="text-[8px] font-bold text-zinc-600 uppercase mb-1">Checkout %</p>
                                <p className="text-lg font-black text-white">32%</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[8px] font-bold text-zinc-600 uppercase mb-1">180s</p>
                                <p className="text-lg font-black text-white" style={{ color: winner.color }}>2</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 4. Action Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}
                    className="grid grid-cols-1 gap-4"
                >
                    <button
                        onClick={handleRematch}
                        className="w-full py-5 rounded-2xl font-black text-xl transition-all active:scale-95 flex items-center justify-center gap-3"
                        style={{ backgroundColor: winner.color, color: '#000' }}
                    >
                        <IconRefresh size={24} stroke={3} />
                        PLAY REMATCH
                    </button>
                    <button className="w-full py-4 text-zinc-500 hover:text-white text-xs font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 transition-colors">
                        <IconX size={16} />
                        Back to Menu
                    </button>
                </motion.div>
            </div>
        </motion.div>
    );
}

// Статистик харьцуулах жижиг мөр
function StatRow({ label, val1, val2, players, inverse = false }: any) {
    const v1 = parseFloat(val1);
    const v2 = parseFloat(val2);
    const isP1Better = inverse ? v1 < v2 : v1 > v2;

    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center px-1">
                <span className={cn("text-xs font-mono font-black", isP1Better ? "text-white" : "text-zinc-600")}>{val1}</span>
                <span className="text-[8px] font-bold text-zinc-700 uppercase tracking-tighter">{label}</span>
                <span className={cn("text-xs font-mono font-black", !isP1Better ? "text-white" : "text-zinc-600")}>{val2}</span>
            </div>
            <div className="h-1 w-full bg-zinc-800 rounded-full flex overflow-hidden">
                <div
                    className="h-full transition-all"
                    style={{
                        width: `${(v1 / (v1 + v2)) * 100}%`,
                        backgroundColor: isP1Better ? players[0].color : '#27272a'
                    }}
                />
                <div
                    className="h-full transition-all"
                    style={{
                        width: `${(v2 / (v1 + v2)) * 100}%`,
                        backgroundColor: !isP1Better ? players[1].color : '#27272a'
                    }}
                />
            </div>
        </div>
    );
}