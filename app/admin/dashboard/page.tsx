import Link from "next/link";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { Button } from "@/components/ui/button";
import { resolveActiveDashboardEvent } from "@/lib/admin/event-context";
import { requireAdminClient } from "@/lib/admin/guard";
import { loadMonitorSnapshot } from "@/lib/admin/monitor-data";
import { requireRole } from "@/lib/auth/session";

export default async function AdminDashboardPage() {
  await requireRole("admin");
  const { supabase } = await requireAdminClient();
  const { event, events, hasAnyEvent } =
    await resolveActiveDashboardEvent(supabase);

  if (!event) {
    const latest = events[0] ?? null;
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/40 px-4 py-10 text-center">
        {!hasAnyEvent ? (
          <>
            <p className="text-sm text-muted-foreground">
              No event yet. Create one to start managing the expo.
            </p>
            <Button asChild className="mt-4 min-h-11">
              <Link href="/admin/events">Create event</Link>
            </Button>
          </>
        ) : (
          <>
            <p className="text-base font-semibold text-foreground">
              No active event
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              The dashboard only shows a{" "}
              <span className="font-medium text-foreground">Live / Active</span>{" "}
              event. Draft events stay on Events; completed expos are in
              Archive and Reports.
              {latest ? (
                <>
                  {" "}
                  Latest event{" "}
                  <span className="font-medium text-foreground">
                    {latest.name}
                  </span>{" "}
                  is marked{" "}
                  <span className="font-medium capitalize text-foreground">
                    {latest.status}
                  </span>
                  .
                </>
              ) : null}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button asChild className="min-h-11">
                <Link href="/admin/events">Go to Events</Link>
              </Button>
              {latest &&
              (latest.status === "completed" ||
                latest.status === "archived") ? (
                <Button asChild variant="outline" className="min-h-11">
                  <Link href={`/admin/archive/${latest.id}`}>View archive</Link>
                </Button>
              ) : (
                <Button asChild variant="outline" className="min-h-11">
                  <Link href="/admin/archive">View archive</Link>
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  const snapshot = await loadMonitorSnapshot(supabase, event.id);
  if (!snapshot) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/40 px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Could not load live data for the active event.
        </p>
        <Button asChild className="mt-4 min-h-11">
          <Link href="/admin/events">Go to Events</Link>
        </Button>
      </div>
    );
  }

  return <AdminDashboard snapshot={snapshot} />;
}
