import { TermsOfServiceContent } from "@/components/shared/terms-of-service-content";
import { resolveOperationalEvent } from "@/lib/admin/event-context";
import { requireAdminClient } from "@/lib/admin/guard";

export const metadata = {
  title: "Terms of Service",
};

export default async function AdminTermsPage() {
  const { supabase } = await requireAdminClient();
  const { event } = await resolveOperationalEvent(supabase);

  return (
    <TermsOfServiceContent
      linkBase="/admin"
      supportEmail={event?.support_email}
    />
  );
}
