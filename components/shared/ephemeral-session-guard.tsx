"use client";

import { useEffect } from "react";

import { clearClientAuthArtifacts } from "@/lib/auth/clear-client-session";
import { SESSION_MODE_COOKIE } from "@/lib/auth/session-mode";
import { createClient } from "@/lib/supabase/client";

function readSessionMode(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${SESSION_MODE_COOKIE}=`));
  return match?.split("=")[1] ?? null;
}

/**
 * When "Remember Me" was unchecked, sign out if the document is unloading
 * (tab/app close or hard refresh). Soft Next.js navigations do not fire this.
 */
export function EphemeralSessionGuard() {
  useEffect(() => {
    function onPageHide(event: PageTransitionEvent) {
      if (event.persisted) return;
      if (readSessionMode() !== "ephemeral") return;

      clearClientAuthArtifacts();
      try {
        const supabase = createClient();
        void supabase.auth.signOut({ scope: "local" });
      } catch {
        // Env may be missing on public pages — ignore.
      }

      // Clear mode cookie client-side as a best-effort (server also clears on logout).
      document.cookie = `${SESSION_MODE_COOKIE}=; Max-Age=0; Path=/`;
    }

    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  return null;
}
