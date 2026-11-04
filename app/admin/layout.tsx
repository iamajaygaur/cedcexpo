import { requireRole } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("admin");

  return (
    <AdminShell
      userName={profile.fullName || profile.email}
      userRole={profile.role === "admin" ? "admin" : "judge"}
      userAvatarUrl={profile.avatarUrl}
    >
      {children}
    </AdminShell>
  );
}
