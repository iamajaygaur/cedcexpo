"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FeedbackTone = "success" | "error";

export type FeedbackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tone: FeedbackTone;
  title: string;
  description?: string;
  /** Primary button label. Defaults: Continue / Try Again */
  actionLabel?: string;
  onAction?: () => void;
};

const springPop = {
  type: "spring" as const,
  stiffness: 420,
  damping: 28,
  mass: 0.85,
};

function DecoSpark({
  className,
  delay = 0,
  reduced,
  children,
}: {
  className?: string;
  delay?: number;
  reduced: boolean | null;
  children?: ReactNode;
}) {
  if (reduced) {
    return (
      <span className={cn("absolute", className)} aria-hidden>
        {children}
      </span>
    );
  }
  return (
    <motion.span
      className={cn("absolute", className)}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.18 + delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      aria-hidden
    >
      {children}
    </motion.span>
  );
}

export function FeedbackDialog({
  open,
  onOpenChange,
  tone,
  title,
  description,
  actionLabel,
  onAction,
}: FeedbackDialogProps) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const isSuccess = tone === "success";
  const label = actionLabel ?? (isSuccess ? "Continue" : "Try Again");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  function handleAction() {
    onAction?.();
    onOpenChange(false);
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="presentation"
        >
          <motion.button
            type="button"
            aria-label="Dismiss"
            className="absolute inset-0 cursor-pointer bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="feedback-dialog-title"
            aria-describedby={
              description ? "feedback-dialog-desc" : undefined
            }
            className="relative z-10 w-full max-w-[calc(100%-2rem)] overflow-hidden rounded-md border border-border bg-background p-6 text-center shadow-lg sm:max-w-md"
            initial={
              reduced
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.96, y: 10 }
            }
            animate={
              reduced
                ? { opacity: 1 }
                : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              reduced
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.98, y: 6 }
            }
            transition={reduced ? { duration: 0.15 } : springPop}
          >
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground opacity-70 transition-opacity hover:opacity-100"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>

            <div className="relative mx-auto mb-5 flex h-28 w-28 items-center justify-center">
              <motion.div
                className={cn(
                  "absolute inset-3 rounded-md opacity-90",
                  isSuccess
                    ? "bg-[color-mix(in_srgb,var(--tertiary)_16%,white)]"
                    : "bg-[color-mix(in_srgb,var(--destructive)_12%,white)]",
                )}
                initial={reduced ? false : { scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.05, duration: 0.4 }}
                aria-hidden
              />

              <DecoSpark
                reduced={reduced}
                delay={0}
                className={cn(
                  "top-2 left-3 size-2 rotate-12 rounded-md",
                  isSuccess ? "bg-rose-400" : "bg-sky-500",
                )}
              />
              <DecoSpark
                reduced={reduced}
                delay={0.05}
                className={cn(
                  "top-4 right-2 h-0.5 w-3 rotate-45 rounded-md",
                  isSuccess ? "bg-tertiary" : "bg-destructive/70",
                )}
              />
              <DecoSpark
                reduced={reduced}
                delay={0.08}
                className="right-4 bottom-6 size-1.5 rounded-md bg-foreground/40"
              />
              <DecoSpark
                reduced={reduced}
                delay={0.1}
                className={cn(
                  "bottom-4 left-4 size-2.5 rounded-md border-2",
                  isSuccess ? "border-tertiary/50" : "border-destructive/40",
                )}
              />
              <DecoSpark
                reduced={reduced}
                delay={0.12}
                className={cn(
                  "top-8 right-0 text-[10px] font-bold leading-none",
                  isSuccess ? "text-tertiary" : "text-sky-500",
                )}
              >
                +
              </DecoSpark>

              <motion.div
                className={cn(
                  "relative z-10 flex items-center justify-center shadow-sm",
                  isSuccess
                    ? "size-[4.5rem] rounded-md bg-tertiary text-white"
                    : "size-[4.5rem] rounded-md bg-destructive text-white",
                )}
                initial={
                  reduced ? false : { scale: 0.5, y: -12, opacity: 0 }
                }
                animate={{ scale: 1, y: 0, opacity: 1 }}
                transition={
                  reduced
                    ? { duration: 0.15 }
                    : { ...springPop, delay: 0.08 }
                }
              >
                {isSuccess ? (
                  <Check className="size-8" strokeWidth={2.75} />
                ) : (
                  <span className="text-2xl font-black leading-none text-white">
                    !
                  </span>
                )}
              </motion.div>
            </div>

            <motion.h2
              id="feedback-dialog-title"
              className="text-lg font-semibold leading-none tracking-tight text-foreground"
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.3 }}
            >
              {title}
            </motion.h2>

            {description ? (
              <motion.p
                id="feedback-dialog-desc"
                className="mx-auto mt-2 max-w-[18rem] text-sm leading-relaxed text-muted-foreground"
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22, duration: 0.3 }}
              >
                {description}
              </motion.p>
            ) : null}

            <motion.div
              className="mt-6 flex justify-center"
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.3 }}
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Button
                  type="button"
                  size="lg"
                  className="min-w-[10rem] px-6 font-semibold"
                  onClick={handleAction}
                >
                  {label}
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

/** Convenience titles derived from action result. */
export function feedbackCopyFromResult(ok: boolean, message?: string) {
  if (ok) {
    return {
      tone: "success" as const,
      title: message ?? "Saved successfully.",
      description: undefined as string | undefined,
      actionLabel: "Continue",
    };
  }
  return {
    tone: "error" as const,
    title: "Something went wrong",
    description: message ?? "Please check the details and try again.",
    actionLabel: "Try Again",
  };
}
