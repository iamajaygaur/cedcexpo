import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type { ReportJobRow } from "@/lib/admin/report-types";
import { TABLES } from "@/lib/supabase/tables";
import type { ReportJobStatus, ReportType } from "@/types/database";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const MISSING_TABLE_HINT =
  /relation .*report_jobs.* does not exist|could not find the table/i;

export function isReportJobsTableMissing(errorMessage: string): boolean {
  return MISSING_TABLE_HINT.test(errorMessage);
}

export async function loadReportJobs(
  supabase: Supabase,
  eventId: string,
): Promise<{ jobs: ReportJobRow[]; tableMissing: boolean }> {
  const { data, error } = await supabase
    .from(TABLES.reportJobs)
    .select(
      `
      *,
      profiles:generated_by (
        full_name,
        email
      )
    `,
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (isReportJobsTableMissing(error.message)) {
      return { jobs: [], tableMissing: true };
    }
    throw new Error(error.message);
  }

  const jobs: ReportJobRow[] = (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles)
      ? row.profiles[0]
      : row.profiles;
    const generatedByName =
      (profile as { full_name?: string; email?: string } | null)?.full_name ||
      (profile as { email?: string } | null)?.email ||
      "Admin";

    return {
      id: row.id as string,
      event_id: row.event_id as string,
      report_type: row.report_type as ReportType,
      status: row.status as ReportJobStatus,
      generated_by: row.generated_by as string,
      error_message: (row.error_message as string | null) ?? null,
      filter_category: (row.filter_category as string | null) ?? null,
      filter_group_id: (row.filter_group_id as string | null) ?? null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      generatedByName,
    };
  });

  return { jobs, tableMissing: false };
}
