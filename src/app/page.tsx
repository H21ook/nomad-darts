"use client";

import Link from 'next/link';
import { IconTarget, IconLogin, IconUserPlus, IconChartBar, IconPlayerPlayFilled } from '@tabler/icons-react';

export default function Home() {
  return (
    <main className="h-dvh bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />

      <div className="w-full max-w-sm space-y-10 relative z-10">
        {/* Logo & Branding */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-4">
            <div className="relative p-3 rounded-2xl bg-white/5 ring-1 ring-white/10 shadow-sm">
              <IconTarget size={32} className="text-primary" strokeWidth={2} />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            NOMAD<span className="text-primary">DARTS</span>
          </h1>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] opacity-80">
            The simple way to track your score
          </p>
        </div>

        {/* Action Cards Container */}
        <div className="grid gap-3">
          {/* Quick Start Card */}
          <Link href="/match/setup" className="group block relative">
            <div className="relative bg-white/5 border border-white/5 p-4 rounded-xl transition-colors hover:bg-white/10 hover:border-white/10">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <IconPlayerPlayFilled size={20} />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-semibold text-foreground">Quick Start</h2>
                  <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider opacity-70">Play as a guest</p>
                </div>
              </div>
            </div>
          </Link>

          {/* Login/Connect Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/auth/login" className="group block relative h-full">
              <div className="relative bg-white/5 border border-white/5 p-4 rounded-xl h-full flex flex-col justify-between transition-colors hover:bg-white/10 hover:border-white/10">
                <IconLogin size={20} className="text-primary mb-3" />
                <div>
                  <h3 className="text-sm font-semibold">Sign In</h3>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider opacity-70 mt-1">Track stats</p>
                </div>
              </div>
            </Link>

            <Link href="/auth/sign-up" className="group block relative h-full">
              <div className="relative bg-white/5 border border-white/5 p-4 rounded-xl h-full flex flex-col justify-between transition-colors hover:bg-white/10 hover:border-white/10">
                <IconUserPlus size={20} className="text-primary mb-3" />
                <div>
                  <h3 className="text-sm font-semibold">Join Now</h3>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider opacity-70 mt-1">Free Profile</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Footer/Features Preview */}
        <div className="flex justify-center gap-6 pt-6 border-t border-white/5">
          <div className="flex items-center gap-2 text-muted-foreground/40 text-[10px] font-bold uppercase tracking-wider">
            <IconChartBar size={14} />
            <span>Analytics</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground/40 text-[10px] font-bold uppercase tracking-wider">
            <IconTarget size={14} />
            <span>Heatmaps</span>
          </div>
        </div>
      </div>

      {/* Subtle Footer Signature */}
      <div className="absolute bottom-6 text-[9px] font-bold tracking-widest text-muted-foreground/20 uppercase">
        Designed for players
      </div>
    </main>
  );
}
