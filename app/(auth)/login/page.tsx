import { LoginView } from "@/components/shared/login-view";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    msg?: string;
    next?: string;
    switch?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();
  const authError =
    params.error ?? (configured ? null : "auth_not_configured");
  const errorMessage = params.msg?.trim() || null;
  const switchingAccount = params.switch === "1";
  const year = new Date().getFullYear();

  return (
    <LoginView
      authError={authError}
      errorMessage={errorMessage}
      configured={configured}
      switchingAccount={switchingAccount}
      year={year}
    />
  );
}
