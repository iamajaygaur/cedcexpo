"use client";

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { iconPop, stateEnter, stateEnterReduced } from "./state-motion";

type ErrorPanelProps = {
  title?: string;
  description?: string;
  digest?: string;
  onRetry?: () => void;
  retryLabel?: string;
  secondaryAction?: ReactNode;
  icon?: LucideIcon;
  className?: string;
};

/**
 * Clear cause + actionable recovery for route/action failures.
 */
export function ErrorPanel({
  title = "Something went wrong",
  description = "This has been logged. Try again, or go back and continue from a known page.",
  digest,
  onRetry,
  retryLabel = "Try again",
  secondaryAction,
  icon: Icon = AlertTriangle,
  className,
}: ErrorPanelProps) {
  const reduced = useReducedMotion();
  const enter = reduced ? stateEnterReduced : stateEnter;

  return (
    <motion.div
      role="alert"
      initial={enter.initial}
      animate={enter.animate}
      transition={enter.transition}
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        className,
      )}
    >
      <motion.span
        initial={reduced ? undefined : iconPop.initial}
        animate={reduced ? undefined : iconPop.animate}
        transition={reduced ? undefined : iconPop.transition}
        className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"
        aria-hidden
      >
        <Icon className="size-8" strokeWidth={1.75} />
      </motion.span>
      <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {digest ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Error ID:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground">
            {digest}
          </code>
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {onRetry ? (
          <Button type="button" onClick={onRetry} className="gap-2">
            <RefreshCw className="size-4" aria-hidden />
            {retryLabel}
          </Button>
        ) : null}
        {secondaryAction}
      </div>
    </motion.div>
  );
}
