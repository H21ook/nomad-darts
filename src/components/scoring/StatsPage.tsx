"use client";

import { redirect } from "next/navigation";
import { useAppSelector } from "@/lib/redux/hooks";
import { checkFinishablePoint } from "@/lib/utils";
import type { LegType, MatchState, Player } from "@/types/darts";
import { AppBar } from "@/components/ui/app-bar";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    IconChartBar,
    IconTargetArrow,
    IconTrophy,
} from "@tabler/icons-react";

// Дууссан тоглолтын нэг тоглогчийн статистик
interface PlayerStats {
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
}

// Бүх дууссан leg-үүдийг (давхардлаас зайлсхийж) цуглуулна.
// Sets-гүй горимд сүүлийн сет history-д хадгалагдахгүй тул
// active.currentSet-ийн leg-үүдийг нэмж авна.
const collectLegs = (match: MatchState): LegType[] => {
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
};

const buildPlayerStats = (
    player: Player,
    match: MatchState,
    legs: LegType[],
    winnerId: string | null
): PlayerStats => {
    // Сетүүд нь зөвхөн history.completedSets-д бүртгэгддэг
    const setsWon = match.history.completedSets.filter(
        (set) => set.winnerId === player.id
    ).length;

    const legsWon = legs.filter((leg) => leg.winnerId === player.id).length;

    let checkouts = 0;
    let checkoutAttempts = 0;

    for (const leg of legs) {
        for (const turn of leg.turns) {
            if (turn.playerId !== player.id) continue;

            // Ээлжийн эхэн дэх оноо (bust үед оноо өөрчлөгдөөгүй хэвээр)
            const startScore = turn.isBust
                ? turn.remainingScore
                : turn.remainingScore + turn.points;

            // Checkout оролдлого = ээлжийн эхэнд finishable оноотой байсан
            if (checkFinishablePoint(startScore)) checkoutAttempts += 1;
            // Checkout = ээлж дуусахад яг 0 үлдсэн (bust биш)
            if (!turn.isBust && turn.remainingScore === 0) checkouts += 1;
        }
    }

    // PPR = оноо / (шидсэн сум / 3)
    const ppr =
        player.totalDartsThrown > 0
            ? player.totalPointsScored / (player.totalDartsThrown / 3)
            : 0;

    return {
        player,
        isWinner: player.id === winnerId,
        ppr,
        dartsThrown: player.totalDartsThrown,
        pointsScored: player.totalPointsScored,
        legsWon,
        setsWon,
        checkouts,
        checkoutAttempts,
        checkoutPct:
            checkoutAttempts > 0
                ? (checkouts / checkoutAttempts) * 100
                : null,
    };
};

const formatPct = (value: number | null) =>
    value === null ? "—" : `${value.toFixed(1)}%`;

export function StatsPage() {
    const match = useAppSelector((state) => state.match);

    // Зөвхөн дууссан тоглолтын статистик харуулна
    if (match.status !== "match_finished") {
        redirect("/");
    }

    const players = match.players ?? [];
    const winner = match.winnerId
        ? players.find((p) => p.id === match.winnerId)
        : null;

    // Хоосон тоглогчийн жагсаалт — мэдээлэл байхгүй гэж харуулна
    if (players.length === 0) {
        return (
            <div className="min-h-dvh bg-background flex flex-col">
                <AppBar title="Full Statistics" backHref="/match/finished" />
                <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
                    <IconChartBar size={40} className="text-zinc-700" />
                    <p className="text-muted-foreground text-sm">
                        No match data available.
                    </p>
                </div>
            </div>
        );
    }

    const legs = collectLegs(match);
    const stats = players.map((p) =>
        buildPlayerStats(p, match, legs, match.winnerId)
    );

    const headline = `${match.settings.startingScore} • ${
        match.settings.setsEnabled
            ? `First to ${match.settings.firstToSets} set${
                  match.settings.firstToSets > 1 ? "s" : ""
              }`
            : `First to ${match.settings.firstToLegs} leg${
                  match.settings.firstToLegs > 1 ? "s" : ""
              }`
    }`;

    return (
        <div className="min-h-dvh bg-background flex flex-col pb-safe">
            <AppBar
                title="Full Statistics"
                backHref="/match/finished"
                description={headline}
            />

            <div className="flex-1 w-full max-w-md mx-auto p-4 space-y-4">
                {/* Winner hero */}
                {winner && (
                    <div className="flex flex-col items-center pt-2 pb-1">
                        <div className="relative mb-3">
                            <div
                                className="absolute inset-0 rounded-full blur-xl opacity-20 animate-pulse"
                                style={{ backgroundColor: winner.color }}
                            />
                            <div
                                className="relative w-16 h-16 rounded-full border-[3px] p-0.5 flex items-center justify-center bg-zinc-950"
                                style={{ borderColor: winner.color }}
                            >
                                <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900 flex items-center justify-center">
                                    <IconTrophy
                                        size={28}
                                        style={{ color: winner.color }}
                                    />
                                </div>
                            </div>
                        </div>
                        <h1 className="text-xl font-black italic text-white uppercase tracking-tighter">
                            {winner.name}
                        </h1>
                        <Badge
                            variant="outline"
                            className="mt-2 border-primary/40 text-primary"
                        >
                            Winner
                        </Badge>
                    </div>
                )}

                {/* Per-player stat cards */}
                <div className="grid grid-cols-1 gap-3">
                    {stats.map((s) => (
                        <PlayerCard key={s.player.id} stats={s} />
                    ))}
                </div>

                {/* Head-to-head comparison table */}
                <Card size="sm" className="border-border/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <IconTargetArrow
                                size={16}
                                className="text-primary"
                            />
                            Head to Head
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-2">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-muted-foreground">
                                        Stat
                                    </TableHead>
                                    {stats.map((s) => (
                                        <TableHead
                                            key={s.player.id}
                                            className="text-right"
                                        >
                                            <span
                                                className="font-black"
                                                style={{
                                                    color: s.player.color,
                                                }}
                                            >
                                                {s.player.name}
                                            </span>
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <StatRow
                                    label="PPR"
                                    values={stats.map((s) =>
                                        s.ppr.toFixed(1)
                                    )}
                                />
                                <StatRow
                                    label="Darts Thrown"
                                    values={stats.map((s) =>
                                        s.dartsThrown.toString()
                                    )}
                                />
                                <StatRow
                                    label="Points Scored"
                                    values={stats.map((s) =>
                                        s.pointsScored.toString()
                                    )}
                                />
                                <StatRow
                                    label="Legs Won"
                                    values={stats.map((s) =>
                                        s.legsWon.toString()
                                    )}
                                />
                                <StatRow
                                    label="Sets Won"
                                    values={stats.map((s) =>
                                        s.setsWon.toString()
                                    )}
                                />
                                <StatRow
                                    label="Checkouts"
                                    values={stats.map((s) =>
                                        s.checkouts.toString()
                                    )}
                                />
                                <StatRow
                                    label="Checkout Attempts"
                                    values={stats.map((s) =>
                                        s.checkoutAttempts.toString()
                                    )}
                                />
                                <StatRow
                                    label="Checkout %"
                                    values={stats.map((s) =>
                                        formatPct(s.checkoutPct)
                                    )}
                                />
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// Нэг тоглогчийн товч статистик карт
function PlayerCard({ stats }: { stats: PlayerStats }) {
    const { player } = stats;

    return (
        <Card
            size="sm"
            className="relative overflow-hidden"
            style={{ borderColor: `${player.color}40` }}
        >
            <div
                className="absolute inset-x-0 top-0 h-0.5"
                style={{ backgroundColor: player.color }}
            />
            <div className="flex items-center justify-between px-4 pt-4">
                <div className="flex items-center gap-2">
                    <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: player.color }}
                    />
                    <span className="text-sm font-bold">{player.name}</span>
                </div>
                {stats.isWinner && (
                    <Badge
                        variant="outline"
                        className="border-primary/40 text-primary"
                    >
                        Winner
                    </Badge>
                )}
            </div>
            <CardContent className="pt-3">
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            PPR
                        </p>
                        <p className="text-3xl font-black italic text-primary leading-none">
                            {stats.ppr.toFixed(1)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            Checkout
                        </p>
                        <p className="text-lg font-black text-white leading-none">
                            {formatPct(stats.checkoutPct)}
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3">
                    <MiniStat
                        label="Darts"
                        value={stats.dartsThrown.toString()}
                    />
                    <MiniStat
                        label="Points"
                        value={stats.pointsScored.toString()}
                    />
                    <MiniStat label="Legs" value={stats.legsWon.toString()} />
                    <MiniStat label="Sets" value={stats.setsWon.toString()} />
                </div>
            </CardContent>
        </Card>
    );
}

// Жижиг stat тайл (карт доторх)
function MiniStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-zinc-900/60 border border-white/5 p-2 rounded-xl text-center">
            <p className="text-[8px] font-bold text-zinc-600 uppercase mb-0.5">
                {label}
            </p>
            <p className="text-sm font-black text-white">{value}</p>
        </div>
    );
}

// Харьцуулах хүснэгтийн мөр
function StatRow({ label, values }: { label: string; values: string[] }) {
    return (
        <TableRow>
            <TableCell className="text-muted-foreground text-xs font-medium">
                {label}
            </TableCell>
            {values.map((value, index) => (
                <TableCell key={index} className="text-right font-bold">
                    {value}
                </TableCell>
            ))}
        </TableRow>
    );
}
