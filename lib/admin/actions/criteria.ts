"use server";

import { revalidatePath } from "next/cache";

import {
  actionFail,
  actionOk,
  type ActionResult,
} from "@/lib/admin/action-result";
import { requireAdminClient } from "@/lib/admin/guard";
import { TABLES } from "@/lib/supabase/tables";
import { criterionFormSchema } from "@/lib/validation/admin";

function formString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

export async function upsertCriterionAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminClient();
    const parsed = criterionFormSchema.safeParse({
      id: formString(formData, "id") || undefined,
      event_id: formString(formData, "event_id"),
      name: formString(formData, "name"),
      description: formString(formData, "description"),
      category: formString(formData, "category"),
      max_score: formString(formData, "max_score") || "10",
      weight: formString(formData, "weight") || "1",
      display_order: formString(formData, "display_order") || "0",
      active: formData.get("active"),
      abet_codes: formString(formData, "abet_codes"),
    });

    if (!parsed.success) {
      return actionFail(
        parsed.error.issues[0]?.message ?? "Invalid criterion",
      );
    }

    const { id, abet_codes, ...payload } = parsed.data;
    let criterionId = id;

    if (id) {
      const { error } = await supabase
        .from(TABLES.evaluationCriteria)
        .update(payload)
        .eq("id", id);
      if (error) return actionFail(error.message);
    } else {
      const { data, error } = await supabase
        .from(TABLES.evaluationCriteria)
        .insert(payload)
        .select("id")
        .single();
      if (error) return actionFail(error.message);
      criterionId = data.id;
    }

    if (criterionId && abet_codes !== undefined) {
      await supabase
        .from(TABLES.criterionAbetOutcomes)
        .delete()
        .eq("criterion_id", criterionId);

      const codes = abet_codes
        .split(/[\s,]+/)
        .map((c) => c.trim())
        .filter(Boolean);

      if (codes.length > 0) {
        const { error: abetError } = await supabase
          .from(TABLES.criterionAbetOutcomes)
          .insert(
            codes.map((outcome_code) => ({
              criterion_id: criterionId!,
              outcome_code,
              outcome_label: `ABET ${outcome_code}`,
            })),
          );
        if (abetError) return actionFail(abetError.message);
      }
    }

    revalidatePath("/admin/criteria");
    return actionOk(id ? "Criterion updated." : "Criterion created.");
  } catch (e) {
    return actionFail(
      e instanceof Error ? e.message : "Failed to save criterion",
    );
  }
}

export async function deleteCriterionAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminClient();
    const id = formString(formData, "id");
    if (!id) return actionFail("Missing criterion id");

    const { error } = await supabase
      .from(TABLES.evaluationCriteria)
      .delete()
      .eq("id", id);
    if (error) return actionFail(error.message);

    revalidatePath("/admin/criteria");
    return actionOk("Criterion deleted.");
  } catch (e) {
    return actionFail(
      e instanceof Error ? e.message : "Failed to delete criterion",
    );
  }
}
