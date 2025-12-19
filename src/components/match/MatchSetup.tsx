'use client';
import { useEffect, useState } from 'react';
import { useAppDispatch } from '@/lib/redux/hooks';
import { startMatch } from '@/lib/redux/matchSlice';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AppBar } from '@/components/ui/app-bar';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import PlayerList from './PlayerList';
import { PlayerInit } from '@/types/darts';
import { nanoid } from 'nanoid';

type StartingScore = 101 | 201 | 301 | 501;
type CheckoutType = 'double' | 'straight';
type FormatType = 'sets' | 'legs';

const DEFAULT_PLAYERS: PlayerInit[] = [
    { id: nanoid(), name: 'Player 1' },
    { id: nanoid(), name: 'Player 2' },
];

export function MatchSetup() {
    const dispatch = useAppDispatch();
    const [step, setStep] = useState(1);
    const [direction, setDirection] = useState(0);
    const [playersList, setPlayersList] = useState<PlayerInit[]>(DEFAULT_PLAYERS);
    const [startingScore, setStartingScore] = useState<StartingScore>(501);
    const [format, setFormat] = useState<FormatType>('legs');
    const [firstToSets, setFirstToSets] = useState(1);
    const [firstToLegs, setFirstToLegs] = useState(3);
    const [checkout, setCheckout] = useState<CheckoutType>('double');
    const router = useRouter();
    const pathname = usePathname();

    const startingScores: StartingScore[] = [101, 201, 301, 501];

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? '100%' : '-100%',
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            x: direction < 0 ? '100%' : '-100%',
            opacity: 0
        })
    };

    const handleStart = () => {

        const newErrorIndices: number[] = [];
        playersList.forEach((player, index) => {
            if (!player.name.trim()) {
                newErrorIndices.push(index);
            }
        });

        if (newErrorIndices.length > 0) {
            setPlayersList(playersList.map((player, index) => ({
                ...player,
                isError: newErrorIndices.includes(index)
            })));
            return;
        }

        dispatch(startMatch({
            startingScore: startingScore,
            firstToSets: format === 'sets' ? firstToSets : 1,
            firstToLegs: firstToLegs,
            players: playersList,
            setsEnabled: format === 'sets',
            checkout: checkout,
        }));
        router.push('/match');
    };

    const handleNext = () => {
        setDirection(1);
        window.history.pushState({ step: 2 }, '', `${pathname}#order`);
        setStep(2);
    };

    const handleBack = () => {
        window.history.back();
    };

    useEffect(() => {
        if (window.location.hash === '#order') {
            window.history.back();
        }
    }, [])

    useEffect(() => {
        // Refresh хийх үед #order байвал арилгах (Таны хүссэнээр)
        if (window.location.hash === '#order') {
            window.history.replaceState(null, '', pathname);
        }

        const handlePopState = () => {
            if (window.location.hash === '#order') {
                setDirection(1);
                setStep(2);
            } else {
                setDirection(-1);
                setStep(1);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [pathname]);

    return (
        <div className="flex flex-col h-dvh w-full text-foreground overflow-hidden">
            <AppBar title={step === 1 ? "Match Setup" : "Player Order"}
                onBack={step === 1 ? () => router.back() : handleBack} />

            <div className="relative flex-1 overflow-hidden">
                <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                    {step === 1 ? (
                        <motion.div
                            key="step1"
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="absolute inset-0 px-4 py-6 space-y-6 pb-24 overflow-y-auto"
                        >
                            {/* Game Mode Selection */}
                            <div>
                                <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                    Starting Score
                                </label>
                                <div className="grid grid-cols-4 flex-1 gap-2 mt-2">
                                    {startingScores.map((score) => (
                                        <button
                                            key={score}
                                            onClick={() => setStartingScore(score)}
                                            className={cn(
                                                "h-12 rounded-xl transition-all text-center font-mono font-bold text-2xl",
                                                "border-2",
                                                startingScore === score
                                                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30"
                                                    : "bg-card/60 border-primary/30 text-foreground hover:bg-primary/20 hover:border-primary"
                                            )}
                                        >
                                            {score}
                                        </button>
                                    ))}
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
                                        <div className="bg-card/50 rounded-xl p-1 border border-border/30">
                                            <button
                                                onClick={() => setCheckout('double')}
                                                className={cn(
                                                    "h-10 rounded-lg transition-all font-bold px-2",
                                                    checkout === 'double'
                                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/40"
                                                        : "hover:bg-primary/20"
                                                )}
                                            >
                                                Double Out
                                            </button>
                                            <button
                                                onClick={() => setCheckout('straight')}
                                                className={cn(
                                                    "h-10 rounded-lg transition-all font-bold px-2",
                                                    checkout === 'straight'
                                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/40"
                                                        : "hover:bg-primary/20"
                                                )}
                                            >
                                                Straight Out
                                            </button>
                                        </div>
                                    </div>

                                    {/* Format Toggle */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-base font-medium">Format</span>
                                        <div className="bg-card/50 rounded-xl p-1 border border-border/30">
                                            <button
                                                onClick={() => setFormat('legs')}
                                                className={cn(
                                                    "h-10 rounded-lg transition-all font-bold px-2",
                                                    format === 'legs'
                                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/40"
                                                        : "hover:bg-primary/20"
                                                )}
                                            >
                                                Legs
                                            </button>
                                            <button
                                                onClick={() => setFormat('sets')}
                                                className={cn(
                                                    "h-10 rounded-lg transition-all font-bold px-2",
                                                    format === 'sets'
                                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/40"
                                                        : "hover:bg-primary/20"
                                                )}
                                            >
                                                Sets
                                            </button>

                                        </div>
                                    </div>

                                    {/* Sets counter (Showing when format is sets) */}
                                    {
                                        format === "sets" ? (
                                            <div className="flex items-center justify-between">
                                                <span className="text-base font-medium">First to {firstToSets} sets</span>
                                                <div className="flex items-center gap-2 bg-card/50 rounded-xl p-1 border border-border/30">
                                                    <button
                                                        onClick={() => setFirstToSets(Math.max(1, firstToSets - 1))}
                                                        className="w-10 h-10 flex items-center justify-center text-primary hover:bg-primary/10 rounded-lg transition-colors text-xl font-bold"
                                                    >
                                                        −
                                                    </button>
                                                    <span className="w-10 text-center font-mono font-bold text-2xl">{firstToSets}</span>
                                                    <button
                                                        onClick={() => setFirstToSets(firstToSets + 1)}
                                                        className="w-10 h-10 flex items-center justify-center text-primary hover:bg-primary/10 rounded-lg transition-colors text-xl font-bold"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        ) : null
                                    }


                                    {/* Legs counter */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-base font-medium">{format === "sets" ? "Legs per set (Best of)" : `First to ${firstToLegs} legs`}</span>
                                        <div className="flex items-center gap-2 bg-card/50 rounded-xl p-1 border border-border/30">
                                            <button
                                                onClick={() => {
                                                    const step = format === 'sets' ? 2 : 1;
                                                    setFirstToLegs(Math.max(1, firstToLegs - step));
                                                }}
                                                className="w-10 h-10 flex items-center justify-center text-primary hover:bg-primary/10 rounded-lg transition-colors text-xl font-bold"
                                            >
                                                −
                                            </button>
                                            <span className="w-10 text-center font-mono font-bold text-2xl">{firstToLegs}</span>
                                            <button
                                                onClick={() => {
                                                    const step = format === 'sets' ? 2 : 1;
                                                    setFirstToLegs(firstToLegs + step);
                                                }}
                                                className="w-10 h-10 flex items-center justify-center text-primary hover:bg-primary/10 rounded-lg transition-colors text-xl font-bold"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="h-24" /> {/* Товчны зай */}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="step2"
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="absolute inset-0 px-4 py-6 space-y-6 pb-24"
                        >
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-bold uppercase text-muted-foreground">
                                    Set Throwing Order
                                </label>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPlayersList([...playersList].sort(() => Math.random() - 0.5))}
                                >
                                    Randomize
                                </Button>
                            </div>

                            <PlayerList playersList={playersList} setPlayersList={setPlayersList} />
                            <p className="text-center text-muted-foreground text-sm">
                                The player at the top throws first.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Fixed Bottom Button */}
            <div className="fixed bottom-0 left-0 right-0 p-5 bg-linear-to-t from-background via-background to-transparent">
                <button
                    onClick={step === 1 ? handleNext : handleStart}
                    className={cn(
                        "w-full h-16 rounded-2xl font-black text-xl tracking-wider",
                        "bg-primary text-primary-foreground shadow-2xl",
                        "hover:bg-primary/90 hover:shadow-primary/40 hover:shadow-2xl",
                        "active:scale-[0.98] transition-all duration-200",
                        "flex items-center justify-center gap-3",
                        "border-4 border-primary/50",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                >
                    {step === 1 ? "REVIEW ORDER" : "START MATCH"}
                </button>
            </div>
        </div >
    );
}
