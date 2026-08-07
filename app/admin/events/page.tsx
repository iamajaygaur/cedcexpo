import { EventsManager } from "@/components/admin/events-manager";
import { requireAdminClient } from "@/lib/admin/guard";
import { TABLES } from "@/lib/supabase/tables";
import type { Event } from "@/types/database";

function normalizeEvent(row: Record<string, unknown>): Event {
  const base = row as unknown as Event;
  return {
    ...base,
    description: typeof base.description === "string" ? base.description : "",
    start_time: typeof base.start_time === "string" ? base.start_time : "",
    end_time: typeof base.end_time === "string" ? base.end_time : "",
    departments: Array.isArray(base.departments) ? base.departments : [],
  };
}

export default async function EventsPage() {
  const { supabase } = await requireAdminClient();
  const [{ data, error }, { data: teamRows }] = await Promise.all([
    supabase
      .from(TABLES.events)
      .select("*")
      .order("event_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase.from(TABLES.teams).select("event_id"),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  const teamCountByEventId: Record<string, number> = {};
  for (const row of teamRows ?? []) {
    const eventId = (row as { event_id?: string }).event_id;
    if (!eventId) continue;
    teamCountByEventId[eventId] = (teamCountByEventId[eventId] ?? 0) + 1;
  }

  const events = ((data ?? []) as Record<string, unknown>[]).map(
    normalizeEvent,
  );

  return (
    <div>
      <EventsManager events={events} teamCountByEventId={teamCountByEventId} />
    </div>
  );
}
