"use client";

import { Player, LegType, SetType } from "@/types/darts";
import { IconBolt, IconTarget, IconTrophy } from "@tabler/icons-react";
import { motion } from "framer-motion";

interface LegTransitionProps {
    winner: Player;
    players: Player[];
    currentLeg: LegType;
    currentSet: SetType;
    onNextLeg: () => void;
    onUndo: () => void;
}

export function LegTransition({ winner, players, currentLeg, currentSet, onNextLeg, onUndo }: LegTransitionProps) {

    const lastLegTurns = currentLeg.turns.filter(t => t.playerId === winner.id);
    const totalDarts = lastLegTurns.reduce((acc, t) => acc + (t.dartsUsed || 3), 0);
    const pointsInLeg = lastLegTurns.reduce((acc, t) => acc + t.points, 0);
    const legAverage = (pointsInLeg / lastLegTurns.length).toFixed(1);

    // Өндөр оноонуудыг тоолох (100+, 140+, 180)
    const highScores = lastLegTurns.filter(t => t.points >= 100).length;

    // currentSet.legs массиваас хожлыг нь тоолох
    const getLegsCountInThisSet = (playerId: string) => {
        return currentSet.legs.filter(leg => leg.winnerId === playerId).length;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 z-100 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6"
        >
            <div className="w-full max-w-sm">

                {/* 1. Winner Section */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0.5 }} animate={{ scale: 1 }}
                        className="w-20 h-20 mx-auto mb-4 flex items-center justify-center rounded-full"
                        style={{ backgroundColor: `${winner.color}20`, border: `2px solid ${winner.color}` }}
                    >
                        <IconTrophy size={40} color={winner.color} />
                    </motion.div>

                    <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-1">Leg Winner</p>
                    <h1
                        className="text-5xl font-black italic truncate px-4"
                        style={{ color: winner.color }}
                    >
                        {winner.name.toUpperCase()}
                    </h1>
                </div>

                {/* 2. Winner's Leg Stats (Энэ хэсэг одоо тодорхой болсон) */}
                <div className="bg-zinc-900/80 border border-white/5 rounded-3xl p-5 mb-6">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase mb-4 text-center tracking-tighter">Winner&apos;s Leg Performance</p>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col items-center border-r border-white/5">
                            <IconBolt size={18} className="text-zinc-500 mb-1" />
                            <p className="text-lg font-black text-white">{legAverage}</p>
                            <p className="text-[8px] text-zinc-600 font-bold uppercase">Avg</p>
                        </div>
                        <div className="flex flex-col items-center border-r border-white/5">
                            <IconTarget size={18} className="text-zinc-500 mb-1" />
                            <p className="text-lg font-black text-white">{totalDarts}</p>
                            <p className="text-[8px] text-zinc-600 font-bold uppercase">Darts</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-xs font-black text-white bg-white/10 px-2 py-1 rounded">100+</span>
                            <p className="text-lg font-black text-white mt-1">{highScores}</p>
                            <p className="text-[8px] text-zinc-600 font-bold uppercase">Highs</p>
                        </div>
                    </div>
                </div>

                {/* 3. Global Match Score (Харьцаа харуулах хэсэг) */}
                <div className="flex items-center justify-between px-2 mb-10">
                    <div className="flex flex-col items-center flex-1">
                        {/* players[0].legsWon биш, getLegsInSet ашиглах */}
                        <p className="text-4xl font-black text-white">{getLegsCountInThisSet(players[0].id)}</p>
                        <p className="text-[8px] text-zinc-600 uppercase font-black">Legs</p>
                        {/* Хэрэв сеттэй бол сет-ийн оноог нь доор нь жижиг тавьж болно */}
                        <div className="mt-2 px-2 py-0.5 bg-white/5 rounded text-[10px] font-bold text-zinc-400">
                            SET SCORE: {players[0].setsWon}
                        </div>
                    </div>

                    <div className="px-6 flex flex-col items-center">
                        <span className="text-[10px] text-zinc-700 font-black mb-1">SCORE</span>
                        <div className="h-px w-8 bg-zinc-800" />
                    </div>

                    <div className="flex flex-col items-center flex-1">
                        <p className="text-4xl font-black text-white">{getLegsCountInThisSet(players[1].id)}</p>
                        <p className="text-[8px] text-zinc-600 uppercase font-black">Legs</p>
                        <div className="mt-2 px-2 py-0.5 bg-white/5 rounded text-[10px] font-bold text-zinc-400">
                            SET SCORE: {players[1].setsWon}
                        </div>
                    </div>
                </div>

                {/* 4. Actions */}
                <div className="space-y-3">
                    <button
                        onClick={onNextLeg}
                        className="w-full py-5 rounded-2xl font-black text-xl transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3"
                        style={{ backgroundColor: winner.color, color: '#000' }}
                    >
                        START NEXT LEG
                    </button>
                    <button onClick={onUndo} className="w-full py-2 text-zinc-600 text-xs font-bold uppercase tracking-widest">
                        Undo (Mistake)
                    </button>
                </div>
            </div>
        </motion.div>
    );
}