"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createPortal } from "react-dom";
import { Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { clearClientAuthArtifacts } from "@/lib/auth/clear-client-session";

/** Auto sign-out after this much user inactivity (admin + judge). */
export const IDLE_TIMEOUT_MS = 25 * 60 * 1000;
/** Warn before hard logout so drafts can be finished. */
export const IDLE_WARN_MS = 23 * 60 * 1000;

/**
 * Intentional interaction only. Do NOT include `mousemove` — trackpad/mouse
 * jitter was resetting the timer and preventing judges from ever timing out.
 */
const ACTIVITY_EVENTS = [
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "pointerdown",
  "wheel",
] as const;

function forceLogoutToLogin() {
  clearClientAuthArtifacts();
  // Full cookie clear via logout route, then land on the timeout message.
  window.location.assign("/api/auth/logout?error=session_timeout");
}

/**
 * Signs the user out after 25 minutes without interaction.
 * Shows a warning dialog 2 minutes prior so work isn't lost silently.
 */
export function IdleSessionGuard() {
  const lastActivityRef = useRef(Date.now());
  const loggingOutRef = useRef(false);
  const warnOpenRef = useRef(false);
  const [warnOpen, setWarnOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  const staySignedIn = useCallback(() => {
    lastActivityRef.current = Date.now();
    warnOpenRef.current = false;
    setWarnOpen(false);
  }, []);

  useEffect(() => {
    let throttleUntil = 0;

    function markActivity() {
      // While the warning is up, only "Stay signed in" extends the session.
      if (warnOpenRef.current || loggingOutRef.current) return;
      const now = Date.now();
      if (now < throttleUntil) return;
      throttleUntil = now + 1000;
      lastActivityRef.current = now;
    }

    function checkIdle() {
      if (loggingOutRef.current) return;
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor >= IDLE_TIMEOUT_MS) {
        loggingOutRef.current = true;
        warnOpenRef.current = false;
        setWarnOpen(false);
        forceLogoutToLogin();
        return;
      }
      if (idleFor >= IDLE_WARN_MS && !warnOpenRef.current) {
        warnOpenRef.current = true;
        setWarnOpen(true);
      }
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        checkIdle();
      }
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, markActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisibility);

    // Check often enough that the 2-minute warn window is reliable even when
    // the tab was background-throttled and then focused again.
    const intervalId = window.setInterval(checkIdle, 5_000);
    lastActivityRef.current = Date.now();

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, markActivity);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(intervalId);
    };
    // Mount once — do not rebind when the warning opens (that used to reset
    // lastActivity and push logout out by another full 25 minutes).
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {warnOpen ? (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="session-expiry-title"
          aria-describedby="session-expiry-desc"
        >
          <motion.div
            initial={
              reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }
            }
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[0_24px_64px_rgba(25,28,29,0.22)]"
          >
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-800">
              <Clock className="size-6" aria-hidden />
            </div>
            <h2
              id="session-expiry-title"
              className="text-lg font-bold tracking-tight text-foreground"
            >
              Session expiring soon
            </h2>
            <p
              id="session-expiry-desc"
              className="mt-2 text-sm leading-relaxed text-muted-foreground"
            >
              You&apos;ve been idle for about 23 minutes. Sign-out happens in
              about two minutes. Stay signed in to keep working — evaluation
              drafts on this device are preserved until then.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button type="button" onClick={staySignedIn} className="flex-1">
                Stay signed in
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  loggingOutRef.current = true;
                  forceLogoutToLogin();
                }}
              >
                Sign out now
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
