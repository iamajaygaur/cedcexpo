import { PrivacyPolicyContent } from "@/components/shared/privacy-policy-content";
import { resolveOperationalEvent } from "@/lib/admin/event-context";
import { requireAdminClient } from "@/lib/admin/guard";

export const metadata = {
  title: "Privacy Policy",
};

export default async function AdminPrivacyPage() {
  const { supabase } = await requireAdminClient();
  const { event } = await resolveOperationalEvent(supabase);

  return (
    <PrivacyPolicyContent
      linkBase="/admin"
      supportEmail={event?.support_email}
    />
  );
}
