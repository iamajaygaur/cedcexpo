import "server-only";

import type { createClient } from "@/lib/supabase/server";
import {
  isStandardCriterionName,
  STANDARD_EVALUATION_CRITERIA,
} from "@/lib/scoring/standard-criteria";
import { TABLES } from "@/lib/supabase/tables";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Ensures the fixed CEDC rubric exists for an event.
 * Idempotent: inserts any missing standard criteria by name.
 * Also deactivates legacy non-standard criteria so totals stay /50.
 */
export async function ensureStandardCriteria(
  supabase: Supabase,
  eventId: string,
): Promise<void> {
  const { data: existing, error: existingError } = await supabase
    .from(TABLES.evaluationCriteria)
    .select("id, name, active")
    .eq("event_id", eventId);

  if (existingError) throw new Error(existingError.message);

  const rows = existing ?? [];
  const have = new Set(
    rows.map((row) => String(row.name).toLowerCase()),
  );

  for (const item of STANDARD_EVALUATION_CRITERIA) {
    if (have.has(item.name.toLowerCase())) continue;

    const { data: created, error } = await supabase
      .from(TABLES.evaluationCriteria)
      .insert({
        event_id: eventId,
        name: item.name,
        description: item.description,
        category: item.category,
        max_score: item.max_score,
        weight: item.weight,
        display_order: item.display_order,
        active: true,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    if (item.abet_codes.length > 0 && created?.id) {
      const { error: abetError } = await supabase
        .from(TABLES.criterionAbetOutcomes)
        .insert(
          item.abet_codes.map((outcome_code) => ({
            criterion_id: created.id,
            outcome_code,
            outcome_label: `ABET ${outcome_code}`,
          })),
        );
      if (abetError) throw new Error(abetError.message);
    }
  }

  const legacyIds = rows
    .filter(
      (row) =>
        row.active !== false && !isStandardCriterionName(String(row.name)),
    )
    .map((row) => row.id);

  if (legacyIds.length > 0) {
    const { error: deactivateError } = await supabase
      .from(TABLES.evaluationCriteria)
      .update({ active: false })
      .in("id", legacyIds);
    if (deactivateError) throw new Error(deactivateError.message);
  }
}
