"use server";

import { revalidatePath } from "next/cache";

import {
  actionFail,
  actionOk,
  type ActionResult,
} from "@/lib/admin/action-result";
import { requireAdminClient } from "@/lib/admin/guard";
import { isReportJobsTableMissing } from "@/lib/admin/report-jobs";
import { ensureStandardCriteria } from "@/lib/scoring/ensure-standard-criteria";
import { TABLES } from "@/lib/supabase/tables";
import { eventFormSchema } from "@/lib/validation/admin";

function formString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function revalidateEventScopedPaths() {
  revalidatePath("/admin/events");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/monitor");
  revalidatePath("/admin/teams");
  revalidatePath("/admin/groups");
  revalidatePath("/admin/assignments");
  revalidatePath("/admin/judges");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/results");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/archive");
  revalidatePath("/judge/dashboard");
  revalidatePath("/judge/projects");
}

async function seedMasterReportJob(
  supabase: Awaited<ReturnType<typeof requireAdminClient>>["supabase"],
  eventId: string,
  generatedBy: string,
) {
  const { error } = await supabase.from(TABLES.reportJobs).insert({
    event_id: eventId,
    report_type: "master",
    status: "ready",
    generated_by: generatedBy,
    error_message: null,
  });

  if (error && !isReportJobsTableMissing(error.message)) {
    throw new Error(error.message);
  }
}

export async function upsertEventAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { profile, supabase } = await requireAdminClient();
    const intent = formString(formData, "intent");
    const statusFromIntent =
      intent === "activate"
        ? "active"
        : intent === "draft"
          ? "draft"
          : formString(formData, "status") || "draft";

    const departments = formData
      .getAll("departments")
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0);

    const parsed = eventFormSchema.safeParse({
      id: formString(formData, "id") || undefined,
      name: formString(formData, "name"),
      semester: formString(formData, "semester"),
      event_date: formString(formData, "event_date"),
      location: formString(formData, "location"),
      status: statusFromIntent,
      support_email: formString(formData, "support_email"),
      description: formString(formData, "description"),
      start_time: formString(formData, "start_time"),
      end_time: formString(formData, "end_time"),
      departments,
    });

    if (!parsed.success) {
      return actionFail(parsed.error.issues[0]?.message ?? "Invalid event");
    }

    const { id, ...payload } = parsed.data;

    if (id) {
      const { error } = await supabase
        .from(TABLES.events)
        .update(payload)
        .eq("id", id);
      if (error) return actionFail(error.message);
      await ensureStandardCriteria(supabase, id);

      if (payload.status === "completed" || payload.status === "archived") {
        try {
          await seedMasterReportJob(supabase, id, profile.id);
        } catch (seedErr) {
          return actionFail(
            seedErr instanceof Error
              ? seedErr.message
              : "Event saved but archive report seed failed",
          );
        }
      }
    } else {
      const { data: created, error } = await supabase
        .from(TABLES.events)
        .insert(payload)
        .select("id")
        .single();
      if (error) return actionFail(error.message);
      if (created?.id) {
        await ensureStandardCriteria(supabase, created.id);
      }
    }

    revalidateEventScopedPaths();
    return actionOk(id ? "Event updated." : "Event created.");
  } catch (e) {
    return actionFail(e instanceof Error ? e.message : "Failed to save event");
  }
}

export async function deleteEventAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminClient();
    const id = formString(formData, "id");
    if (!id) return actionFail("Missing event id");

    const { error } = await supabase.from(TABLES.events).delete().eq("id", id);
    if (error) return actionFail(error.message);

    revalidateEventScopedPaths();
    return actionOk("Event deleted.");
  } catch (e) {
    return actionFail(
      e instanceof Error ? e.message : "Failed to delete event",
    );
  }
}

export async function setEventStatusAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { profile, supabase } = await requireAdminClient();
    const id = formString(formData, "id");
    const status = formString(formData, "status");
    if (!id) return actionFail("Missing event id");
    if (
      status !== "draft" &&
      status !== "active" &&
      status !== "completed" &&
      status !== "archived"
    ) {
      return actionFail("Invalid status");
    }

    const { error } = await supabase
      .from(TABLES.events)
      .update({ status })
      .eq("id", id);
    if (error) return actionFail(error.message);

    if (status === "completed" || status === "archived") {
      try {
        await seedMasterReportJob(supabase, id, profile.id);
      } catch (seedErr) {
        return actionFail(
          seedErr instanceof Error
            ? seedErr.message
            : "Status updated but archive report seed failed",
        );
      }
    }

    revalidateEventScopedPaths();
    revalidatePath(`/admin/archive/${id}`);

    return actionOk(
      status === "draft"
        ? "Event paused."
        : status === "active"
          ? "Event resumed."
          : status === "completed"
            ? "Event completed. Judging is closed; data is in Archive & Reports."
            : "Event archived. Data remains downloadable in Archive & Reports.",
    );
  } catch (e) {
    return actionFail(
      e instanceof Error ? e.message : "Failed to update event status",
    );
  }
}
