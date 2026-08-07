"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col items-center justify-center bg-[#f8f9fa] px-6 py-20 text-center font-sans text-[#191c1d]">
        {/* Error Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="mb-6 flex size-20 items-center justify-center rounded-2xl bg-[#ffdad6] shadow-sm"
        >
          <AlertTriangle className="size-10 text-[#ba1a1a]" />
        </motion.div>

        {/* Copy */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
        >
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Something Went Wrong
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#4c4639]">
            An unexpected error occurred. This has been logged. You can try
            again or return to a known section.
          </p>

          {error.digest && (
            <p className="mt-3 text-xs text-[#7e7668]">
              Error ID: <code className="rounded bg-[#e1e3e4] px-1.5 py-0.5 text-[11px]">{error.digest}</code>
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
          <button
            onClick={reset}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#c5a86a] px-6 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:brightness-105"
          >
            <RefreshCw className="size-4" />
            Try Again
          </button>
          <a
            href="/"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#e1e3e4] bg-white px-6 text-sm font-semibold text-[#191c1d] shadow-sm transition-all duration-200 hover:bg-[#e1e3e4]"
          >
            <Home className="size-4" />
            Back to Home
          </a>
        </motion.div>

        <p className="mt-16 text-[11px] text-[#7e7668]/60">
          © {new Date().getFullYear()} University of Colorado Denver · CEDC
        </p>
      </body>
    </html>
  );
}
