"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Loader2, User } from "lucide-react";

import type { ActionResult } from "@/lib/admin/action-result";
import { requestJudgePasswordHelpAction } from "@/lib/auth/judge-help";

const initial: ActionResult = { ok: true };

type JudgeHelpFormProps = {
  configured: boolean;
};

export function JudgeHelpForm({ configured }: JudgeHelpFormProps) {
  const [state, formAction, pending] = useActionState(
    requestJudgePasswordHelpAction,
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
          Judge sign-in help
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your judge username. An administrator will reset your password
          and share the new one with you. This does not email a reset link.
        </p>
      </div>

      {!state.ok && state.message ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive"
        >
          {state.message}
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
              htmlFor="judge-help-username"
              className="block text-sm font-semibold text-foreground"
            >
              Judge username
            </label>
            <div className="relative">
              <User
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                id="judge-help-username"
                name="username"
                type="text"
                autoComplete="username"
                required
                disabled={!configured || pending}
                placeholder="your.username"
                className="h-12 w-full rounded-xl border border-border bg-background pr-3 pl-10 text-sm outline-none ring-primary/30 focus:ring-2 disabled:opacity-60"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="judge-help-note"
              className="block text-sm font-semibold text-foreground"
            >
              Optional note
            </label>
            <textarea
              id="judge-help-note"
              name="note"
              rows={3}
              maxLength={200}
              disabled={!configured || pending}
              placeholder="Booth number or how we can find you"
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none ring-primary/30 focus:ring-2 disabled:opacity-60"
            />
          </div>

          <motion.button
            type="submit"
            disabled={!configured || pending}
            whileTap={{ scale: 0.98 }}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity disabled:opacity-60"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Sending…
              </>
            ) : (
              <>
                Request help
                <ArrowRight className="size-4" aria-hidden />
              </>
            )}
          </motion.button>
        </form>
      )}
    </div>
  );
}
