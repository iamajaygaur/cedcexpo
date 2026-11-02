"use client";

import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { iconPop, stateEnter, stateEnterReduced } from "./state-motion";

type PermissionDeniedProps = {
  title?: string;
  description?: string;
  homeHref?: string;
  homeLabel?: string;
  className?: string;
};

/**
 * Explains why access is blocked and how to recover.
 */
export function PermissionDenied({
  title = "Permission denied",
  description = "Your account doesn’t have access to this area. Return to your dashboard or ask an administrator if you need elevated access.",
  homeHref = "/",
  homeLabel = "Go to home",
  className,
}: PermissionDeniedProps) {
  const reduced = useReducedMotion();
  const enter = reduced ? stateEnterReduced : stateEnter;

  return (
    <motion.div
      role="alert"
      initial={enter.initial}
      animate={enter.animate}
      transition={enter.transition}
      className={cn(
        "flex min-h-[60dvh] flex-col items-center justify-center px-6 py-16 text-center",
        className,
      )}
    >
      <motion.span
        initial={reduced ? undefined : iconPop.initial}
        animate={reduced ? undefined : iconPop.animate}
        transition={reduced ? undefined : iconPop.transition}
        className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground"
        aria-hidden
      >
        <ShieldOff className="size-8" strokeWidth={1.75} />
      </motion.span>
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <Button asChild className="mt-8">
        <Link href={homeHref}>{homeLabel}</Link>
      </Button>
    </motion.div>
  );
}
