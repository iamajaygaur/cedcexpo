import "server-only";

import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { requireAdminClient } from "@/lib/admin/guard";
import {
  loadResultsBundle,
  type ResultsBundle,
} from "@/lib/admin/results-data";
import { checkExportRateLimit } from "@/lib/rate-limit";
import { toCsv } from "@/lib/scoring/rankings";

export type ExportKind = "rankings" | "criteria" | "abet" | "judges" | "master";

function clientKeyFromHeaders(headerList: Headers): string {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return headerList.get("x-real-ip") ?? "unknown";
}

function slugify(name: string) {
  return name.replace(/\s+/g, "-").toLowerCase();
}

function rankingsCsv(bundle: ResultsBundle) {
  return toCsv(
    [
      "rank",
      "tied",
      "team_number",
      "project_title",
      "category",
      "groups",
      "group_averages",
      "evaluation_count",
      "final_score",
      "final_percent",
      "max_possible",
    ],
    bundle.rankings.map((r) => [
      r.rank,
      r.tied ? "yes" : "no",
      r.team.team_number,
      r.team.project_title,
      r.team.category,
      r.groups.map((g) => g.name).join(" & "),
      r.groupAverages
        .map(
          (ga) =>
            `${ga.group.name}=${ga.average.toFixed(4)} (n=${ga.judgeCount})`,
        )
        .join(" | "),
      r.evaluationCount,
      r.averageScore.toFixed(4),
      r.averagePercent.toFixed(4),
      r.maxPossible.toFixed(4),
    ]),
  );
}

function criteriaCsv(bundle: ResultsBundle) {
  return toCsv(
    [
      "criterion",
      "category",
      "max_score",
      "weight",
      "abet_codes",
      "average_score",
      "sample_count",
    ],
    bundle.criterionAverages.map((r) => [
      r.criterion.name,
      r.criterion.category,
      r.criterion.max_score,
      r.criterion.weight,
      r.abetCodes.join("|"),
      r.sampleCount > 0 ? r.averageScore.toFixed(4) : "",
      r.sampleCount,
    ]),
  );
}

function abetCsv(bundle: ResultsBundle) {
  return toCsv(
    ["outcome_code", "outcome_label", "average_score", "sample_count"],
    bundle.abetAverages.map((r) => [
      r.outcome_code,
      r.outcome_label,
      r.averageScore.toFixed(4),
      r.sampleCount,
    ]),
  );
}

function judgesCsv(bundle: ResultsBundle) {
  return toCsv(
    ["full_name", "email", "group", "submitted", "expected", "percent"],
    bundle.judgeCompletion.map((r) => [
      r.fullName,
      r.email,
      r.groupName ?? "",
      r.submitted,
      r.expected,
      r.percent,
    ]),
  );
}

function masterCsv(bundle: ResultsBundle) {
  return [
    `# CEDC Design Expo — Master Report`,
    `# Event: ${bundle.event.name}`,
    `# Generated: ${new Date().toISOString()}`,
    `# Submitted evaluations: ${bundle.submittedEvaluationCount}`,
    `# Draft evaluations (excluded): ${bundle.draftEvaluationCount}`,
    "",
    "## RANKINGS",
    rankingsCsv(bundle).trimEnd(),
    "",
    "## CRITERION AVERAGES",
    criteriaCsv(bundle).trimEnd(),
    "",
    "## ABET OUTCOMES",
    abetCsv(bundle).trimEnd(),
    "",
    "## JUDGE COMPLETION",
    judgesCsv(bundle).trimEnd(),
    "",
  ].join("\n");
}

export async function handleAdminCsvExport(
  kind: ExportKind,
  searchParams: URLSearchParams,
): Promise<Response> {
  const headerList = await headers();
  const rate = checkExportRateLimit(clientKeyFromHeaders(headerList));
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many export requests. Try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSeconds ?? 60),
        },
      },
    );
  }

  try {
    await requireAdminClient();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const eventId = searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  const { supabase } = await requireAdminClient();
  const bundle = await loadResultsBundle(supabase, eventId, {
    groupId: searchParams.get("groupId"),
    category: searchParams.get("category"),
  });

  if (!bundle) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const eventSlug = slugify(bundle.event.name);
  let csv = "";
  let filename = `${kind}-${eventSlug}.csv`;

  switch (kind) {
    case "rankings":
      csv = rankingsCsv(bundle);
      filename = `rankings-${eventSlug}.csv`;
      break;
    case "criteria":
      csv = criteriaCsv(bundle);
      filename = `criteria-${eventSlug}.csv`;
      break;
    case "abet":
      csv = abetCsv(bundle);
      filename = `abet-${eventSlug}.csv`;
      break;
    case "judges":
      csv = judgesCsv(bundle);
      filename = `judges-${eventSlug}.csv`;
      break;
    case "master":
      csv = masterCsv(bundle);
      filename = `master-report-${eventSlug}.csv`;
      break;
    default:
      return NextResponse.json({ error: "Unknown export" }, { status: 400 });
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
