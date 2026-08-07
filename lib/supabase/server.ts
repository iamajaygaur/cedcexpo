import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  SESSION_MODE_COOKIE,
  applySessionCookieOptions,
  isEphemeralSessionMode,
  type SessionMode,
} from "@/lib/auth/session-mode";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

function modeFromCookieStore(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
): SessionMode {
  const raw = cookieStore.get(SESSION_MODE_COOKIE)?.value;
  return isEphemeralSessionMode(raw) ? "ephemeral" : "persistent";
}

/**
 * Server Component / Server Action Supabase client (cookie session).
 * Uses the anon/publishable key; privilege comes from the user JWT + RLS.
 */
export async function createClient(sessionModeOverride?: SessionMode) {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  const cookieStore = await cookies();
  const sessionMode = sessionModeOverride ?? modeFromCookieStore(cookieStore);

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(
              name,
              value,
              applySessionCookieOptions(options, sessionMode),
            );
          });
        } catch {
          // Called from a Server Component where cookies are read-only.
          // Middleware will refresh the session instead.
        }
      },
    },
  });
}
