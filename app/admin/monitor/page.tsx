import { LiveMonitor } from "@/components/admin/live-monitor";
import { OpsEventEmpty } from "@/components/admin/ops-event-empty";
import { PageHeader } from "@/components/admin/page-header";
import { resolveOperationalEvent } from "@/lib/admin/event-context";
import { requireAdminClient } from "@/lib/admin/guard";
import { loadMonitorSnapshot } from "@/lib/admin/monitor-data";

type PageProps = {
  searchParams: Promise<{ eventId?: string; group?: string }>;
};

export default async function MonitorPage({ searchParams }: PageProps) {
  const { eventId, group } = await searchParams;
  const { supabase } = await requireAdminClient();
  const { event, events, lockedEvent } = await resolveOperationalEvent(
    supabase,
    eventId,
  );

  const snapshot = event
    ? await loadMonitorSnapshot(supabase, event.id)
    : null;

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Live Monitor" }]}
        title="Live Judging Monitor"
        description="Track evaluation progress by color group, team, and judge. Updates live when judges submit."
      />
      {lockedEvent && snapshot ? (
        <div className="mb-6">
          <OpsEventEmpty lockedEvent={lockedEvent} hasAnyEvent />
        </div>
      ) : null}
      {snapshot ? (
        <LiveMonitor
          snapshot={snapshot}
          initialGroupFilter={group ?? "all"}
        />
      ) : (
        <OpsEventEmpty
          lockedEvent={lockedEvent}
          hasAnyEvent={events.length > 0}
        />
      )}
    </div>
  );
}
