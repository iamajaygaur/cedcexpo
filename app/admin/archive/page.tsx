import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { requireAdminClient } from "@/lib/admin/guard";
import { TABLES } from "@/lib/supabase/tables";
import type { Event } from "@/types/database";

export default async function ArchiveIndexPage() {
  const { supabase } = await requireAdminClient();

  const { data: events, error } = await supabase
    .from(TABLES.events)
    .select("*")
    .in("status", ["completed", "archived"])
    .order("event_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  const list = (events ?? []) as Event[];

  const counts = new Map<
    string,
    { teams: number; submitted: number }
  >();

  if (list.length > 0) {
    const ids = list.map((e) => e.id);
    const [{ data: teams }, { data: evals }] = await Promise.all([
      supabase.from(TABLES.teams).select("event_id").in("event_id", ids),
      supabase
        .from(TABLES.evaluations)
        .select("event_id, status")
        .in("event_id", ids),
    ]);

    for (const t of teams ?? []) {
      const cur = counts.get(t.event_id) ?? { teams: 0, submitted: 0 };
      cur.teams += 1;
      counts.set(t.event_id, cur);
    }
    for (const e of evals ?? []) {
      if (e.status !== "submitted") continue;
      const cur = counts.get(e.event_id) ?? { teams: 0, submitted: 0 };
      cur.submitted += 1;
      counts.set(e.event_id, cur);
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Archive" }]}
        title="Event Archive"
        description="Completed expos stay here forever. Open any event to view rankings and download reports."
      />

      {list.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No completed events yet. When you mark an event Completed, it appears
          here with downloadable results.
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Semester</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Teams</th>
                <th className="px-4 py-3">Submitted evals</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((event) => {
                const c = counts.get(event.id) ?? {
                  teams: 0,
                  submitted: 0,
                };
                return (
                  <tr key={event.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{event.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {event.semester || "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {event.event_date ?? "—"}
                    </td>
                    <td className="px-4 py-3 capitalize">{event.status}</td>
                    <td className="px-4 py-3 tabular-nums">{c.teams}</td>
                    <td className="px-4 py-3 tabular-nums">{c.submitted}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/archive/${event.id}`}>
                            Open
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/reports?eventId=${event.id}`}>
                            Reports
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
