"use client";

import { motion } from 'framer-motion'
import { MatchFinished } from '@/components/scoring/MatchFinished';
import { useAppSelector } from '@/lib/redux/hooks';
import { redirect } from 'next/navigation';

const MatchFinishedPage = () => {
    const match = useAppSelector(state => state.match);

    if (match.status !== "finished") {
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