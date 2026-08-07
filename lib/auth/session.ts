import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { TABLES } from "@/lib/supabase/tables";
import { isAppRole, type AppRole } from "@/lib/permissions/roles";
import type { UserRole } from "@/types/database";

export type SessionProfile = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
};

export function dashboardPathForRole(role: AppRole): string {
  return role === "admin" ? "/admin/dashboard" : "/judge/dashboard";
}

/**
 * Derive identity from the cookie session + profiles row.
 * Never trust client-supplied role claims.
 */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from(TABLES.profiles)
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return null;
  }

  if (!isAppRole(profile.role)) {
    return null;
  }

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
  };
}

export async function requireSessionProfile(): Promise<SessionProfile> {
  const profile = await getSessionProfile();
  if (!profile) {
    redirect("/login");
  }
  return profile;
}

export async function requireRole(role: AppRole): Promise<SessionProfile> {
  const profile = await requireSessionProfile();
  if (profile.role !== role) {
    redirect(dashboardPathForRole(profile.role));
  }
  return profile;
}
