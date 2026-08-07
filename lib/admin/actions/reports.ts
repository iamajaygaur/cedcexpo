"use server";

import { revalidatePath } from "next/cache";

import {
  actionFail,
  actionOk,
  type ActionResult,
} from "@/lib/admin/action-result";
import { requireAdminClient } from "@/lib/admin/guard";
import { loadResultsBundle } from "@/lib/admin/results-data";
import {
  isReportJobsTableMissing,
} from "@/lib/admin/report-jobs";
import { TABLES } from "@/lib/supabase/tables";
import type { ReportType } from "@/types/database";

const REPORT_TYPES = new Set<ReportType>([
  "master",
  "rankings",
  "criteria",
  "abet",
  "judges",
]);

function formString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

async function validateExport(
  eventId: string,
  category: string | null,
  groupId: string | null,
) {
  const { supabase } = await requireAdminClient();
  const bundle = await loadResultsBundle(supabase, eventId, {
    category,
    groupId,
  });
  if (!bundle) {
    throw new Error("Event not found");
  }
  return bundle;
}

export async function generateReportAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult & { jobId?: string }> {
  try {
    const { profile, supabase } = await requireAdminClient();
    const eventId = formString(formData, "eventId");
    const reportTypeRaw = formString(formData, "reportType") || "master";
    const category = formString(formData, "category") || null;
    const groupId = formString(formData, "groupId") || null;

    if (!eventId) {
      return actionFail("Event is required");
    }
    if (!REPORT_TYPES.has(reportTypeRaw as ReportType)) {
      return actionFail("Unknown report type");
    }
    const reportType = reportTypeRaw as ReportType;

    const { data: inserted, error: insertError } = await supabase
      .from(TABLES.reportJobs)
      .insert({
        event_id: eventId,
        report_type: reportType,
        status: "generating",
        generated_by: profile.id,
        filter_category: category,
        filter_group_id: groupId || null,
      })
      .select("id")
      .single();

    if (insertError) {
      if (isReportJobsTableMissing(insertError.message)) {
        return actionFail(
          "Report history table is missing. Run supabase/APPLY_REPORT_JOBS.sql in the Supabase SQL editor, then try again.",
        );
      }
      return actionFail(insertError.message);
    }

    const jobId = inserted.id as string;

    try {
      await validateExport(eventId, category, groupId);
      const { error: updateError } = await supabase
        .from(TABLES.reportJobs)
        .update({
          status: "ready",
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
      if (updateError) {
        return actionFail(updateError.message);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Report generation failed";
      await supabase
        .from(TABLES.reportJobs)
        .update({
          status: "failed",
          error_message: message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
      revalidatePath("/admin/reports");
      return actionFail(message);
    }

    revalidatePath("/admin/reports");
    return { ...actionOk("Report ready"), jobId };
  } catch (err) {
    return actionFail(
      err instanceof Error ? err.message : "Could not generate report",
    );
  }
}

export async function retryReportAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminClient();
    const jobId = formString(formData, "jobId");
    if (!jobId) {
      return actionFail("Report id is required");
    }

    const { data: job, error: loadError } = await supabase
      .from(TABLES.reportJobs)
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (loadError) {
      if (isReportJobsTableMissing(loadError.message)) {
        return actionFail(
          "Report history table is missing. Run supabase/APPLY_REPORT_JOBS.sql.",
        );
      }
      return actionFail(loadError.message);
    }
    if (!job) {
      return actionFail("Report not found");
    }

    await supabase
      .from(TABLES.reportJobs)
      .update({
        status: "generating",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    try {
      await validateExport(
        job.event_id as string,
        (job.filter_category as string | null) ?? null,
        (job.filter_group_id as string | null) ?? null,
      );
      const { error: updateError } = await supabase
        .from(TABLES.reportJobs)
        .update({
          status: "ready",
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
      if (updateError) {
        return actionFail(updateError.message);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Report generation failed";
      await supabase
        .from(TABLES.reportJobs)
        .update({
          status: "failed",
          error_message: message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
      revalidatePath("/admin/reports");
      return actionFail(message);
    }

    revalidatePath("/admin/reports");
    return actionOk("Report ready");
  } catch (err) {
    return actionFail(
      err instanceof Error ? err.message : "Could not retry report",
    );
  }
}
