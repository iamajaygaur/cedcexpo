import { ReportsView } from "@/components/admin/reports-view";
import { resolveReadableEvent } from "@/lib/admin/event-context";
import { requireAdminClient } from "@/lib/admin/guard";
import { loadReportJobs } from "@/lib/admin/report-jobs";
import { loadResultsBundle } from "@/lib/admin/results-data";

type PageProps = {
  searchParams: Promise<{
    eventId?: string;
    category?: string;
    groupId?: string;
  }>;
};

export default async function ReportsPage({ searchParams }: PageProps) {
  const { eventId, category, groupId } = await searchParams;
  const { supabase } = await requireAdminClient();
  const { event, events } = await resolveReadableEvent(supabase, eventId);

  const bundle = event
    ? await loadResultsBundle(supabase, event.id, {
        category: category || null,
        groupId: groupId || null,
      })
    : null;

  const history = event
    ? await loadReportJobs(supabase, event.id)
    : { jobs: [], tableMissing: false };

  if (!bundle || !event) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold tracking-tight md:text-3xl">
          Reports & Analytics
        </h1>
        <p className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          Create an event to generate reports.
        </p>
      </div>
    );
  }

  return (
    <ReportsView
      bundle={bundle}
      eventId={event.id}
      events={events}
      jobs={history.jobs}
      tableMissing={history.tableMissing}
      initialCategory={category || "all"}
      initialGroupId={groupId || "all"}
    />
  );
}
