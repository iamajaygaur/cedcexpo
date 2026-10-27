"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Loader2, Mail } from "lucide-react";

import type { ActionResult } from "@/lib/admin/action-result";
import { requestAdminPasswordResetAction } from "@/lib/auth/password-reset";

const initial: ActionResult = { ok: true };

type ForgotPasswordFormProps = {
  configured: boolean;
  initialError?: string | null;
};

export function ForgotPasswordForm({
  configured,
  initialError = null,
}: ForgotPasswordFormProps) {
  const [state, formAction, pending] = useActionState(
    requestAdminPasswordResetAction,
    initial,
  );
  const wasPending = useRef(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (wasPending.current && !pending && state.ok && state.message) {
      setSent(true);
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Reset admin password
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter the admin email on file. We&apos;ll send a secure link to choose
          a new password. Judge accounts are reset by an administrator.
        </p>
      </div>

      {initialError ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive"
        >
          {initialError}
        </p>
      ) : null}

      {sent ? (
        <div
          role="status"
          className="space-y-4 rounded-xl border border-tertiary/30 bg-tertiary/10 px-4 py-4 text-sm text-foreground"
        >
          <p>{state.message}</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-2 hover:underline"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Back to login
          </Link>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="reset-email"
              className="block text-sm font-semibold text-foreground"
            >
              Admin email
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                id="reset-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={!configured || pending}
                placeholder="admin@ucdenver.edu"
                className="h-12 w-full rounded-xl border border-border bg-card/80 pr-4 pl-11 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/50 focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              />
            </div>
          </div>

          {!state.ok && state.message ? (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive"
            >
              {state.message}
            </p>
          ) : null}

          <motion.button
            type="submit"
            disabled={!configured || pending}
            aria-busy={pending || undefined}
            whileTap={!pending && configured ? { scale: 0.97 } : undefined}
            className="btn-shimmer gold-glow flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-all duration-200 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Sending…
              </>
            ) : (
              <>
                Send reset link
                <ArrowRight className="size-4" aria-hidden />
              </>
            )}
          </motion.button>

          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Back to login
          </Link>
        </form>
      )}
    </div>
  );
}
