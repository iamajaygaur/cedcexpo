import { redirect } from "next/navigation";

import { requireSessionProfile } from "@/lib/auth/session";
import { JudgeShell } from "@/components/judge/judge-shell";

export default async function JudgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireSessionProfile();

  if (profile.role !== "judge" && profile.role !== "admin") {
    redirect("/login");
  }

  return (
    <JudgeShell
      userName={profile.fullName || profile.email}
      userRole={profile.role === "admin" ? "admin" : "judge"}
    >
      {children}
    </JudgeShell>
  );
}
