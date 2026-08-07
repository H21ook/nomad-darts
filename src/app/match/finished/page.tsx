"use client";

import { motion } from 'framer-motion'
import { MatchFinished } from '@/components/scoring/MatchFinished';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { addFinishedMatch } from '@/lib/redux/matchHistorySlice';
import { redirect } from 'next/navigation';
import { useEffect, useRef } from 'react';

const MatchFinishedPage = () => {
    const match = useAppSelector(state => state.match);
    const dispatch = useAppDispatch();
    const recordedRef = useRef(false);

    // T08: Finished match-ийг local history-д (redux-persist) хадгалах.
    // recordedRef нь StrictMode double-invoke / remount-ээс хамгаална
    // (reducer дотор id-аар dedupe хийгддэг тул давхар нэмэгдэхгүй).
    useEffect(() => {
        if (match.status !== "match_finished" || recordedRef.current) return;
        recordedRef.current = true;
        dispatch(addFinishedMatch({
            id: match.id,
            date: Date.now(),
            players: match.players.map(p => ({ id: p.id, name: p.name, color: p.color })),
            winnerId: match.winnerId,
            settings: { ...match.settings },
            finalScores: match.players.map(p => ({
                playerId: p.id,
                setsWon: p.setsWon,
                legsWon: p.legsWon,
            })),
        }));
    }, [dispatch, match]);

    // Rematch-ийн дараа шууд амьд тоглолтын дэлгэц рүү буцах
    if (match.status === "playing") {
        redirect('/match')
    }

    if (match.status !== "match_finished") {
        redirect('/')
    }

    const winner = match.winnerId
        ? match.players.find(p => p.id === match.winnerId)
        : null;

    if (!winner) {
        redirect("/");
    }

    return (
        <motion.div
            key="match-finished"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50"
        >
            <MatchFinished id={match.id} winner={winner} players={match.players} />
        </motion.div>
    )
}

export default MatchFinishedPage