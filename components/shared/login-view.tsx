"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, CheckCircle2, Shield } from "lucide-react";

import { LoginForm } from "@/components/shared/login-form";

type LoginViewProps = {
  authError: string | null;
  errorMessage?: string | null;
  configured: boolean;
  switchingAccount: boolean;
  year: number;
};

export function LoginView({
  authError,
  errorMessage,
  configured,
  switchingAccount,
  year,
}: LoginViewProps) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-8 sm:px-6">
      {/* ── Full-screen Blurred Campus Background ───────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Image
          src="/brand/login-campus.jpg"
          alt="CU Denver Campus"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center filter blur-md scale-105 opacity-35"
          aria-hidden
        />
        <div className="absolute inset-0 bg-background/60 backdrop-blur-md" />
      </div>

      {/* ── Ambient Background Blobs ───────────────────────── */}
      <motion.div
        className="glow-blob pointer-events-none absolute -top-40 -left-40 h-[550px] w-[550px] bg-[#d4b773]"
        style={{ opacity: 0.15 }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.15, 0.22, 0.15] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <motion.div
        className="glow-blob pointer-events-none absolute -bottom-30 -right-30 h-[450px] w-[450px] bg-[#2d8289]"
        style={{ opacity: 0.1 }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.16, 0.1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        aria-hidden
      />

      {/* ── Back to Home Link (Top Left) ───────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="absolute top-6 left-6 z-20"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/85 px-4 py-2 text-xs font-semibold text-foreground shadow-sm backdrop-blur-xl transition-all hover:bg-muted"
        >
          <ArrowLeft className="size-3.5" />
          Back to Expo Home
        </Link>
      </motion.div>

      {/* ── Split-Panel Card Container with Backdrop Blur ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] as const }}
        className="relative z-10 flex w-full max-w-[1020px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/85 shadow-[0_24px_64px_rgba(25,28,29,0.16)] backdrop-blur-xl lg:min-h-[580px] lg:flex-row"
      >
        {/* ── Left Brand & Campus Panel (45% Width) ──────── */}
        <section className="relative flex min-h-[340px] flex-col justify-between overflow-hidden bg-[#1a1c1e] px-8 py-10 sm:px-10 lg:min-h-0 lg:w-[45%] lg:px-11 lg:py-12">
          {/* Campus Photo Background */}
          <Image
            src="/brand/login-campus.jpg"
            alt="CU Denver Campus"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 45vw"
            className="object-cover object-[center_35%]"
            aria-hidden
          />

          {/* Vignette Overlays */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/75 to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[80%] bg-gradient-to-t from-black/90 via-black/65 to-transparent"
            aria-hidden
          />

          {/* Logo Header */}
          <div className="relative z-10 mt-4 flex justify-center sm:mt-6 lg:mt-8">
            <Link href="/" className="inline-flex max-w-full justify-center transition-transform hover:scale-105">
              <Image
                src="/brand/cedc-logo-horizontal-light.png?v3"
                alt="College of Engineering, Design and Computing — University of Colorado Denver"
                width={2131}
                height={556}
                className="h-[4.25rem] w-auto max-w-full object-contain drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] sm:h-20"
                unoptimized
                priority
              />
            </Link>
          </div>

          {/* Brand Copy & Features */}
          <div className="relative z-10 mt-10 space-y-5 lg:mt-0">
            <div className="space-y-1.5">
              <h1 className="text-[2rem] font-extrabold leading-tight tracking-tight text-white sm:text-[2.25rem]">
                CEDC Expo
              </h1>
              <p className="text-base font-semibold text-[#d4b773] sm:text-lg">
                Capstone Design Expo Judging
              </p>
            </div>

            <p className="max-w-sm text-[14px] leading-relaxed text-white/80">
              Secure portal for faculty, industry partners, and adjudicators to review and score capstone engineering projects.
            </p>

            {/* Feature Pills */}
            <div className="space-y-2 pt-1">
              {[
                "Real-Time Group Evaluation Scoring",
                "Role-Enforced Server Permissions",
                "Automated ABET & Criteria Reports",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-xs font-medium text-white/90">
                  <CheckCircle2 className="size-4 shrink-0 text-[#d4b773]" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-white/15">
              <p className="text-xs italic leading-relaxed text-white/70">
                &ldquo;Empowering the next generation of engineers through rigorous evaluation.&rdquo;
              </p>
            </div>
          </div>
        </section>

        {/* ── Right Form & Role Switcher Panel (55% Width) ─ */}
        <section className="flex flex-1 flex-col justify-center bg-card px-8 py-10 sm:px-10 lg:px-12 lg:py-12">
          <div className="mx-auto w-full max-w-md space-y-6">
            <div className="space-y-1.5">
              <h2 className="text-[1.875rem] font-extrabold tracking-tight text-foreground">
                Log In
              </h2>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Select your role and enter your credentials to log in.
              </p>
            </div>

            {/* Supabase Notice */}
            {!configured && (
              <div
                role="status"
                className="rounded-xl border border-[#cb5a08]/30 bg-[#cb5a08]/08 px-4 py-3 text-xs text-foreground"
              >
                <p className="font-semibold text-[#cb5a08]">Supabase is not configured</p>
                <p className="mt-1 text-muted-foreground">
                  Add keys to <code className="text-primary">.env.local</code> and restart the server.
                </p>
              </div>
            )}

            {/* Login Form Component */}
            <LoginForm
              authError={authError}
              errorMessage={errorMessage}
              configured={configured}
              switchingAccount={switchingAccount}
            />

            {/* Footer links & Trust Badge */}
            <div className="space-y-4 pt-2 border-t border-border/50 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Shield className="size-3.5 text-primary" />
                Role-Based Access Control · Server Enforced
              </div>

              <p className="text-xs text-muted-foreground">
                Need access or experiencing issues?{" "}
                <Link
                  href="/help#contact"
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Help / Contact Support
                </Link>
              </p>

              <p className="text-[10px] leading-relaxed text-muted-foreground/60">
                © {year} University of Colorado Denver | College of Engineering, Design and Computing
                <span className="mx-1.5" aria-hidden>·</span>
                <Link href="/privacy" className="hover:text-foreground">
                  Privacy Policy
                </Link>
                <span className="mx-1.5" aria-hidden>·</span>
                <Link href="/terms" className="hover:text-foreground">
                  Terms of Service
                </Link>
              </p>
            </div>
          </div>
        </section>
      </motion.div>
    </div>
  );
}
