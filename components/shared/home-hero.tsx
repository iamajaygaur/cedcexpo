"use client";

import Link from "next/link";
import {
  Gavel,
  Trophy,
  Users,
  Radio,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

import { AppLogo } from "@/components/shared/app-logo";

const bentoFeatures = [
  {
    icon: Gavel,
    label: "Live Judging",
    desc: "Real-time scoring across groups",
    color: "#725c21",
    bg: "#d4b773",
  },
  {
    icon: Users,
    label: "Team Management",
    desc: "Organize teams, judges & assignments",
    color: "#1565c0",
    bg: "#1565c0",
  },
  {
    icon: Radio,
    label: "Live Monitor",
    desc: "Watch evaluation progress live",
    color: "#2e7d32",
    bg: "#2e7d32",
  },
  {
    icon: Trophy,
    label: "Results & Reports",
    desc: "Ranked outcomes with full audit trail",
    color: "#cb5a08",
    bg: "#cb5a08",
  },
] as const;

const COPYRIGHT_YEAR = 2026;

export function HomeHero() {
  return (
    <div className="home-mesh relative flex min-h-svh flex-col overflow-x-clip">
      {/* Soft mesh orbs — CSS-only so SSR and client markup match */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="home-mesh__layer" />
        <div className="home-mesh__orb home-mesh__orb--gold home-mesh__orb--pulse absolute -top-24 -left-20 h-[min(520px,90vw)] w-[min(520px,90vw)] rounded-full sm:-top-32 sm:-left-28 sm:h-[560px] sm:w-[560px]" />
        <div className="home-mesh__orb home-mesh__orb--teal home-mesh__orb--pulse-slow absolute -right-28 bottom-[-8%] h-[min(480px,85vw)] w-[min(480px,85vw)] rounded-full sm:-right-36 sm:bottom-[-12%] sm:h-[580px] sm:w-[580px]" />
        <div className="home-mesh__orb home-mesh__orb--gold-soft home-mesh__orb--pulse-soft absolute top-[38%] right-[8%] h-[min(220px,45vw)] w-[min(220px,45vw)] rounded-full opacity-40 sm:h-64 sm:w-64" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-5 px-4 py-8 text-center sm:gap-6 sm:px-8 sm:py-10 md:gap-7 md:px-10">
        <div className="home-hero__enter w-full max-w-full space-y-3 sm:space-y-4">
          <div className="flex w-full max-w-full justify-center px-1">
            <AppLogo
              variant="horizontal"
              className="mx-auto block h-auto w-full max-w-[14rem] sm:max-w-[18rem] md:max-w-[20rem]"
            />
          </div>

          <h1 className="px-1 text-[1.5rem] font-extrabold leading-[1.15] tracking-tight text-on-surface break-words sm:text-4xl sm:leading-[1.05] md:text-5xl lg:text-[3.25rem]">
            <span className="text-gradient-gold">CEDC Expo</span>
            <br />
            <span className="mt-1.5 block text-lg font-extrabold tracking-tight text-foreground sm:text-2xl md:text-3xl">
              Capstone Design Expo Judging
            </span>
          </h1>

          <p className="mx-auto max-w-xl px-1 text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg">
            A precision evaluation platform for faculty, industry partners, and
            authorized adjudicators to review and score capstone engineering
            projects.
          </p>

          <div className="flex w-full max-w-md flex-col items-stretch justify-center gap-2.5 px-1 pt-1 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/login"
              className="btn-shimmer gold-glow inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground transition-all duration-300 hover:opacity-90 active:scale-[0.98] sm:h-12 sm:w-auto sm:px-7 sm:text-base"
              id="main-cta-btn"
            >
              Access the Platform
              <ArrowRight className="size-4 sm:size-5" aria-hidden />
            </Link>
            <Link
              href="/help#contact"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 text-sm font-semibold text-foreground shadow-sm transition-all duration-200 hover:bg-muted hover:shadow active:scale-[0.98] sm:h-12 sm:w-auto sm:px-7 sm:text-base"
            >
              Help / Contact Support
            </Link>
          </div>
        </div>

        <div className="home-hero__enter home-hero__enter--delay grid w-full max-w-4xl grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4 md:gap-4">
          {bentoFeatures.map(({ icon: Icon, label, desc, color, bg }) => (
            <div
              key={label}
              className="glass-card flex flex-col gap-2 rounded-xl p-3.5 text-left transition-shadow hover:shadow-lg sm:gap-2.5 sm:rounded-2xl sm:p-4"
            >
              <div
                className="flex size-8 items-center justify-center rounded-lg sm:size-9 sm:rounded-xl"
                style={{
                  background: `${bg}15`,
                  border: `1px solid ${bg}30`,
                }}
              >
                <Icon className="size-4" style={{ color }} aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface">{label}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="home-hero__enter home-hero__enter--late flex max-w-full items-start justify-center gap-2 px-2 text-[11px] leading-snug text-muted-foreground sm:items-center sm:text-xs">
          <ShieldCheck
            className="mt-0.5 size-3.5 shrink-0 text-primary sm:mt-0 sm:size-4"
            aria-hidden
          />
          <span className="text-balance">
            Role-based access · Server-enforced security · Supabase-powered
          </span>
        </div>
      </main>

      <footer className="relative z-10 shrink-0 border-t border-border/50 bg-white/40 px-4 py-3 text-center text-[10px] leading-relaxed text-muted-foreground backdrop-blur-sm sm:px-8 sm:text-[11px]">
        <p className="mx-auto max-w-full text-balance break-words">
          © {COPYRIGHT_YEAR} University of Colorado Denver · College of
          Engineering, Design and Computing
        </p>
      </footer>
    </div>
  );
}
