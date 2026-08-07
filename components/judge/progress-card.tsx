"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type ProgressCardProps = {
  completed: number;
  total: number;
  className?: string;
};

export function ProgressCard({ completed, total, className }: ProgressCardProps) {
  const remaining = Math.max(0, total - completed);
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-sm md:p-6",
        className,
      )}
    >
      <p className="mb-3 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        Your Progress
      </p>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          <span className="text-primary">{completed}</span>
          <span className="text-muted-foreground"> / {total}</span>
          <span className="ml-2 text-base font-semibold text-foreground md:text-lg">
            Projects Evaluated
          </span>
        </p>
        <span className="rounded-lg bg-primary-container px-3 py-1 text-xs font-bold text-on-primary-container">
          {remaining} Remaining
        </span>
      </div>
      <div
        className="h-3 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={completed}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${completed} of ${total} evaluations completed`}
      >
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </div>
    </motion.section>
  );
}
