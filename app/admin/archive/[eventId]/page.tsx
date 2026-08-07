import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { GroupBadge } from "@/components/shared/group-badge";
import { RankMedal } from "@/components/shared/rank-medal";
import { Button } from "@/components/ui/button";
import { requireAdminClient } from "@/lib/admin/guard";
import { loadResultsBundle } from "@/lib/admin/results-data";
import { TABLES } from "@/lib/supabase/tables";
import type { Event } from "@/types/database";

type PageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function ArchiveDetailPage({ params }: PageProps) {
  const { eventId } = await params;
  const { supabase } = await requireAdminClient();

  const { data: eventRow, error } = await supabase
    .from(TABLES.events)
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!eventRow) notFound();

  const event = eventRow as Event;
  if (event.status !== "completed" && event.status !== "archived") {
    notFound();
  }

  const bundle = await loadResultsBundle(supabase, event.id);

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: "Archive", href: "/admin/archive" },
          { label: event.name },
        ]}
        title={event.name}
        description={`${event.semester || "Expo"} · ${event.status} · ${event.event_date ?? "No date"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/admin/reports?eventId=${event.id}`}>
                Reports & analytics
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/admin/results?eventId=${event.id}`}>
                Full results
              </Link>
            </Button>
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Kpi
          label="Submitted evaluations"
          value={String(bundle?.submittedEvaluationCount ?? 0)}
        />
        <Kpi
          label="Drafts excluded"
          value={String(bundle?.draftEvaluationCount ?? 0)}
        />
        <Kpi
          label="Ranked teams"
          value={String(bundle?.rankings.length ?? 0)}
        />
        <Kpi
          label="Criteria"
          value={String(bundle?.criterionAverages.length ?? 0)}
        />
      </section>

      <section className="rounded-md border border-border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Downloads</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Files regenerate from saved scores — nothing is deleted when an event
          completes.
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["master", "Master report"],
              ["rankings", "Rankings"],
              ["criteria", "Criterion averages"],
              ["abet", "ABET outcomes"],
              ["judges", "Judge completion"],
            ] as const
          ).map(([kind, label]) => (
            <Button key={kind} asChild variant="outline" size="sm">
              <a href={`/api/admin/export/${kind}?eventId=${event.id}`}>
                {label}
              </a>
            </Button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Rankings snapshot</h2>
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-14 px-4 py-3">Rank</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Group</th>
                <th className="px-4 py-3">Evals</th>
                <th className="px-4 py-3">Avg %</th>
              </tr>
            </thead>
            <tbody>
              {!bundle || bundle.rankings.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No submitted rankings for this event.
                  </td>
                </tr>
              ) : (
                bundle.rankings.slice(0, 25).map((row) => (
                  <tr key={row.team.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <RankMedal rank={row.rank} />
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {row.team.team_number}
                    </td>
                    <td className="px-4 py-3">{row.team.project_title}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.groups.length === 0
                          ? "—"
                          : row.groups.map((g) => (
                              <GroupBadge
                                key={g.id}
                                colorKey={g.color_key}
                                name={g.name}
                              />
                            ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {row.evaluationCount}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {row.averagePercent.toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {bundle && bundle.rankings.length > 25 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Showing top 25.{" "}
            <Link
              href={`/admin/results?eventId=${event.id}`}
              className="underline"
            >
              View all results
            </Link>
          </p>
        ) : null}
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
