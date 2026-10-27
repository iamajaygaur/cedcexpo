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
  const done = total > 0 && remaining === 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn("dash-metric--cream p-5 md:p-6", className)}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="dash-section-label mb-1 text-[#63512d]/Your progress</p>
          <p className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            <span className="tabular-nums text-foreground">{completed}</span>
            <span className="text-muted-foreground"> / {total}</span>
          </p>
          <p className="mt-0.5 text-sm font-medium text-muted-foreground">
            Projects evaluated · {pct}% complete
          </p>
        </div>
        <span
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-bold",
            done
              ? "bg-tertiary/15 text-tertiary"
              : "dash-icon--cream",
          )}
        >
          {done ? "All done" : `${remaining} remaining`}
        </span>
      </div>
      <div
        className="progress-track h-3"
        role="progressbar"
        aria-valuenow={completed}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${completed} of ${total} evaluations completed`}
      >
        <motion.div
          className="progress-fill-gold"
          initial={{ width: 0 }}
          animate={{
            width: `${Math.max(pct > 0 ? 2 : 0, pct)}%`,
          }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </div>
    </motion.section>
  );
}
