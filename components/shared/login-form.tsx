"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  User,
  Gavel,
  ShieldCheck,
} from "lucide-react";

import { clearClientAuthArtifacts } from "@/lib/auth/clear-client-session";
import { SUPPORT_EMAIL } from "@/lib/contact";

type LoginFormProps = {
  authError?: string | null;
  errorMessage?: string | null;
  configured?: boolean;
  supportEmail?: string;
  switchingAccount?: boolean;
};

export function LoginForm({
  authError,
  errorMessage,
  configured = true,
  supportEmail = SUPPORT_EMAIL,
  switchingAccount = false,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [activeRole, setActiveRole] = useState<"judge" | "admin">("judge");
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (switchingAccount) {
      clearClientAuthArtifacts();
    }
  }, [switchingAccount]);

  const message =
    errorMessage ||
    (authError === "auth_not_configured"
      ? "Authentication is not configured. Add Supabase keys to .env.local and restart the server."
      : authError === "inactive_judge"
        ? "No active account. An admin must activate your judge account before you can sign in."
        : authError === "session_timeout"
          ? "You were signed out after 25 minutes of inactivity. Please log in again."
          : authError === "login_failed"
            ? "Invalid username or password."
            : null);

  return (
    <form
      method="post"
      action="/api/auth/login"
      autoComplete="on"
      className="space-y-5"
      /* Chrome iOS autofill injects __gcruniqueid before hydrate — not our bug */
      suppressHydrationWarning
      onSubmit={() => {
        // Sync only — do not setState here (React re-render can drop FormData).
        if (passwordRef.current) {
          passwordRef.current.type = "password";
        }
      }}
    >
      <div className="space-y-2">
        <label className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Log In Role
        </label>
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/50 bg-muted/60 p-1">
          <button
            type="button"
            onClick={() => setActiveRole("judge")}
            className={`relative flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-colors ${
              activeRole === "judge"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {activeRole === "judge" && (
              <motion.div
                layoutId="role-tab"
                className="absolute inset-0 rounded-lg border border-border/40 bg-card shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <Gavel className="relative z-10 size-3.5" />
            <span className="relative z-10">Judge</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveRole("admin")}
            className={`relative flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-colors ${
              activeRole === "admin"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {activeRole === "admin" && (
              <motion.div
                layoutId="role-tab"
                className="absolute inset-0 rounded-lg border border-border/40 bg-card shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <ShieldCheck className="relative z-10 size-3.5" />
            <span className="relative z-10">Administrator</span>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="username"
            className="block text-sm font-semibold text-foreground"
          >
            {activeRole === "judge" ? "Judge Username" : "Admin Email Address"}
          </label>
          <span className="text-[11px] text-muted-foreground">Required</span>
        </div>
        <div className="relative">
          <User
            className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            id="username"
            name="username"
            type={activeRole === "admin" ? "email" : "text"}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode={activeRole === "admin" ? "email" : "text"}
            required
            suppressHydrationWarning
            placeholder={
              activeRole === "judge"
                ? "Username (e.g. ajaygaur)"
                : "admin@ucdenver.edu"
            }
            disabled={!configured}
            className="h-12 w-full rounded-xl border border-border bg-card/80 pr-4 pl-11 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/50 focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          />
        </div>
        <AnimatePresence mode="wait">
          <motion.p
            key={activeRole}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="text-xs text-muted-foreground"
          >
            {activeRole === "judge"
              ? "Judges use the assigned username provided by event organizers."
              : "Admins use their registered institutional email address."}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-foreground"
          >
            Password
          </label>
          <span className="text-[11px] text-muted-foreground">Min 8 chars</span>
        </div>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            ref={passwordRef}
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            minLength={8}
            placeholder="••••••••"
            disabled={!configured}
            suppressHydrationWarning
            className="h-12 w-full rounded-xl border border-border bg-card/80 pr-12 pl-11 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/50 focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          />
          <button
            type="button"
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            disabled={!configured}
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
          <input
            type="checkbox"
            name="remember"
            value="on"
            defaultChecked
            className="size-4 cursor-pointer rounded border-border accent-primary"
            disabled={!configured}
          />
          Remember Me
        </label>
        <a
          href={`mailto:${supportEmail}?subject=CEDC%20Expo%20Password%20Reset`}
          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          Forgot Password?
        </a>
      </div>

      {switchingAccount && (
        <motion.p
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          role="status"
          className="rounded-xl border border-primary/25 bg-primary/08 px-4 py-3 text-xs text-foreground"
        >
          Previous session cleared. Log in with the account you want to use.
        </motion.p>
      )}

      {message && (
        <motion.p
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive"
        >
          {message}
        </motion.p>
      )}

      <button
        type="submit"
        id="login-submit-btn"
        disabled={!configured}
        className="btn-shimmer gold-glow flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-all duration-200 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {configured ? "Log In to Dashboard" : "Configure env first"}
        {configured && <ArrowRight className="size-4" aria-hidden />}
      </button>
    </form>
  );
}
