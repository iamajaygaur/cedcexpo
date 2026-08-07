"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-6 py-16 text-center">
      {/* Error Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="mb-6 flex size-20 items-center justify-center rounded-2xl bg-destructive/10"
      >
        <AlertTriangle className="size-10 text-destructive" />
      </motion.div>

      {/* Copy */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        className="space-y-3"
      >
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Something Went Wrong
        </h2>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
          An unexpected error occurred while loading this page. You can try
          again or navigate to a different section.
        </p>

        {error.digest && (
          <p className="text-xs text-muted-foreground">
            Error ID:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground">
              {error.digest}
            </code>
          </p>
        )}
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35 }}
        className="mt-8 flex flex-wrap items-center justify-center gap-3"
      >
        <motion.button
          onClick={reset}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="btn-shimmer gold-glow inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground transition-all duration-200 hover:brightness-105"
        >
          <RefreshCw className="size-4" />
          Try Again
        </motion.button>
        <Link
          href="/"
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-6 text-sm font-semibold text-foreground shadow-sm transition-all duration-200 hover:bg-muted"
        >
          <Home className="size-4" />
          Back to Home
        </Link>
      </motion.div>
    </div>
  );
}
