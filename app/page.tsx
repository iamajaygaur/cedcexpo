import { redirect } from "next/navigation";

import {
  dashboardPathForRole,
  getSessionProfile,
} from "@/lib/auth/session";
import { HomeHero } from "@/components/shared/home-hero";

export default async function HomePage() {
  const profile = await getSessionProfile();
  if (profile) {
    redirect(dashboardPathForRole(profile.role));
  }

  return <HomeHero />;
}
