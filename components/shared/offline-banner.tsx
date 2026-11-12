"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Wifi, WifiOff } from "lucide-react";

import { useNetworkStatus } from "@/hooks/use-network-status";
import { cn } from "@/lib/utils";

type OfflineBannerProps = {
  className?: string;
};

/**
 * Offline + slow-network strip. Keeps the shell informative — never a blank wall.
 */
export function OfflineBanner({ className }: OfflineBannerProps) {
  const { status } = useNetworkStatus();
  const reduced = useReducedMotion();

  const mode = status === "online" ? null : status;

  return (
    <AnimatePresence>
      {mode ? (
        <motion.div
          key={mode}
          role="status"
          aria-live="polite"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "flex items-center justify-center gap-2 border-b px-4 py-2 text-center text-sm",
            mode === "offline"
              ? "border-amber-300 bg-amber-50 text-amber-950"
              : "border-sky-200 bg-sky-50 text-sky-950",
            className,
          )}
        >
          {mode === "offline" ? (
            <WifiOff className="size-4 shrink-0" aria-hidden />
          ) : (
            <Wifi className="size-4 shrink-0" aria-hidden />
          )}
          <span>
            {mode === "offline"
              ? "You’re offline. Scores stay on this device and sync when the connection returns — nothing is Submitted until the server confirms."
              : "Slow network detected. Actions may take longer; progress will keep updating — avoid refreshing mid-save."}
          </span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
