'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconArrowLeft, IconTrophy, IconTarget } from '@tabler/icons-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { Match } from '@/types/darts';

const supabase = createClient();

export default function Dashboard() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            const { data } = await supabase
                .from('matches')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            if (data) setMatches(data as Match[]);
            setLoading(false);
        }
        loadStats();
    }, []);

    return (
        <div className="min-h-screen bg-background relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />

            {/* Back Button */}
            <Link
                href="/"
                className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/50 transition-all duration-300 group"
            >
                <IconArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Home</span>
            </Link>

            <div className="relative z-10 p-8 max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12 pt-16">
                    <div className="flex justify-center mb-4">
                        <IconTrophy size={48} className="text-primary drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]" />
                    </div>
                    <h1 className="text-4xl font-bold text-foreground mb-2">
                        Your <span className="text-primary">Dashboard</span>
                    </h1>
                    <p className="text-muted-foreground">Track your progress and stats</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Recent Matches Card */}
                    <Card className="bg-card/80 backdrop-blur-xl border-border/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <IconTarget size={20} className="text-primary" />
                                Recent Matches
                            </CardTitle>
                            <CardDescription>Your latest game history</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                </div>
                            ) : matches.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground text-sm">No matches yet</p>
                                    <Link href="/match/setup" className="text-primary hover:underline text-sm mt-2 inline-block">
                                        Start your first game
                                    </Link>
                                </div>
                            ) : (
                                <ul className="space-y-3">
                                    {matches.map(m => (
                                        <li key={m.id} className="flex justify-between items-center p-3 rounded-lg bg-background/50 border border-border/30">
                                            <span className="font-medium">{m.settings.checkout}</span>
                                            <span className={`text-xs px-2 py-1 rounded-full ${m.status === 'finished'
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-yellow-500/20 text-yellow-400'
                                                }`}>
                                                {m.status}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>

                    {/* Statistics Card */}
                    <Card className="bg-card/80 backdrop-blur-xl border-border/50">
                        <CardHeader>
                            <CardTitle className="text-primary">Statistics</CardTitle>
                            <CardDescription>Your performance metrics</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative group">
                                    <div className="absolute -inset-0.5 bg-primary/10 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative bg-background/50 p-4 rounded-lg border border-border/30 text-center">
                                        <div className="text-muted-foreground text-xs uppercase tracking-wider mb-2">PPR</div>
                                        <div className="text-3xl font-bold text-primary">-</div>
                                    </div>
                                </div>
                                <div className="relative group">
                                    <div className="absolute -inset-0.5 bg-primary/10 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative bg-background/50 p-4 rounded-lg border border-border/30 text-center">
                                        <div className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Checkout %</div>
                                        <div className="text-3xl font-bold text-primary">-</div>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground text-center mt-4">
                                Play more matches to see your stats
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
