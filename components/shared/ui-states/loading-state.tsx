"use client";

import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

import { stateEase } from "./state-motion";

type SkeletonBlockProps = {
  className?: string;
};

export function SkeletonBlock({ className }: SkeletonBlockProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted/70",
        className,
      )}
      aria-hidden
    >
      <motion.span
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent"
        animate={{ translateX: ["-100%", "100%"] }}
        transition={{
          duration: 1.35,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}

type PageLoadingStateProps = {
  label?: string;
  className?: string;
};

/**
 * Route/segment loading — skeleton grid + live status (not a frozen spinner).
 */
export function PageLoadingState({
  label = "Loading…",
  className,
}: PageLoadingStateProps) {
  const reduced = useReducedMotion();

  return (
    <div
      className={cn(
        "flex min-h-[40vh] flex-1 flex-col justify-center gap-6 px-4 py-10",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="size-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-4 w-1/3" />
            <SkeletonBlock className="h-3 w-1/2" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <SkeletonBlock className="h-24 rounded-2xl" />
          <SkeletonBlock className="h-24 rounded-2xl" />
          <SkeletonBlock className="h-24 rounded-2xl" />
        </div>
        <SkeletonBlock className="h-40 rounded-2xl" />
      </div>
      <motion.p
        className="text-center text-sm font-medium text-muted-foreground"
        animate={
          reduced
            ? undefined
            : { opacity: [0.55, 1, 0.55] }
        }
        transition={
          reduced
            ? undefined
            : { duration: 1.6, repeat: Infinity, ease: stateEase }
        }
      >
        {label}
      </motion.p>
    </div>
  );
}

type SlowPendingHintProps = {
  show: boolean;
  label?: string;
  className?: string;
};

/**
 * Appears after a long wait so the UI never feels frozen.
 */
export function SlowPendingHint({
  show,
  label = "Still working — this can take a moment on expo Wi‑Fi…",
  className,
}: SlowPendingHintProps) {
  const reduced = useReducedMotion();
  if (!show) return null;

  return (
    <motion.p
      role="status"
      aria-live="polite"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      className={cn(
        "text-xs font-medium text-amber-900/80 dark:text-amber-100/90",
        className,
      )}
    >
      {label}
    </motion.p>
  );
}
