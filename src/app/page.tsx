import Link from 'next/link';
import { IconTarget, IconLogin, IconUserPlus } from '@tabler/icons-react';

export default function Home() {
  return (
    <main className="min-h-dvh bg-background flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 -right-4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-size-[50px_50px] pointer-events-none" />

      <div className="w-full max-w-md space-y-12 relative z-10">
        {/* Logo & Branding */}
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
              <IconTarget size={64} className="text-primary relative z-10 drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]" strokeWidth={1.5} />
            </div>
          </div>

          <h1 className="text-5xl font-extrabold text-foreground tracking-tight">
            Nomad<span className="text-primary text-cyan-glow">Darts</span>
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            Professional Scoring Engine
          </p>
        </div>

        {/* Action Cards */}
        <div className="space-y-4">
          {/* Guest Mode - Glassmorphism */}
          <Link
            href="/match/setup"
            className="group block w-full relative"
          >
            <div className="absolute -inset-1 bg-linear-to-r from-primary/30 via-primary/20 to-primary/30 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="relative bg-primary hover:bg-primary/90 p-6 rounded-2xl shadow-2xl transition-all duration-300 group-hover:scale-[1.02] active:scale-[0.98]">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-primary-foreground mb-1">
                    Start Game
                  </h2>
                  <p className="text-sm text-primary-foreground/70">
                    Play instantly without login
                  </p>
                </div>
                <IconTarget size={40} className="text-primary-foreground/80 group-hover:rotate-12 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Login - Glassmorphism */}
          <Link
            href="/auth/login"
            className="group block w-full relative"
          >
            <div className="absolute -inset-0.5 bg-linear-to-r from-primary/10 to-primary/5 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 hover:border-primary/30 p-6 rounded-2xl transition-all duration-300 group-hover:scale-[1.02] active:scale-[0.98]">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-1">
                    Login
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Track stats & match history
                  </p>
                </div>
                <IconLogin size={36} className="text-primary group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Sign Up Link */}
          <div className="text-center pt-4">
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <IconUserPlus size={20} />
              <span className="text-sm font-medium">Create an account</span>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground/60 pt-8">
          <p>High-performance scoring for 301 & 501 games</p>
        </div>
      </div>

      {/* Decorative Bottom Line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-primary/20 to-transparent" />
    </main>
  );
}
