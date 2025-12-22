"use client";

import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { startMatch, undo } from "@/lib/redux/matchSlice"; // Rematch хийхэд ашиглана
import { Player } from "@/types/darts";
import { IconBolt, IconTarget, IconTrophy, IconRefresh, IconX, IconCrown, IconRotateClockwise2 } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { AppBar } from "../ui/app-bar";

interface MatchFinishedProps {
    winner: Player;
}

export function MatchFinished({ winner }: MatchFinishedProps) {
    const dispatch = useAppDispatch();
    const match = useAppSelector(state => state.match);
    const players = match.players;

    // Статистик тооцоолох функц
    const getAvg = (p: Player) => (p.totalPointsScored / (p.totalDartsThrown / 3 || 1)).toFixed(1);

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
            className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col overflow-hidden"
        >
            {/* 1. Top Bar: Undo & Status */}
            <AppBar title="Match Result" onBack={() => { }} description="ID: #B829-X • 24 OCT 2023" />
            {/* <div className="flex justify-between items-center mb-6 pt-safe">
                <button
                    onClick={() => dispatch(undo())}
                    className="p-3 rounded-full bg-zinc-900 border border-white/5 text-zinc-400 active:scale-90 transition-transform"
                >
                    <IconRotateClockwise2 size={20} />
                </button>
                <div className="px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/50">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Match Result</span>
                </div>
                <div className="w-10" />
            </div> */}

            <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full space-y-8 p-4">

                {/* 2. Winner Announcement */}
                {/* <div className="text-center">
                    <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
                        Match <span className="text-cyan-400">Won</span>
                    </h2>
                    <p className="text-[10px] font-bold text-zinc-600 mt-2 uppercase tracking-[0.2em]">
                        ID: #B829-X • 24 OCT 2023
                    </p>
                </div> */}

                <div className="flex flex-col items-center mb-10">
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="relative mb-4"
                    >
                        <div className="absolute inset-0 blur-2xl opacity-20" style={{ backgroundColor: winner.color }} />
                        <IconCrown size={64} style={{ color: winner.color }} stroke={1.5} />
                    </motion.div>
                    <h2 className="text-xs font-black text-zinc-600 uppercase tracking-[0.4em] mb-1">Winner</h2>
                    <h1 className="text-5xl font-black italic text-white uppercase tracking-tighter italic">
                        {winner.name}
                    </h1>
                </div>

                {/* <div className="flex gap-3 px-2">
                    {players.map((player, idx) => {
                        const isWinner = player.id === winner.id;
                        return (
                            <div
                                key={player.id}
                                className={cn(
                                    "flex-1 p-4 rounded-[2rem] border transition-all flex flex-col items-center space-y-3",
                                    isWinner
                                        ? "bg-zinc-900 border-cyan-500/40 shadow-lg"
                                        : "bg-zinc-900/40 border-white/5 opacity-50"
                                )}
                            >
                                <div className={cn(
                                    "w-12 h-12 rounded-full border-2 p-1 flex items-center justify-center",
                                    isWinner ? "border-cyan-500 bg-cyan-500/10" : "border-zinc-800 bg-zinc-800/50"
                                )}>
                                    <IconCrown size={22} className={isWinner ? "text-cyan-400" : "text-zinc-700"} />
                                </div>
                                <div className="text-center overflow-hidden w-full">
                                    <h4 className="text-[10px] font-black text-white uppercase truncate">
                                        {player.name}
                                    </h4>
                                    <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">
                                        {player.legsWon} Legs
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div> */}

                {/* 4. Final Score Section (Below Cards) */}
                <div className="flex flex-col items-center py-4">
                    <div className="flex items-center gap-6">
                        <span className="text-6xl font-black italic text-white drop-shadow-lg leading-none">
                            {players[0].setsWon}
                        </span>
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-zinc-800 font-black italic text-sm tracking-[0.3em] ml-2">VS</span>
                            <div className="flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "w-1 h-3 rounded-full transition-colors",
                                            i < 3 ? "bg-cyan-500/80" : "bg-zinc-800"
                                        )}
                                    />
                                ))}
                            </div>
                        </div>
                        <span className="text-6xl font-black italic text-white drop-shadow-lg leading-none">
                            {players[1].setsWon}
                        </span>
                    </div>
                    <p className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.5em] mt-4">
                        Final Score
                    </p>
                </div>

                {/* 4. Mini Stats Grid */}
                <div className="grid grid-cols-3 gap-2">
                    <StatBox label="Rank" value="#1" color={winner.color} />
                    <StatBox label="Level" value="52" color={winner.color} />
                    <StatBox label="XP" value="+250" isPositive color={winner.color} />
                </div>

                {/* 5. Main Action */}
                <div className="space-y-3 pt-4">
                    <button
                        onClick={handleRematch}
                        className="w-full py-4 rounded-2xl font-black text-lg transition-all active:scale-95 bg-cyan-500 text-black shadow-[0_10px_20px_rgba(6,182,212,0.2)]"
                    >
                        PLAY REMATCH
                    </button>
                    <button className="w-full py-2 text-zinc-600 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] transition-colors">
                        Back to Menu
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// Статистик харьцуулах жижиг мөр
function StatBox({ label, value, isPositive, color }: any) {
    return (
        <div className="bg-zinc-900/60 border border-white/5 p-3 rounded-2xl text-center">
            <p className="text-[8px] font-bold text-zinc-600 uppercase mb-1">{label}</p>
            <p className={cn("text-xs font-black", isPositive ? "text-cyan-400" : "text-white")}>{value}</p>
        </div>
    );
}