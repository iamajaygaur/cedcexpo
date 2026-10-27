"use client";

import { MotionConfig } from "motion/react";

/**
 * App-wide Motion defaults: honor prefers-reduced-motion.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </MotionConfig>
  );
}
