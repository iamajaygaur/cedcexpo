"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

type AnalyticsGaugeProps = {
  /** 0–100 */
  value: number;
  label: string;
  detail?: string;
  /** Accessible name */
  ariaLabel?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Optional CSS color for the filled arc (defaults to gold→teal). */
  accent?: string;
  accentEnd?: string;
};

const SIZE_CLASS = {
  sm: "size-28 sm:size-32",
  md: "size-40 sm:size-44",
  lg: "size-44 sm:size-48",
} as const;

const INSET_CLASS = {
  sm: "inset-[20%]",
  md: "inset-[18%]",
  lg: "inset-[18%]",
} as const;

const VALUE_CLASS = {
  sm: "text-2xl sm:text-3xl",
  md: "text-3xl sm:text-4xl",
  lg: "text-3xl sm:text-4xl",
} as const;

/**
 * Radial gauge for a single KPI.
 * Numeric value always visible (a11y). CEDC gold→teal by default.
 */
export function AnalyticsGauge({
  value,
  label,
  detail,
  ariaLabel,
  className,
  size = "md",
  accent = "var(--cu-gold)",
  accentEnd = "var(--tertiary)",
}: AnalyticsGaugeProps) {
  const reduced = useReducedMotion();
  const pct = Math.max(0, Math.min(100, value));
  const sweep = 288;
  const filled = (pct / 100) * sweep;
  const start = 90 + (360 - sweep) / 2;

  const fill =
    pct <= 0
      ? `conic-gradient(from ${start}deg, var(--muted) 0deg ${sweep}deg, transparent ${sweep}deg 360deg)`
      : `conic-gradient(from ${start}deg, ${accent} 0deg ${filled * 0.55}deg, ${accentEnd} ${filled}deg, var(--muted) ${filled}deg ${sweep}deg, transparent ${sweep}deg 360deg)`;

  return (
    <div
      className={cn("flex flex-col items-center", className)}
      role="img"
      aria-label={
        ariaLabel ??
        `${label}: ${pct.toFixed(1)} percent${detail ? `, ${detail}` : ""}`
      }
    >
      <motion.div
        className={cn("relative rounded-full shadow-sm", SIZE_CLASS[size])}
        style={{ background: fill }}
        initial={reduced ? false : { scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className={cn(
            "absolute flex flex-col items-center justify-center rounded-full bg-card shadow-inner",
            INSET_CLASS[size],
          )}
        >
          <span
            className={cn(
              "font-heading font-bold tabular-nums tracking-tight text-foreground",
              VALUE_CLASS[size],
            )}
          >
            {pct.toFixed(pct >= 10 ? 0 : 1)}
            <span className="text-base font-semibold text-muted-foreground sm:text-lg">
              %
            </span>
          </span>
          <span className="mt-0.5 max-w-[6.5rem] text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
      </motion.div>
      {detail ? (
        <p className="mt-3 text-center text-sm text-muted-foreground">{detail}</p>
      ) : null}
    </div>
  );
}
