'use client';
import { Active, Player } from '@/types/darts';
import { memo } from 'react';
import PlayerScore from './PlayerScore';

interface ScoreBoardProps {
    players: Player[];
    activePlayerIndex: number;
    active: Active;
}

export const ScoreBoard = memo(function ScoreBoard({
    players,
    activePlayerIndex,
    active,
}: ScoreBoardProps) {

    const currentLeg = active.currentLeg;

    return (
        <div className="flex w-full bg-black border-b border-white/5">
            {players.map((player, index) => {
                const isActive = index === activePlayerIndex;

                const turns = currentLeg.turns.filter(
                    t => t.playerId === player.id
                );

                const legDarts = turns.reduce(
                    (sum, t) => sum + (t.dartsUsed ?? 3),
                    0
                );

                const legPoints = turns.reduce(
                    (sum, t) => sum + (t.isBust ? 0 : t.points),
                    0
                );

                const legAvg =
                    legDarts > 0 ? (legPoints / (legDarts / 3)).toFixed(1) : '0.0';

                return (
                    <PlayerScore
                        key={player.id}
                        player={player}
                        isActive={isActive}
                        legAvg={legAvg}
                        legDarts={legDarts}
                    />
                );
            })}
        </div>
    );
})