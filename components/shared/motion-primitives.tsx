"use client";

import { Loader2 } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";
import { cn } from "@/lib/utils";

export const EASE_EXPO = [0.16, 1, 0.3, 1] as const;

/* ── Shared Motion Variants ─────────────────────────────────── */

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
} as const;

export const fadeUpItem = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_EXPO },
  },
} as const;

/* ── Stagger Container ──────────────────────────────────────── */

export function StaggerContainer({
  children,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "ul";
}) {
  const Component = motion.create(Tag);
  return (
    <Component
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </Component>
  );
}

/* ── Fade-Up Item ───────────────────────────────────────────── */

export function FadeUpItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={fadeUpItem} className={className}>
      {children}
    </motion.div>
  );
}

/* ── FadeIn (standalone mount) ──────────────────────────────── */

export function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE_EXPO, delay }}
    >
      {children}
    </motion.div>
  );
}

/* ── Pressable (click feedback wrapper) ─────────────────────── */

export function Pressable({
  children,
  className,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={cn("inline-flex", className)}
      whileTap={reduced || disabled ? undefined : { scale: 0.97 }}
      whileHover={reduced || disabled ? undefined : { y: -1 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  );
}

/* ── Animated Card ──────────────────────────────────────────── */

export function AnimatedCard({
  children,
  className,
  hoverLift = -3,
}: {
  children: React.ReactNode;
  className?: string;
  hoverLift?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      variants={fadeUpItem}
      whileHover={
        reduced ? undefined : { y: hoverLift, transition: { duration: 0.2 } }
      }
      whileTap={reduced ? undefined : { scale: 0.995 }}
      className={cn(
        "dash-metric transition-shadow hover:shadow-md",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

/* ── Animated Progress Bar ──────────────────────────────────── */

export function AnimatedBar({
  percent,
  className,
  delay = 0.3,
  gradient = false,
}: {
  percent: number;
  className?: string;
  delay?: number;
  gradient?: boolean;
}) {
  return (
    <motion.div
      className={cn(
        "h-full rounded-full",
        gradient
          ? "bg-gradient-to-r from-primary to-primary/70"
          : "bg-primary",
        className,
      )}
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(100, percent)}%` }}
      transition={{
        duration: 0.7,
        ease: EASE_EXPO,
        delay,
      }}
    />
  );
}

/* ── Loading Spinner ────────────────────────────────────────── */

export function LoadingSpinner({
  className,
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-2 text-sm text-muted-foreground", className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
      <span>{label}</span>
    </span>
  );
}

/* ── Inline pending strip (forms) ───────────────────────────── */

export function PendingStatus({
  show,
  label = "Working…",
}: {
  show: boolean;
  label?: string;
}) {
  return (
    <AnimatePresence initial={false}>
      {show ? (
        <motion.p
          key="pending"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: EASE_EXPO }}
          className="overflow-hidden text-xs text-muted-foreground"
        >
          <span className="inline-flex items-center gap-2 py-0.5">
            <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden />
            {label}
          </span>
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}

/* ── Full-block busy overlay (dialogs / panels) ─────────────── */

export function BusyOverlay({
  show,
  label = "Please wait…",
}: {
  show: boolean;
  label?: string;
}) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key="busy"
          className="absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-card/70 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          aria-busy
          aria-live="polite"
        >
          <LoadingSpinner label={label} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
