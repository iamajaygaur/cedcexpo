"use client";

import { SearchX } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { iconPop, stateEnter, stateEnterReduced } from "./state-motion";

type ZeroResultsProps = {
  query?: string;
  title?: string;
  description?: string;
  onClear?: () => void;
  clearLabel?: string;
  action?: ReactNode;
  className?: string;
};

/**
 * Search/filter dead-end with a clear recovery path.
 */
export function ZeroResults({
  query,
  title,
  description,
  onClear,
  clearLabel = "Clear filters",
  action,
  className,
}: ZeroResultsProps) {
  const reduced = useReducedMotion();
  const enter = reduced ? stateEnterReduced : stateEnter;
  const trimmed = query?.trim();

  return (
    <motion.div
      role="status"
      initial={enter.initial}
      animate={enter.animate}
      transition={enter.transition}
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      <motion.span
        initial={reduced ? undefined : iconPop.initial}
        animate={reduced ? undefined : iconPop.animate}
        transition={reduced ? undefined : iconPop.transition}
        className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground"
        aria-hidden
      >
        <SearchX className="size-5" strokeWidth={1.75} />
      </motion.span>
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-semibold text-foreground">
          {title ??
            (trimmed
              ? `No results for “${trimmed}”`
              : "No results match your filters")}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {description ??
            "Try a different search, clear filters, or check spelling."}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onClear ? (
          <Button type="button" variant="outline" size="sm" onClick={onClear}>
            {clearLabel}
          </Button>
        ) : null}
        {action}
      </div>
    </motion.div>
  );
}
