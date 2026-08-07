"use client";

import { useEffect, useRef } from "react";

import { clearClientAuthArtifacts } from "@/lib/auth/clear-client-session";
import { SESSION_MODE_COOKIE } from "@/lib/auth/session-mode";
import { createClient } from "@/lib/supabase/client";

/** Auto sign-out after this much user inactivity (admin + judge). */
export const IDLE_TIMEOUT_MS = 25 * 60 * 1000;

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
  "wheel",
] as const;

async function forceLogoutToLogin() {
  clearClientAuthArtifacts();
  try {
    const supabase = createClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Ignore missing env on edge cases.
  }
  document.cookie = `${SESSION_MODE_COOKIE}=; Max-Age=0; Path=/`;
  window.location.assign("/login?error=session_timeout");
}

/**
 * Signs the user out after 25 minutes without interaction.
 * Mount inside AdminShell / JudgeShell only (authenticated UI).
 */
export function IdleSessionGuard() {
  const lastActivityRef = useRef(Date.now());
  const loggingOutRef = useRef(false);

  useEffect(() => {
    let throttleUntil = 0;

    function markActivity() {
      const now = Date.now();
      if (now < throttleUntil) return;
      throttleUntil = now + 1000;
      lastActivityRef.current = now;
    }

    function checkIdle() {
      if (loggingOutRef.current) return;
      if (Date.now() - lastActivityRef.current < IDLE_TIMEOUT_MS) return;
      loggingOutRef.current = true;
      void forceLogoutToLogin();
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

    const intervalId = window.setInterval(checkIdle, 15_000);
    lastActivityRef.current = Date.now();

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, markActivity);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(intervalId);
    };
  }, []);

  return null;
}
