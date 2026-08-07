"use client";

import { clearClientAuthArtifacts } from "@/lib/auth/clear-client-session";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Clear local Supabase session + hard-navigate through /api/auth/logout
 * so middleware and cookies are fully reset, then land on /login.
 * Avoids server-action redirect races that surface as the error page.
 */
export async function clientSignOut(options?: { switchAccount?: boolean }) {
  clearClientAuthArtifacts();
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // still navigate
    }
  }
  const path = options?.switchAccount
    ? "/api/auth/logout?switch=1"
    : "/api/auth/logout";
  window.location.assign(path);
}
