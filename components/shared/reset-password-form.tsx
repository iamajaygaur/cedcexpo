"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";

import type { ActionResult } from "@/lib/admin/action-result";
import { completeAdminPasswordResetAction } from "@/lib/auth/password-reset";
import { PasswordInput } from "@/components/ui/password-input";

const initial: ActionResult = { ok: true };

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(
    completeAdminPasswordResetAction,
    initial,
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const mismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Choose a new password
        </h1>
        <p className="text-sm text-muted-foreground">
          Set a new password for your admin account, then sign in again.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="new_password"
            className="block text-sm font-semibold text-foreground"
          >
            New password
          </label>
          <PasswordInput
            id="new_password"
            name="new_password"
            required
            minLength={8}
            autoComplete="new-password"
            disabled={pending}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="h-12 rounded-xl border-border bg-card/80 pl-3"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="confirm_password"
            className="block text-sm font-semibold text-foreground"
          >
            Confirm new password
          </label>
          <PasswordInput
            id="confirm_password"
            name="confirm_password"
            required
            minLength={8}
            autoComplete="new-password"
            disabled={pending}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={
              mismatch
                ? "h-12 rounded-xl border-destructive bg-card/80 pl-3 focus-visible:border-destructive focus-visible:ring-destructive/30"
                : "h-12 rounded-xl border-border bg-card/80 pl-3"
            }
          />
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
          disabled={pending || mismatch || newPassword.length < 8}
          aria-busy={pending || undefined}
          whileTap={
            pending || mismatch || newPassword.length < 8
              ? undefined
              : { scale: 0.97 }
          }
          className="btn-shimmer gold-glow flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-all duration-200 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <KeyRound className="size-4" aria-hidden />
          )}
          {pending ? "Updating…" : "Update password"}
        </motion.button>

        <Link
          href="/forgot-password"
          className="inline-flex w-full items-center justify-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Request a new link
        </Link>
      </form>
    </div>
  );
}
