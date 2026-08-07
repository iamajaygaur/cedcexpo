"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

import { GroupBadge } from "@/components/shared/group-badge";
import { RankMedal } from "@/components/shared/rank-medal";
import { Select } from "@/components/ui/select";
import type { ResultsBundle } from "@/lib/admin/results-data";
import { cn } from "@/lib/utils";
import type { Event } from "@/types/database";

type ResultsViewProps = {
  bundle: ResultsBundle;
  eventId: string;
  category?: string;
  events?: Event[];
};

export function ResultsView({
  bundle,
  eventId,
  category = "",
  events = [],
}: ResultsViewProps) {
  const router = useRouter();

  function updateFilter(nextCategory: string) {
    const params = new URLSearchParams();
    params.set("eventId", eventId);
    if (nextCategory) params.set("category", nextCategory);
    router.push(`/admin/results?${params.toString()}`);
  }

  function switchEvent(nextEventId: string) {
    const params = new URLSearchParams();
    params.set("eventId", nextEventId);
    if (category) params.set("category", category);
    router.push(`/admin/results?${params.toString()}`);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      <div className="flex flex-nowrap items-end gap-3 overflow-x-auto">
        {events.length > 1 ? (
          <div className="shrink-0 space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Event
            </label>
            <Select
              value={eventId}
              onChange={(e) => switchEvent(e.target.value)}
              className="min-w-[220px] shrink-0"
              aria-label="Select event"
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.status !== "active" ? ` (${e.status})` : ""}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        <div className="shrink-0 space-y-1">
          <label className="text-sm font-medium text-muted-foreground">
            Sort by:
          </label>
          <Select
            value={category}
            onChange={(e) => updateFilter(e.target.value)}
            className="min-w-[180px] shrink-0"
            aria-label="Filter by department"
          >
            <option value="">All departments</option>
            {bundle.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="ml-auto flex items-end gap-2">
          <Link
            href={`/api/admin/export/rankings?eventId=${eventId}${category ? `&category=${encodeURIComponent(category)}` : ""}`}
            className="inline-flex min-h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all hover:brightness-105"
          >
            Export rankings CSV
          </Link>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Final score = average of the two color-group averages (each group =
        mean of its judges&apos; totals out of 50). Rankings require submitted
        evaluations from <strong>every</strong> assigned color group (
        {bundle.submittedEvaluationCount} submitted
        {bundle.draftEvaluationCount > 0
          ? `, ${bundle.draftEvaluationCount} drafts excluded`
          : ""}
        ). Ties share the same rank — no silent tie-break.
      </p>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 w-14">Rank</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Dept</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Group avgs</th>
                <th className="px-4 py-3">Evals</th>
                <th className="px-4 py-3">Final score</th>
                <th className="px-4 py-3">Final %</th>
              </tr>
            </thead>
            <tbody>
              {bundle.rankings.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No complete dual-group scores yet for this filter. Each
                    assigned color group needs at least one submitted
                    evaluation.
                  </td>
                </tr>
              ) : (
                bundle.rankings.map((row) => (
                  <tr
                    key={row.team.id}
                    className="border-t border-border transition-colors duration-150 hover:bg-muted/40"
                  >
                    <td className="px-3 py-3 align-middle">
                      <div className="flex items-center gap-1">
                        <RankMedal rank={row.rank} />
                        {row.tied ? (
                          <span className="text-[10px] font-medium text-muted-foreground">
                            tie
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <p className="font-semibold text-foreground">
                        {row.team.team_name?.trim() ||
                          `Team ${row.team.team_number}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        #{row.team.team_number}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs font-semibold text-foreground">
                        {row.team.category || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <p>{row.team.project_title}</p>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {row.groupAverages.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {row.groupAverages.map((ga) => (
                            <div
                              key={ga.groupId}
                              className="flex items-center gap-2"
                            >
                              <GroupBadge
                                colorKey={ga.group.color_key}
                                name={ga.group.name}
                              />
                              <span className="tabular-nums text-xs text-muted-foreground">
                                {ga.average.toFixed(2)}
                                <span className="opacity-70">
                                  {" "}
                                  ({ga.judgeCount})
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle tabular-nums">
                      {row.evaluationCount}
                    </td>
                    <td className="px-4 py-3 align-middle tabular-nums">
                      {row.averageScore.toFixed(2)}
                      <span className="text-xs text-muted-foreground">
                        {" "}
                        / {row.maxPossible.toFixed(0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span
                        className={cn(
                          "inline-flex min-w-[3.25rem] items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
                          row.rank === 1
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground",
                        )}
                      >
                        {row.averagePercent.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
