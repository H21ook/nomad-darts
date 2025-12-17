'use client';
import { useState } from 'react';
import { useAppDispatch } from '@/lib/redux/hooks';
import { startMatch } from '@/lib/redux/matchSlice';
import { useRouter } from 'next/navigation';
import { IconArrowLeft, IconPlus, IconTarget, IconTrash, IconUser } from '@tabler/icons-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AppBar } from '@/components/ui/app-bar';

type GameMode = 101 | 201 | 301 | 501;
type CheckoutType = 'double' | 'straight';
type FormatType = 'sets' | 'legs';

export function MatchSetup() {
    const dispatch = useAppDispatch();
    const [playersList, setPlayersList] = useState<string[]>(['', '']);
    const router = useRouter();

    const [gameMode, setGameMode] = useState<GameMode>(501);
    const [format, setFormat] = useState<FormatType>('sets');
    const [setsToWin, setSetsToWin] = useState(3);
    const [legsPerSet, setLegsPerSet] = useState(5);
    const [checkout, setCheckout] = useState<CheckoutType>('double');

    const handleStart = () => {
        dispatch(startMatch({
            startingScore: gameMode,
            setsToWinMatch: setsToWin,
            legsToWinSet: legsPerSet,
            players: playersList
        }));
        router.push('/match');
    };

    const handleAddPlayer = () => {
        setPlayersList(prev => [...prev, '']);
    };

    const handleRemovePlayer = (index: number) => {
        setPlayersList(prev => {
            const newPlayers = [...prev];
            newPlayers.splice(index, 1);
            return newPlayers;
        });
    };

    const handlePlayerNameChange = (index: number, name: string) => {
        setPlayersList(prev => {
            const newPlayers = [...prev];
            newPlayers[index] = name;
            return newPlayers;
        });
    };
    const gameModes: GameMode[] = [101, 201, 301, 501];

    return (
        <div className="flex flex-col min-h-full w-full text-foreground">
            <AppBar title="Match Setup" onBack={() => router.back()} />

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 pb-24">
                {/* Game Mode Selection */}
                <div>
                    <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        Starting Score
                    </label>
                    <div className="mt-2 w-full">
                        <Select value={gameMode.toString()} onValueChange={(value) => setGameMode(Number(value) as GameMode)}>
                            <SelectTrigger className="w-full text-base">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent position='popper' align='start' sideOffset={4} className="p-2">
                                {gameModes.map((mode) => (
                                    <SelectItem key={mode} value={mode.toString()} className="text-base">
                                        {mode}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Players */}
                <div>
                    <div className="flex items-center gap-2 justify-between">
                        <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                            Players
                        </label>
                        <Button variant="ghost" size="sm" className="shrink-0" onClick={handleAddPlayer}>
                            <IconPlus /> Add Player
                        </Button>
                    </div>

                    {/* Player 1 */}
                    <div className='space-y-2 mt-2'>
                        {
                            playersList.map((playerName, index) => (
                                <div key={index} className="flex gap-2">
                                    <div className="relative w-full">
                                        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-3 pointer-events-none z-10">
                                            <div className="size-9 rounded-full bg-primary/20 flex items-center justify-center">
                                                <IconUser size={20} className="text-primary" />
                                            </div>
                                        </div>
                                        <input
                                            value={playerName}
                                            onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                                            className="w-full bg-card/50 border border-primary/30 rounded-xl py-3 px-14 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none transition-colors text-base"
                                            placeholder={`Player ${index + 1}`}
                                        />
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10">
                                            <Button variant="ghost" size={"icon"} onClick={() => handleRemovePlayer(index)} className='rounded-full text-destructive bg-destructive/10 hover:bg-destructive/20 hover:text-destructive transition-colors'>
                                                <IconTrash size={20} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        }


                    </div>
                </div>

                {/* Match Rules */}
                <div>
                    <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        Match Rules
                    </label>

                    <div className='space-y-4 mt-2'>
                        {/* Checkout */}
                        <div className="flex items-center justify-between">
                            <span className="text-base font-medium">Checkout</span>
                            <Tabs value={checkout} onValueChange={(value) => setCheckout(value as CheckoutType)}>
                                <TabsList>
                                    <TabsTrigger value="double">Double</TabsTrigger>
                                    <TabsTrigger value="straight">Straight</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* Format Toggle */}
                        <div className="flex items-center justify-between">
                            <span className="text-base font-medium">Format</span>
                            <Tabs value={format} onValueChange={(value) => setFormat(value as FormatType)}>
                                <TabsList>
                                    <TabsTrigger value="sets">Sets</TabsTrigger>
                                    <TabsTrigger value="legs">Legs</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* Sets to Win */}
                        <div className="flex items-center justify-between">
                            <span className="text-base font-medium">Sets to Win</span>
                            <div className="flex items-center gap-4 bg-card/50 rounded-xl px-4 py-2 border border-border/30">
                                <button
                                    onClick={() => setSetsToWin(Math.max(1, setsToWin - 1))}
                                    className="w-10 h-10 flex items-center justify-center text-primary hover:bg-primary/10 rounded-lg transition-colors active:scale-95 text-xl font-bold"
                                >
                                    −
                                </button>
                                <span className="w-10 text-center font-mono font-bold text-2xl">{setsToWin}</span>
                                <button
                                    onClick={() => setSetsToWin(setsToWin + 1)}
                                    className="w-10 h-10 flex items-center justify-center text-primary hover:bg-primary/10 rounded-lg transition-colors active:scale-95 text-xl font-bold"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Legs / Set */}
                        <div className="flex items-center justify-between">
                            <span className="text-base font-medium">Legs / Set</span>
                            <div className="flex items-center gap-4 bg-card/50 rounded-xl px-4 py-2 border border-border/30">
                                <button
                                    onClick={() => setLegsPerSet(Math.max(1, legsPerSet - 1))}
                                    className="w-10 h-10 flex items-center justify-center text-primary hover:bg-primary/10 rounded-lg transition-colors active:scale-95 text-xl font-bold"
                                >
                                    −
                                </button>
                                <span className="w-10 text-center font-mono font-bold text-2xl">{legsPerSet}</span>
                                <button
                                    onClick={() => setLegsPerSet(legsPerSet + 1)}
                                    className="w-10 h-10 flex items-center justify-center text-primary hover:bg-primary/10 rounded-lg transition-colors active:scale-95 text-xl font-bold"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fixed Bottom Button */}
            <div className="sticky bottom-0 bg-linear-to-t from-background via-background to-background/80 backdrop-blur-sm p-4 border-t border-border/30">
                <button
                    onClick={handleStart}
                    className="w-full py-4 bg-primary hover:bg-primary/90 text-black font-bold text-lg rounded-xl shadow-[0_0_30px_rgba(0,255,255,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    <IconTarget size={22} />
                    START MATCH
                </button>
            </div>
        </div>
    );
}
