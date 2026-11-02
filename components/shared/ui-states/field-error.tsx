"use client";

import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

type FieldErrorProps = {
  message?: string | null;
  id?: string;
  className?: string;
};

/**
 * Inline validation at the field — brief shake draws the eye without drama.
 */
export function FieldError({ message, id, className }: FieldErrorProps) {
  const reduced = useReducedMotion();
  if (!message) return null;

  return (
    <motion.p
      id={id}
      role="alert"
      key={message}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: -2 }}
      animate={
        reduced
          ? { opacity: 1 }
          : { opacity: 1, y: 0, x: [0, -5, 5, -3, 3, 0] }
      }
      transition={
        reduced
          ? { duration: 0.15 }
          : {
              opacity: { duration: 0.2 },
              y: { duration: 0.2 },
              x: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
            }
      }
      className={cn("text-xs font-medium text-destructive", className)}
    >
      {message}
    </motion.p>
  );
}
