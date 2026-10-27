"use client";

import { Loader2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

type LoadingButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
    loadingLabel?: string;
    asChild?: never;
  };

/**
 * Primary action button with press feedback + loading spinner.
 */
export function LoadingButton({
  loading = false,
  loadingLabel,
  disabled,
  children,
  className,
  variant,
  size,
  type = "submit",
  ...props
}: LoadingButtonProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="inline-flex w-full sm:w-auto"
      whileTap={reduced || loading || disabled ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.12 }}
    >
      <Button
        type={type}
        variant={variant}
        size={size}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn("relative w-full", className)}
        {...props}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {loadingLabel ?? children}
          </span>
        ) : (
          children
        )}
      </Button>
    </motion.div>
  );
}
