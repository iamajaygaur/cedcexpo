import { PermissionDenied } from "@/components/shared/ui-states";
import {
  dashboardPathForRole,
  getSessionProfile,
} from "@/lib/auth/session";

export default async function ForbiddenPage() {
  const profile = await getSessionProfile();
  const homeHref = profile ? dashboardPathForRole(profile.role) : "/login";
  const homeLabel = profile ? "Back to dashboard" : "Back to login";

  return (
    <PermissionDenied
      title="Permission denied"
      description={
        profile
          ? "Your account doesn’t have access to this area of CEDC Expo. Return to your dashboard, or ask an administrator if you need elevated access."
          : "Sign in with an account that has access, or ask an administrator for help."
      }
      homeHref={homeHref}
      homeLabel={homeLabel}
    />
  );
}
