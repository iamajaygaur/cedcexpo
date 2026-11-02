"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FilterToolbarProps = {
  children: ReactNode;
  className?: string;
  /** When true, sits inside a table shell (border-b row). Default: standalone row. */
  inset?: boolean;
};

/**
 * App-wide search + filter row — medium radius controls only (no pills).
 * Use with SearchInput + Select `rounded-md` + optional trailing actions.
 */
export function FilterToolbar({
  children,
  className,
  inset = false,
}: FilterToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 lg:flex-row lg:items-center",
        inset ? "border-b border-border p-4" : undefined,
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Shared Select sizing for filter bars — matches Teams / Assignments. */
export const FILTER_SELECT_CLASS =
  "h-10 w-full shrink-0 rounded-md sm:w-auto sm:min-w-[9rem]";

type FilterViewToggleProps = {
  options: readonly {
    id: string;
    label: string;
    icon?: ReactNode;
  }[];
  value: string;
  onChange: (id: string) => void;
  "aria-label"?: string;
  className?: string;
};

/**
 * Segmented view switcher with rounded-md (not pill) active state.
 */
export function FilterViewToggle({
  options,
  value,
  onChange,
  "aria-label": ariaLabel = "View",
  className,
}: FilterViewToggleProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "flex w-full shrink-0 rounded-md border border-border bg-muted/50 p-0.5 sm:ml-auto sm:w-auto",
        className,
      )}
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            aria-pressed={active}
            className={cn(
              "inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold transition-colors sm:flex-none sm:px-3.5 sm:text-sm",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.icon}
            <span className="whitespace-nowrap">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
