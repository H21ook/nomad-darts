import type { LegType, MatchState, Player } from "@/types/darts";
import { checkFinishablePoint } from "@/lib/utils";

// Дууссан тоглолтын нэг тоглогчийн статистик
export interface PlayerStats {
    player: Player;
    isWinner: boolean;
    ppr: number;
    dartsThrown: number;
    pointsScored: number;
    legsWon: number;
    setsWon: number;
    checkouts: number;
    checkoutAttempts: number;
    checkoutPct: number | null;
    legsPlayed: number;
    avgDartsPerLeg: number;
    avgScorePerTurn: number;
    turnsPlayed: number;
    pct100Plus: number;
}

// Бүх дууссан leg-үүдийг (давхардлаас зайлсхийж) цуглуулна.
// Sets-гүй горимд сүүлийн сет history-д хадгалагдахгүй тул
// active.currentSet-ийн leg-үүдийг нэмж авна.
export function collectLegs(match: MatchState): LegType[] {
    const seen = new Set<string>();
    const legs: LegType[] = [];

    for (const set of match.history.completedSets) {
        for (const leg of set.legs) {
            if (!seen.has(leg.id)) {
                seen.add(leg.id);
                legs.push(leg);
            }
        }
    }

    for (const leg of match.active?.currentSet.legs ?? []) {
        if (!seen.has(leg.id)) {
            seen.add(leg.id);
            legs.push(leg);
        }
    }

    return legs;
}

export function buildPlayerStats(match: MatchState): PlayerStats[] {
    const legs = collectLegs(match);

    return match.players.map((player) => {
        // Тоглогчийн оролцсон leg-үүд (дор хаяж нэг ээлж шидсэн)
        const playerLegs = legs.filter((leg) =>
            leg.turns.some((t) => t.playerId === player.id)
        );
        const turns = legs.flatMap((leg) =>
            leg.turns.filter((t) => t.playerId === player.id)
        );

        // Сетүүд нь зөвхөн history.completedSets-д бүртгэгддэг
        const setsWon = match.history.completedSets.filter(
            (set) => set.winnerId === player.id
        ).length;

        const legsWon = legs.filter((leg) => leg.winnerId === player.id).length;

        let checkouts = 0;
        let checkoutAttempts = 0;

        for (const turn of turns) {
            // Ээлжийн эхэн дэх оноо (bust үед оноо өөрчлөгдөөгүй хэвээр)
            const startScore = turn.isBust
                ? turn.remainingScore
                : turn.remainingScore + turn.points;

            // Checkout оролдлого = ээлжийн эхэнд finishable оноотой байсан
            if (checkFinishablePoint(startScore)) checkoutAttempts += 1;
            // Checkout = ээлж дуусахад яг 0 үлдсэн (bust биш)
            if (!turn.isBust && turn.remainingScore === 0) checkouts += 1;
        }

        // PPR = оноо / (шидсэн сум / 3)
        const dartsThrown = player.totalDartsThrown;
        const pointsScored = player.totalPointsScored;
        const ppr =
            dartsThrown > 0 ? pointsScored / (dartsThrown / 3) : 0;

        const checkoutPct =
            checkoutAttempts > 0
                ? (checkouts / checkoutAttempts) * 100
                : null;

        const legsPlayed = playerLegs.length;
        const avgDartsPerLeg = legsPlayed > 0 ? dartsThrown / legsPlayed : 0;

        const turnsPlayed = turns.length;
        const avgScorePerTurn =
            turnsPlayed > 0 ? pointsScored / turnsPlayed : 0;

        const pct100Plus =
            turnsPlayed > 0
                ? (turns.filter((t) => t.points >= 100).length / turnsPlayed) *
                  100
                : 0;

        return {
            player,
            isWinner: match.winnerId === player.id,
            ppr,
            dartsThrown,
            pointsScored,
            legsWon,
            setsWon,
            checkouts,
            checkoutAttempts,
            checkoutPct,
            legsPlayed,
            avgDartsPerLeg,
            avgScorePerTurn,
            turnsPlayed,
            pct100Plus,
        };
    });
}