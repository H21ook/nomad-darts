import { MatchSetup } from '@/components/match/MatchSetup';
import Link from 'next/link';
import { IconArrowLeft } from '@tabler/icons-react';

export default function SetupPage() {
    return (
        <main className="min-h-dvh bg-background flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Animated Background Gradients */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 -left-4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 -right-4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-size-[50px_50px] pointer-events-none" />

            {/* Back Button */}
            <Link
                href="/"
                className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/50 transition-all duration-300 group"
            >
                <IconArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Back</span>
            </Link>

            <div className="w-full max-w-md space-y-8 relative z-10">
                {/* Glassmorphism Card */}
                <div className="relative">
                    <div className="absolute -inset-1 bg-linear-to-r from-primary/20 via-primary/10 to-primary/20 rounded-2xl blur-xl opacity-50" />
                    <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-6">
                        <MatchSetup />
                    </div>
                </div>
            </div>
        </main>
    );
}
