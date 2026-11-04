import { ProfileAvatarForm } from "@/components/shared/profile-avatar-form";
import { AppFooter } from "@/components/shared/app-footer";
import { PageHeader } from "@/components/shared/page-header";
import { requireSessionProfile } from "@/lib/auth/session";

export const metadata = {
  title: "Profile settings",
};

export default async function JudgeSettingsPage() {
  const profile = await requireSessionProfile();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      <PageHeader
        breadcrumbs={[{ label: "Settings" }]}
        title="Profile settings"
        description="Update the photo shown in your account menu and sidebar."
      />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <ProfileAvatarForm
          fullName={profile.fullName || profile.email}
          email={profile.email}
          avatarUrl={profile.avatarUrl}
        />
      </div>

      <AppFooter linkBase="/judge" />
    </div>
  );
}
