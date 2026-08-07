import { HelpSupportContent } from "@/components/shared/help-support-content";
import { resolveOperationalEvent } from "@/lib/admin/event-context";
import { requireAdminClient } from "@/lib/admin/guard";

export const metadata = {
  title: "Help / Contact Support",
};

export default async function AdminHelpPage() {
  const { supabase } = await requireAdminClient();
  const { event } = await resolveOperationalEvent(supabase);

  return (
    <HelpSupportContent
      linkBase="/admin"
      supportEmail={event?.support_email}
    />
  );
}
