import "server-only";

import { forbidden } from "next/navigation";

import { requireSessionProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin-only server helper. Relies on session + profiles.role (not client claims).
 * Non-admins hit app/forbidden.tsx via Next auth interrupts.
 */
export async function requireAdminClient() {
  const profile = await requireSessionProfile();
  if (profile.role !== "admin") {
    forbidden();
  }
  const supabase = await createClient();
  return { profile, supabase };
}
