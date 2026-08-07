import { PageHeader } from "@/components/admin/page-header";
import { ResultsView } from "@/components/admin/results-view";
import { resolveReadableEvent } from "@/lib/admin/event-context";
import { requireAdminClient } from "@/lib/admin/guard";
import { loadResultsBundle } from "@/lib/admin/results-data";

type PageProps = {
  searchParams: Promise<{
    eventId?: string;
    category?: string;
  }>;
};

export default async function ResultsPage({ searchParams }: PageProps) {
  const { eventId, category } = await searchParams;
  const { supabase } = await requireAdminClient();
  const { event, events } = await resolveReadableEvent(supabase, eventId);

  const bundle = event
    ? await loadResultsBundle(supabase, event.id, {
        category: category || null,
      })
    : null;

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Results" }]}
        title="Results & Rankings"
        description="Dual color-group scoring: average within each group, then average the two group scores. Ties are shown as ties."
      />
      {bundle && event ? (
        <ResultsView
          bundle={bundle}
          eventId={event.id}
          category={category}
          events={events}
        />
      ) : (
        <p className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          Create an event and collect submitted evaluations to see rankings.
        </p>
      )}
    </div>
  );
}
