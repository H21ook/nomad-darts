"use client";

import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { startNextLeg, undo } from "@/lib/redux/matchSlice";
import { Player } from "@/types/darts";
import { IconBolt, IconTarget, IconTrophy } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";

interface LegTransitionProps {
    winner: Player;
}

export function LegTransition({ winner }: LegTransitionProps) {

    const dispatch = useAppDispatch();
    const match = useAppSelector(state => state.match);
    const settings = match.settings;

    // Active-г заавал байна гэж үзнэ
    const active = match.active!;
    const players = match.players;
    const currentLeg = active.currentLeg;
    const onNextLeg = () => dispatch(startNextLeg());
    const onUndo = () => dispatch(undo());

    const isSetWon = winner.legsWon >= settings.firstToLegs;
    const [displayLegs, setDisplayLegs] = useState<Record<string, number>>(() => {
        const initialLegs: Record<string, number> = {};
        players.forEach(p => {
            initialLegs[p.id] = p.id === winner.id ? p.legsWon - 1 : p.legsWon;
        });
        return initialLegs;
    });

    const [displaySets, setDisplaySets] = useState<Record<string, number>>(() => {
        const initialSets: Record<string, number> = {};
        players.forEach(p => {
            initialSets[p.id] = p.id === winner.id && isSetWon ? p.setsWon - 1 : p.setsWon;
        });
        return initialSets;
    });

    const [showParticle, setShowParticle] = useState(false);
    const [isHittingSet, setIsHittingSet] = useState(false);
    const [isLegJumping, setIsLegJumping] = useState(false);

    useEffect(() => {
        // 0.8s Delay - Leg оноо нэмэгдэх
        const timer1 = setTimeout(() => {
            setIsLegJumping(true);
            setDisplayLegs(prev => ({ ...prev, [winner.id]: winner.legsWon }));

            if (isSetWon) {
                // 1.8s Delay - Нисэх цэг
                const timer2 = setTimeout(() => {
                    setShowParticle(true);

                    // 2.4s - Мөргөх агшин
                    const timer3 = setTimeout(() => {
                        setShowParticle(false);
                        setIsHittingSet(true);

                        setDisplaySets(prev => ({ ...prev, [winner.id]: winner.setsWon }));
                        setDisplayLegs(prev => ({ ...prev, [winner.id]: 0 }));

                        setTimeout(() => setIsHittingSet(false), 500);
                    }, 600);

                    return () => clearTimeout(timer3);
                }, 1000);
                return () => clearTimeout(timer2);
            }
        }, 2000);

        return () => clearTimeout(timer1);
    }, [winner.id, winner.legsWon, winner.setsWon, isSetWon]);

    const lastLegTurns = currentLeg.turns.filter(t => t.playerId === winner.id);
    const totalDarts = lastLegTurns.reduce((acc, t) => acc + (t.dartsUsed || 3), 0);
    const pointsInLeg = lastLegTurns.reduce((acc, t) => acc + t.points, 0);

    // Дундаж бодох (3 суманд шилжүүлсэн)
    const legAverage = totalDarts > 0 ? ((pointsInLeg / totalDarts) * 3).toFixed(1) : "0.0";
    const highScores = lastLegTurns.filter(t => t.points >= 100).length;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-100 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6"
        >
            <div className="w-full max-w-sm">

                {/* 1. Trophy & Winner Name Animation */}
                <div className="text-center mb-8">
                    <div className="relative">
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", damping: 12, delay: 0.1 }}
                            className="w-20 h-20 mx-auto mb-4 flex items-center justify-center rounded-full shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                            style={{ backgroundColor: `${winner.color}20`, border: `2px solid ${winner.color}` }}
                        >
                            {winner.image ? (
                                <Image src={winner.image} alt={winner.name} height={36} width={36} className="size-9 object-cover" />
                            ) : (
                                <IconTrophy size={36} color={winner.color} />
                            )}
                        </motion.div>

                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <div className="px-2 py-0.5 rounded-full shadow-lg border border-white/10 flex items-center justify-center" style={{ backgroundColor: winner.color }}>
                                    <span className="text-[10px] font-black text-black uppercase tracking-widest">Leg Winner</span>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    <motion.h1
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, type: "spring" }}
                        className="text-2xl font-black italic truncate px-4"
                    >
                        {winner.name.toUpperCase()}
                    </motion.h1>
                </div>

                {/* 3. Global Match Score (Legs & Sets Progression) */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="flex items-center justify-between px-2 mb-12">
                        {players.map((player) => {
                            const isWinner = player.id === winner.id;

                            return (
                                <div key={player.id} className="flex flex-col items-center flex-1">
                                    <p className="text-[10px] text-zinc-600 font-black uppercase mb-1 tracking-tighter opacity-50">{player.name}</p>

                                    {/* Leg Count Animation */}
                                    <div className="relative">
                                        {/* Leg Count */}
                                        <motion.p
                                            animate={isWinner && isLegJumping ?
                                                { scale: [1, 1.5, 1], color: [winner.color, "#ffffff"] } :
                                                { scale: 1 }
                                            }
                                            transition={{ duration: 0.4 }}
                                            className="text-5xl font-black text-white leading-none relative z-10 tabular-nums"
                                        >
                                            {displayLegs[player.id]}
                                        </motion.p>

                                        {/* FLYING PARTICLE */}
                                        <AnimatePresence>
                                            {isWinner && showParticle && (
                                                <motion.div
                                                    initial={{ y: 0, opacity: 1, scale: 1 }}
                                                    animate={{ y: 55, opacity: [1, 1, 0], scale: [1, 1.8, 0.8] }}
                                                    transition={{ duration: 0.6, ease: "easeIn" }}
                                                    className="absolute inset-0 m-auto w-4 h-4 rounded-full blur-[1px] z-20"
                                                    style={{ backgroundColor: winner.color, boxShadow: `0 0 15px ${winner.color}` }}
                                                />
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <p className="text-[8px] text-zinc-700 uppercase font-black tracking-widest mt-1">Legs</p>

                                    {/* Set Score Container */}
                                    <motion.div
                                        animate={isWinner && isHittingSet ? {
                                            scale: [1, 1.4, 1],
                                            backgroundColor: [`${winner.color}10`, `${winner.color}60`, `${winner.color}10`],
                                            borderColor: winner.color,
                                            boxShadow: `0 0 20px ${winner.color}30`
                                        } : { borderColor: "rgba(255,255,255,0.05)" }}
                                        className="mt-3 px-3 py-1 bg-zinc-800 border rounded-full"
                                    >
                                        <p className="text-[10px] font-black text-zinc-300 tabular-nums uppercase tracking-tighter">
                                            SET: <span className="text-white ml-1">{displaySets[player.id]}</span>
                                        </p>
                                    </motion.div>
                                </div>
                            );
                        })}

                        {/* VS Divider */}
                        <div className="px-4 flex flex-col items-center justify-center opacity-20">
                            <div className="h-12 w-px bg-linear-to-b from-transparent via-zinc-500 to-transparent" />
                        </div>
                    </div>
                </motion.div>

                {/* 2. Winner's Leg Performance (Stats Card) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="bg-zinc-900/80 border border-white/5 rounded-3xl p-5 mb-8 shadow-2xl"
                >
                    <p className="text-[10px] text-zinc-600 font-bold uppercase mb-4 text-center tracking-widest">Leg Performance</p>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col items-center border-r border-white/5">
                            <IconBolt size={18} className="text-zinc-500 mb-1" />
                            <p className="text-xl font-black text-white">{legAverage}</p>
                            <p className="text-[8px] text-zinc-600 font-bold uppercase">Avg</p>
                        </div>
                        <div className="flex flex-col items-center border-r border-white/5">
                            <IconTarget size={18} className="text-zinc-500 mb-1" />
                            <p className="text-xl font-black text-white">{totalDarts}</p>
                            <p className="text-[8px] text-zinc-600 font-bold uppercase">Darts</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black text-white bg-white/10 px-1.5 py-0.5 rounded">100+</span>
                            <p className="text-xl font-black text-white mt-1">{highScores}</p>
                            <p className="text-[8px] text-zinc-600 font-bold uppercase">Highs</p>
                        </div>
                    </div>
                </motion.div>



                {/* 4. Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5 }}
                    className="space-y-4"
                >
                    <button
                        onClick={() => {
                            console.trace("nextLeg was called!");
                            onNextLeg();
                        }}
                        className="w-full py-5 rounded-2xl font-black text-xl transition-all active:scale-95 shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex items-center justify-center gap-3 relative overflow-hidden group"
                        style={{ backgroundColor: winner.color, color: '#000' }}
                    >
                        <span className="relative z-10">START NEXT LEG</span>
                        <motion.div
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                            className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent w-1/2 -skew-x-12"
                        />
                    </button>
                    <button onClick={() => {
                        onUndo();
                    }} className="w-full py-2 text-zinc-700 hover:text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] transition-colors">
                        Undo last turn
                    </button>
                </motion.div>
            </div>
        </motion.div>
    );
}