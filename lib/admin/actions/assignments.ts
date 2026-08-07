"use server";

import { revalidatePath } from "next/cache";

import {
  actionFail,
  actionOk,
  type ActionResult,
} from "@/lib/admin/action-result";
import { requireAdminClient } from "@/lib/admin/guard";
import { MAX_ASSIGNED_GROUPS_PER_TEAM } from "@/lib/groups/assignment-limits";
import { TABLES } from "@/lib/supabase/tables";
import { assignmentSchema } from "@/lib/validation/admin";

function formString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function parseGroupIds(formData: FormData): string[] {
  const fromMulti = formData
    .getAll("group_ids")
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  if (fromMulti.length > 0) {
    return Array.from(new Set(fromMulti));
  }

  // Back-compat: single select named group_id
  const single = formString(formData, "group_id");
  if (single && single !== "none") return [single];
  return [];
}

export async function assignTeamToGroupAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminClient();
    const parsed = assignmentSchema.safeParse({
      event_id: formString(formData, "event_id"),
      team_id: formString(formData, "team_id"),
      group_ids: parseGroupIds(formData),
    });

    if (!parsed.success) {
      return actionFail(
        parsed.error.issues[0]?.message ?? "Invalid assignment",
      );
    }

    const { event_id, team_id, group_ids } = parsed.data;
    const desired = group_ids.slice(0, MAX_ASSIGNED_GROUPS_PER_TEAM);

    if (desired.length > MAX_ASSIGNED_GROUPS_PER_TEAM) {
      return actionFail(
        `Choose at most ${MAX_ASSIGNED_GROUPS_PER_TEAM} color groups per team.`,
      );
    }

    const { data: existing, error: existingError } = await supabase
      .from(TABLES.judgingAssignments)
      .select("id, group_id")
      .eq("event_id", event_id)
      .eq("team_id", team_id);

    if (existingError) return actionFail(existingError.message);

    const existingRows = existing ?? [];
    const existingByGroup = new Map(
      existingRows.map((row) => [row.group_id, row.id]),
    );
    const desiredSet = new Set(desired);

    const toRemove = existingRows.filter((row) => !desiredSet.has(row.group_id));
    const toAdd = desired.filter((gid) => !existingByGroup.has(gid));

    if (toRemove.length > 0) {
      const removeIds = toRemove.map((row) => row.id);
      const { data: blockingEvals, error: evalLookupError } = await supabase
        .from(TABLES.evaluations)
        .select("id, assignment_id")
        .in("assignment_id", removeIds)
        .eq("status", "submitted");

      if (evalLookupError) return actionFail(evalLookupError.message);

      if ((blockingEvals?.length ?? 0) > 0 && formString(formData, "force") !== "true") {
        const blockedAssignmentIds = new Set(
          (blockingEvals ?? []).map((e) => e.assignment_id),
        );
        const { data: blockedGroups } = await supabase
          .from(TABLES.judgeGroups)
          .select("name")
          .in(
            "id",
            toRemove
              .filter((row) => blockedAssignmentIds.has(row.id))
              .map((row) => row.group_id),
          );

        const names =
          (blockedGroups ?? [])
            .map((g) => g.name)
            .filter(Boolean)
            .join(" & ") || "a color group";

        return actionFail(
          `Cannot remove ${names}: judges already submitted scores for that group. Keep those groups selected (or only change a group that has no submitted scores yet).`,
        );
      }

      // Drafts also reference assignment_id (ON DELETE RESTRICT) — clear them first.
      const { error: draftDeleteError } = await supabase
        .from(TABLES.evaluations)
        .delete()
        .in("assignment_id", removeIds)
        .eq("status", "draft");
      if (draftDeleteError) return actionFail(draftDeleteError.message);

      const { error: deleteError } = await supabase
        .from(TABLES.judgingAssignments)
        .delete()
        .in("id", removeIds);
      if (deleteError) return actionFail(deleteError.message);
    }

    if (toAdd.length > 0) {
      const { error: insertError } = await supabase
        .from(TABLES.judgingAssignments)
        .insert(
          toAdd.map((group_id) => ({
            event_id,
            team_id,
            group_id,
          })),
        );
      if (insertError) return actionFail(insertError.message);
    }

    revalidatePath("/admin/assignments");
    revalidatePath("/admin/teams");
    revalidatePath("/admin/groups");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/monitor");
    revalidatePath("/admin/results");

    if (desired.length === 0) {
      return actionOk("Team unassigned from all groups successfully.");
    }
    if (desired.length === 1) {
      return actionOk("Team assigned to 1 color group successfully.");
    }
    return actionOk(
      `Team assigned to ${desired.length} color groups for dual evaluation successfully.`,
    );
  } catch (e) {
    return actionFail(
      e instanceof Error ? e.message : "Failed to update assignment",
    );
  }
}

/**
 * Deletes all evaluations (draft + submitted) for a team so admins can
 * reassign color groups after testing.
 */
export async function clearTeamEvaluationsAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminClient();
    const event_id = formString(formData, "event_id");
    const team_id = formString(formData, "team_id");

    if (!event_id || !team_id) {
      return actionFail("Missing event or team.");
    }

    const { data: deleted, error } = await supabase
      .from(TABLES.evaluations)
      .delete()
      .eq("event_id", event_id)
      .eq("team_id", team_id)
      .select("id");

    if (error) return actionFail(error.message);

    revalidatePath("/admin/assignments");
    revalidatePath("/admin/teams");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/monitor");
    revalidatePath("/admin/results");
    revalidatePath("/judge/dashboard");

    const count = deleted?.length ?? 0;
    return actionOk(
      count === 0
        ? "No evaluations to clear for this team."
        : `Cleared ${count} evaluation${count === 1 ? "" : "s"} successfully. You can reassign groups now.`,
    );
  } catch (e) {
    return actionFail(
      e instanceof Error ? e.message : "Failed to clear evaluations",
    );
  }
}
