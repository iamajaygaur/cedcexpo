"use client";

import { useNetworkStatus } from "@/hooks/use-network-status";
import { cn } from "@/lib/utils";

type OfflineBannerProps = {
  className?: string;
};

/**
 * Expo Wi-Fi resilience banner. Does not change authz — only UX.
 */
export function OfflineBanner({ className }: OfflineBannerProps) {
  const { online } = useNetworkStatus();

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950",
        className,
      )}
    >
      You&apos;re offline. Entered scores stay on this device and will sync when
      the connection returns. Evaluations are never marked Submitted until the
      server confirms.
    </div>
  );
}
