import "server-only";

import { requireSessionProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin-only server helper. Relies on session + profiles.role (not client claims).
 */
export async function requireAdminClient() {
  const profile = await requireSessionProfile();
  if (profile.role !== "admin") {
    throw new Error("Admin access required");
  }
  const supabase = await createClient();
  return { profile, supabase };
}
