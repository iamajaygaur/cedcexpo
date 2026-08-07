"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  BarChart3,
  Download,
  Filter,
  FileBarChart2,
  Loader2,
  PieChart,
  RotateCcw,
} from "lucide-react";

import { AnalyticsGauge } from "@/components/admin/analytics-gauge";
import { CriterionBarsChart } from "@/components/admin/criterion-bars-chart";
import { DeptBreakdownChart } from "@/components/admin/dept-breakdown-chart";
import { ScoreDistributionChart } from "@/components/admin/score-distribution-chart";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  generateReportAction,
  retryReportAction,
} from "@/lib/admin/actions/reports";
import { buildReportAnalytics } from "@/lib/admin/report-analytics";
import { REPORT_TYPE_LABELS } from "@/lib/admin/report-labels";
import type { ReportJobRow } from "@/lib/admin/report-types";
import type { ResultsBundle } from "@/lib/admin/results-data";
import { cn } from "@/lib/utils";
import type { Event, ReportType } from "@/types/database";

type ReportsViewProps = {
  bundle: ResultsBundle;
  eventId: string;
  events?: Event[];
  jobs: ReportJobRow[];
  tableMissing: boolean;
  initialCategory?: string;
  initialGroupId?: string;
};

function exportHref(
  kind: ReportType,
  eventId: string,
  category: string,
  groupId: string,
) {
  const params = new URLSearchParams({ eventId });
  if (category && category !== "all") params.set("category", category);
  if (groupId && groupId !== "all") params.set("groupId", groupId);
  return `/api/admin/export/${kind}?${params.toString()}`;
}

function formatReportDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ReportsView({
  bundle,
  eventId,
  events = [],
  jobs,
  tableMissing,
  initialCategory = "all",
  initialGroupId = "all",
}: ReportsViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState(initialCategory);
  const [groupId, setGroupId] = useState(initialGroupId);
  const [filterOpen, setFilterOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredBundle = useMemo(() => {
    const rankings = bundle.rankings.filter((row) => {
      if (category !== "all" && row.team.category !== category) return false;
      if (
        groupId !== "all" &&
        !row.groups.some((g) => g.id === groupId)
      ) {
        return false;
      }
      return true;
    });
    return { ...bundle, rankings };
  }, [bundle, category, groupId]);

  const analytics = useMemo(
    () => buildReportAnalytics(filteredBundle),
    [filteredBundle],
  );

  function applyFiltersToUrl(nextCategory: string, nextGroupId: string) {
    const params = new URLSearchParams();
    params.set("eventId", eventId);
    if (nextCategory !== "all") params.set("category", nextCategory);
    if (nextGroupId !== "all") params.set("groupId", nextGroupId);
    router.push(`/admin/reports?${params.toString()}`);
  }

  function generate(reportType: ReportType = "master") {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("eventId", eventId);
      formData.set("reportType", reportType);
      if (category !== "all") formData.set("category", category);
      if (groupId !== "all") formData.set("groupId", groupId);

      const result = await generateReportAction({ ok: true }, formData);
      if (!result.ok) {
        setError(result.message ?? "Generation failed");
        return;
      }
      setMessage(result.message ?? "Report ready");
      window.location.assign(
        exportHref(reportType, eventId, category, groupId),
      );
      router.refresh();
    });
  }

  function retry(jobId: string, reportType: ReportType) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("jobId", jobId);
      const result = await retryReportAction({ ok: true }, formData);
      if (!result.ok) {
        setError(result.message ?? "Retry failed");
        router.refresh();
        return;
      }
      setMessage(result.message ?? "Report ready");
      window.location.assign(
        exportHref(reportType, eventId, category, groupId),
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <nav
            aria-label="Breadcrumb"
            className="mb-1 flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted-foreground"
          >
            <span>Reports</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Reports & Analytics
          </h1>
          {events.length > 0 ? (
            <div className="mt-3 max-w-sm">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Event
              </label>
              <Select
                aria-label="Select event"
                value={eventId}
                onChange={(e) => {
                  const params = new URLSearchParams();
                  params.set("eventId", e.target.value);
                  if (category !== "all") params.set("category", category);
                  if (groupId !== "all") params.set("groupId", groupId);
                  router.push(`/admin/reports?${params.toString()}`);
                }}
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
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className="shrink-0 text-sm font-medium text-muted-foreground whitespace-nowrap">
            Sort by:
          </span>
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setFilterOpen((open) => !open)}
              aria-expanded={filterOpen}
            >
              <Filter className="size-4" aria-hidden />
              Filter
            </Button>
            {filterOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-72 rounded-md border border-border bg-card p-4 shadow-sm">
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Department
                    </label>
                    <Select
                      aria-label="Filter by department"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="all">All departments</option>
                      {bundle.categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Color group
                    </label>
                    <Select
                      aria-label="Filter by color group"
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                    >
                      <option value="all">All groups</option>
                      {bundle.groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => {
                      setFilterOpen(false);
                      applyFiltersToUrl(category, groupId);
                    }}
                  >
                    Apply filters
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <Button
            type="button"
            size="lg"
            disabled={pending || tableMissing}
            onClick={() => generate("master")}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <FileBarChart2 className="size-4" aria-hidden />
            )}
            Generate Master Report
          </Button>
        </div>
      </div>

      {(message || error) && (
        <p
          className={cn(
            "rounded-md border px-3 py-2 text-sm",
            error
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-border bg-muted/40 text-foreground",
          )}
        >
          {error ?? message}
        </p>
      )}

      {tableMissing ? (
        <p className="rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          Report history needs{" "}
          <code className="text-xs">supabase/APPLY_REPORT_JOBS.sql</code> in
          the Supabase SQL editor. Charts and exports still work below.
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm md:col-span-1">
          <div className="mb-1 flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Average score
              </p>
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Final % gauge
              </h2>
            </div>
          </div>
          <AnalyticsGauge
            value={analytics.averagePercent}
            label="Avg final"
            detail={
              analytics.totalEvaluatedTeams > 0
                ? `Top team ${analytics.topPercent.toFixed(1)}% · ${analytics.totalEvaluatedTeams} evaluated`
                : "No evaluated teams yet"
            }
          />
        </article>

        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm md:col-span-1">
          <div className="mb-1 flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Coverage
              </p>
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Teams scored
              </h2>
            </div>
          </div>
          <AnalyticsGauge
            value={analytics.evaluationCoveragePercent}
            label="Coverage"
            detail={`${analytics.totalEvaluatedTeams} of ${analytics.totalTeams} teams have a final score`}
          />
        </article>

        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm md:col-span-2 xl:col-span-2">
          <div className="mb-1 flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Rubric
              </p>
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Criterion averages
              </h2>
            </div>
          </div>
          <CriterionBarsChart bars={analytics.criterionBars} />
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-5 lg:gap-5">
        <article className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-3 lg:p-6">
          <span
            className="absolute inset-y-4 left-0 w-1 rounded-full bg-cu-gold"
            aria-hidden
          />
          <div className="flex items-start justify-between gap-3 pl-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Distribution
              </p>
              <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                Overall score bands
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Across all {analytics.totalEvaluatedTeams} evaluated{" "}
                {analytics.totalEvaluatedTeams === 1 ? "project" : "projects"}
              </p>
            </div>
            <BarChart3
              className="size-5 shrink-0 text-muted-foreground/70"
              aria-hidden
            />
          </div>
          <div className="pl-2">
            <ScoreDistributionChart
              buckets={analytics.scoreDistribution}
              maxCount={analytics.maxDistributionCount}
            />
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2 lg:p-6">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Composition
              </p>
              <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                Dept. breakdown
              </h2>
            </div>
            <PieChart
              className="size-5 shrink-0 text-muted-foreground/70"
              aria-hidden
            />
          </div>
          <DeptBreakdownChart
            slices={analytics.deptBreakdown}
            centerTotal={bundle.submittedEvaluationCount}
          />
        </article>
      </section>

      <section className="rounded-md border border-border bg-card p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Report History
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Generated exports for this event.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                "rankings",
                "criteria",
                "abet",
                "judges",
              ] as const
            ).map((kind) => (
              <Button
                key={kind}
                type="button"
                variant="outline"
                size="sm"
                disabled={pending || tableMissing}
                onClick={() => generate(kind)}
              >
                {REPORT_TYPE_LABELS[kind]}
              </Button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Report type</th>
                <th className="px-4 py-3">Generated by</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No reports generated yet. Use Generate Master Report to
                    create one.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="border-t border-border">
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {formatReportDate(job.created_at)}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {REPORT_TYPE_LABELS[job.report_type]}
                    </td>
                    <td className="px-4 py-3">{job.generatedByName}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={job.status}
                        errorMessage={job.error_message}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {job.status === "ready" ? (
                        <Button asChild variant="outline" size="sm">
                          <a
                            href={exportHref(
                              job.report_type,
                              eventId,
                              job.filter_category ?? "all",
                              job.filter_group_id ?? "all",
                            )}
                          >
                            <Download className="size-3.5" aria-hidden />
                            Download
                          </a>
                        </Button>
                      ) : job.status === "failed" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() => retry(job.id, job.report_type)}
                        >
                          <RotateCcw className="size-3.5" aria-hidden />
                          Retry
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 className="size-3.5 animate-spin" />
                          Generating…
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({
  status,
  errorMessage,
}: {
  status: ReportJobRow["status"];
  errorMessage: string | null;
}) {
  if (status === "ready") {
    return (
      <span className="inline-flex rounded-md bg-[color-mix(in_srgb,var(--primary)_12%,white)] px-2 py-0.5 text-xs font-semibold text-primary">
        Ready
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span
        className="inline-flex rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive"
        title={errorMessage ?? undefined}
      >
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
      Generating
    </span>
  );
}
