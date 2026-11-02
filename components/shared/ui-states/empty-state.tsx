"use client";

import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { iconPop, stateEnter, stateEnterReduced } from "./state-motion";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
};

/**
 * Guides the user before data exists — one clear next step.
 */
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  const reduced = useReducedMotion();
  const enter = reduced ? stateEnterReduced : stateEnter;

  return (
    <motion.div
      role="status"
      initial={enter.initial}
      animate={enter.animate}
      transition={enter.transition}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-14",
        "rounded-2xl border border-dashed border-border/80 bg-muted/25",
        className,
      )}
    >
      <motion.span
        initial={reduced ? undefined : iconPop.initial}
        animate={reduced ? undefined : iconPop.animate}
        transition={reduced ? undefined : iconPop.transition}
        className="flex size-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--cu-gold)_18%,white)] text-primary"
        aria-hidden
      >
        <Icon className="size-6" strokeWidth={1.75} />
      </motion.span>
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-semibold text-foreground sm:text-base">
          {title}
        </p>
        {description ? (
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </motion.div>
  );
}
