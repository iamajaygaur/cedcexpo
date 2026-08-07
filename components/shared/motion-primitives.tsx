"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/* ── Shared Motion Variants ─────────────────────────────────── */

/**
 * Container variant: staggers children on mount.
 * Use as `variants={staggerContainer}` on a parent `motion.div`.
 */
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
} as const;

/**
 * Item variant: fade-up entrance.
 * Use as `variants={fadeUpItem}` on child `motion.div` elements.
 */
export const fadeUpItem = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
} as const;

/* ── Stagger Container ──────────────────────────────────────── */

/**
 * A motion.div that staggers its children on mount.
 * Wrap any section (KPI grid, card list, etc.) to get cascade animations.
 */
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

/**
 * A motion.div child that fades up into view.
 * Must be inside a StaggerContainer (or a parent with stagger variants).
 */
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

/* ── Animated Card ──────────────────────────────────────────── */

/**
 * A card wrapper with fade-up entrance + hover lift micro-interaction.
 * Designed for list/grid items (teams, groups, judges, etc.).
 */
export function AnimatedCard({
  children,
  className,
  hoverLift = -3,
}: {
  children: React.ReactNode;
  className?: string;
  hoverLift?: number;
}) {
  return (
    <motion.div
      variants={fadeUpItem}
      whileHover={{ y: hoverLift, transition: { duration: 0.2 } }}
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

/* ── Animated Progress Bar ──────────────────────────────────── */

/**
 * A progress bar that animates its width from 0 on mount.
 */
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
        ease: [0.16, 1, 0.3, 1] as const,
        delay,
      }}
    />
  );
}
