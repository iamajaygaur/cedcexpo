"use client";

import { cn } from "@/lib/utils";

export type SaveStatus = "idle" | "saving" | "saved" | "unsaved" | "error";

type SaveStatusIndicatorProps = {
  status: SaveStatus;
  message?: string;
  className?: string;
};

export function SaveStatusIndicator({
  status,
  message,
  className,
}: SaveStatusIndicatorProps) {
  const label =
    message ??
    ({
      idle: "",
      saving: "Saving…",
      saved: "Saved",
      unsaved: "Unsaved changes",
      error: "Could not save draft",
    }[status] as string);

  if (status === "idle" || !label) return null;

  return (
    <p
      role="status"
      aria-live="polite"
      className={cn(
        "text-sm font-medium",
        status === "saved" && "text-emerald-700",
        status === "saving" && "text-muted-foreground",
        status === "unsaved" && "text-amber-700",
        status === "error" && "text-destructive",
        className,
      )}
    >
      {label}
    </p>
  );
}
