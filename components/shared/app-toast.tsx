"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCircle2, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastTone = "success" | "error";

type ToastPayload = {
  tone: ToastTone;
  title: string;
  description?: string;
};

type Store = {
  open: boolean;
  payload: ToastPayload;
};

const empty: ToastPayload = { tone: "success", title: "" };
let store: Store = { open: false, payload: empty };
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return store;
}

/** Lightweight acknowledgement — use for soft successes; keep FeedbackDialog for critical flows. */
export function showAppToast(payload: ToastPayload, durationMs = 3200) {
  store = { open: true, payload };
  emit();
  window.setTimeout(() => {
    if (store.payload.title === payload.title) {
      store = { open: false, payload: store.payload };
      emit();
    }
  }, durationMs);
}

export function dismissAppToast() {
  if (!store.open) return;
  store = { open: false, payload: store.payload };
  emit();
}

export function AppToastHost() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isSuccess = state.payload.tone === "success";

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:justify-end sm:p-6">
      <AnimatePresence>
        {state.open ? (
          <motion.div
            key={state.payload.title}
            role="status"
            aria-live="polite"
            initial={
              reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }
            }
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "pointer-events-auto flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-[0_12px_40px_rgba(25,28,29,0.16)] backdrop-blur-md",
              isSuccess
                ? "border-tertiary/30 bg-white/95 text-foreground"
                : "border-destructive/25 bg-white/95 text-foreground",
            )}
          >
            {isSuccess ? (
              <CheckCircle2
                className="mt-0.5 size-5 shrink-0 text-tertiary"
                aria-hidden
              />
            ) : (
              <XCircle
                className="mt-0.5 size-5 shrink-0 text-destructive"
                aria-hidden
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold">{state.payload.title}</p>
              {state.payload.description ? (
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {state.payload.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="ml-1 shrink-0 rounded-md px-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={dismissAppToast}
            >
              Dismiss
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
