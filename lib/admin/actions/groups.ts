"use server";

import { revalidatePath } from "next/cache";

import {
  actionFail,
  actionOk,
  type ActionResult,
} from "@/lib/admin/action-result";
import { requireAdminClient } from "@/lib/admin/guard";
import { groupNameForColorKey } from "@/lib/groups/color-tokens";
import { TABLES } from "@/lib/supabase/tables";
import {
  groupFormSchema,
  groupMemberSchema,
} from "@/lib/validation/admin";

function formString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

export async function upsertGroupAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminClient();
    const parsed = groupFormSchema.safeParse({
      id: formString(formData, "id") || undefined,
      event_id: formString(formData, "event_id"),
      name: formString(formData, "name") || undefined,
      color_key: formString(formData, "color_key"),
      display_order: formString(formData, "display_order") || "1",
    });

    if (!parsed.success) {
      return actionFail(parsed.error.issues[0]?.message ?? "Invalid group");
    }

    const { id, name: _ignoredName, ...rest } = parsed.data;
    const payload = {
      ...rest,
      name: groupNameForColorKey(rest.color_key),
    };
    if (id) {
      const { error } = await supabase
        .from(TABLES.judgeGroups)
        .update(payload)
        .eq("id", id);
      if (error) return actionFail(error.message);
    } else {
      const { error } = await supabase.from(TABLES.judgeGroups).insert(payload);
      if (error) return actionFail(error.message);
    }

    revalidatePath("/admin/groups");
    revalidatePath("/admin/assignments");
    return actionOk(id ? "Group updated." : "Group created.");
  } catch (e) {
    return actionFail(e instanceof Error ? e.message : "Failed to save group");
  }
}

export async function deleteGroupAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminClient();
    const id = formString(formData, "id");
    if (!id) return actionFail("Missing group id");

    const { data: assignmentIds, error: assignmentError } = await supabase
      .from(TABLES.judgingAssignments)
      .select("id")
      .eq("group_id", id);
    if (assignmentError) return actionFail(assignmentError.message);

    const ids = (assignmentIds ?? []).map((a) => a.id);
    if (ids.length > 0) {
      const { count } = await supabase
        .from(TABLES.evaluations)
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted")
        .in("assignment_id", ids);

      if ((count ?? 0) > 0) {
        return actionFail(
          "Cannot delete group with submitted evaluations. Reassign or archive instead.",
        );
      }
    }

    const { error } = await supabase
      .from(TABLES.judgeGroups)
      .delete()
      .eq("id", id);
    if (error) {
      return actionFail(
        error.message.includes("foreign key")
          ? "Cannot delete this group while related records remain."
          : error.message,
      );
    }

    // Client shows success dialog, then router.refresh().
    return actionOk("Group deleted successfully.");
  } catch (e) {
    return actionFail(
      e instanceof Error ? e.message : "Failed to delete group",
    );
  }
}

export async function deleteAllGroupsAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminClient();
    const eventId = formString(formData, "event_id");
    if (!eventId) return actionFail("Missing event.");

    const { data: groups, error: groupsError } = await supabase
      .from(TABLES.judgeGroups)
      .select("id")
      .eq("event_id", eventId);
    if (groupsError) return actionFail(groupsError.message);

    const groupIds = (groups ?? []).map((g) => g.id);
    if (groupIds.length === 0) {
      return actionFail("No groups to delete for this event.");
    }

    const { data: assignments, error: assignmentError } = await supabase
      .from(TABLES.judgingAssignments)
      .select("id")
      .in("group_id", groupIds);
    if (assignmentError) return actionFail(assignmentError.message);

    const assignmentIds = (assignments ?? []).map((a) => a.id);
    if (assignmentIds.length > 0) {
      const { count: submittedCount, error: submittedError } = await supabase
        .from(TABLES.evaluations)
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted")
        .in("assignment_id", assignmentIds);
      if (submittedError) return actionFail(submittedError.message);

      if ((submittedCount ?? 0) > 0) {
        return actionFail(
          "Cannot delete groups while submitted evaluations exist. Clear scores or archive first.",
        );
      }

      // Draft evaluations block assignment deletes (ON DELETE RESTRICT).
      const { data: draftEvals, error: draftError } = await supabase
        .from(TABLES.evaluations)
        .select("id")
        .in("assignment_id", assignmentIds);
      if (draftError) return actionFail(draftError.message);

      const evalIds = (draftEvals ?? []).map((e) => e.id);
      if (evalIds.length > 0) {
        await supabase
          .from(TABLES.evaluationScores)
          .delete()
          .in("evaluation_id", evalIds);
        const { error: evalDeleteError } = await supabase
          .from(TABLES.evaluations)
          .delete()
          .in("id", evalIds);
        if (evalDeleteError) return actionFail(evalDeleteError.message);
      }
    }

    const { error } = await supabase
      .from(TABLES.judgeGroups)
      .delete()
      .eq("event_id", eventId);
    if (error) {
      return actionFail(
        error.message.includes("foreign key")
          ? "Cannot delete groups while related records remain."
          : error.message,
      );
    }

    return actionOk(
      `All ${groupIds.length} group${groupIds.length === 1 ? "" : "s"} deleted successfully.`,
    );
  } catch (e) {
    return actionFail(
      e instanceof Error ? e.message : "Failed to delete all groups",
    );
  }
}

export async function addGroupMemberAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminClient();
    const parsed = groupMemberSchema.safeParse({
      event_id: formString(formData, "event_id"),
      group_id: formString(formData, "group_id"),
      judge_id: formString(formData, "judge_id"),
    });
    if (!parsed.success) {
      return actionFail(parsed.error.issues[0]?.message ?? "Invalid membership");
    }

    const { error } = await supabase
      .from(TABLES.judgeGroupMembers)
      .upsert(parsed.data, { onConflict: "event_id,judge_id" });
    if (error) return actionFail(error.message);

    revalidatePath("/admin/groups");
    revalidatePath("/admin/judges");
    return actionOk("Judge added to group.");
  } catch (e) {
    return actionFail(
      e instanceof Error ? e.message : "Failed to add group member",
    );
  }
}

export async function removeGroupMemberAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminClient();
    const id = formString(formData, "id");
    if (!id) return actionFail("Missing membership id");

    const { error } = await supabase
      .from(TABLES.judgeGroupMembers)
      .delete()
      .eq("id", id);
    if (error) return actionFail(error.message);

    revalidatePath("/admin/groups");
    return actionOk("Judge removed from group.");
  } catch (e) {
    return actionFail(
      e instanceof Error ? e.message : "Failed to remove member",
    );
  }
}
