"use client";

import { motion, useReducedMotion } from "motion/react";

import { EASE_EXPO } from "@/components/shared/motion-primitives";

/**
 * Smooth Motion page transition for route content.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE_EXPO }}
    >
      {children}
    </motion.div>
  );
}
