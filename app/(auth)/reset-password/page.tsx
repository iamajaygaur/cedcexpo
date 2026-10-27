import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ResetPasswordForm } from "@/components/shared/reset-password-form";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { TABLES } from "@/lib/supabase/tables";

export default async function ResetPasswordPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login?error=auth_not_configured");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/forgot-password?error=${encodeURIComponent("Open the link from your email to reset your password.")}`,
    );
  }

  const { data: profile } = await supabase
    .from(TABLES.profiles)
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    await supabase.auth.signOut();
    redirect(
      `/forgot-password?error=${encodeURIComponent("Password reset from login is only for admin accounts.")}`,
    );
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--cu-gold)_18%,transparent),transparent_55%),radial-gradient(ellipse_at_bottom_right,color-mix(in_srgb,var(--tertiary)_14%,transparent),transparent_50%)]"
        aria-hidden
      />
      <Link
        href="/login"
        className="absolute top-6 left-6 z-20 inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/85 px-4 py-2 text-xs font-semibold text-foreground shadow-sm backdrop-blur-xl transition-all hover:bg-muted"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to login
      </Link>
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[color-mix(in_srgb,var(--cu-gold)_35%,var(--border))] bg-card/90 p-6 shadow-[0_28px_72px_rgba(25,28,29,0.14)] backdrop-blur-xl sm:p-8">
        <ResetPasswordForm />
      </div>
    </div>
  );
}
