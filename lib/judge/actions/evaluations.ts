"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  actionFail,
  actionOk,
  type ActionResult,
} from "@/lib/admin/action-result";
import { getJudgeTeamAccess } from "@/lib/judge/context";
import { checkEvaluationMutationRateLimit } from "@/lib/rate-limit";
import { ensureStandardCriteria } from "@/lib/scoring/ensure-standard-criteria";
import {
  filterStandardCriteria,
} from "@/lib/scoring/standard-criteria";
import { createClient } from "@/lib/supabase/server";
import { TABLES } from "@/lib/supabase/tables";
import {
  evaluationDraftSchema,
  evaluationSubmitSchema,
} from "@/lib/validation/judge";

function clientKeyFromHeaders(headerList: Headers): string {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return headerList.get("x-real-ip") ?? "unknown";
}

async function requireJudgeClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: judge } = await supabase
    .from(TABLES.judges)
    .select("id")
    .eq("profile_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (!judge) throw new Error("No active judge profile");

  return { supabase, judgeId: judge.id as string };
}

async function upsertEvaluationScores(
  supabase: Awaited<ReturnType<typeof createClient>>,
  evaluationId: string,
  scores: { criterion_id: string; score: number; comment: string }[],
  criteriaMax: Map<string, number>,
) {
  for (const row of scores) {
    const max = criteriaMax.get(row.criterion_id);
    if (max === undefined) {
      return actionFail("Invalid criterion");
    }
    if (row.score > max) {
      return actionFail(`Score cannot exceed ${max} for a criterion`);
    }
  }

  for (const row of scores) {
    const { error } = await supabase.from(TABLES.evaluationScores).upsert(
      {
        evaluation_id: evaluationId,
        criterion_id: row.criterion_id,
        score: row.score,
        comment: row.comment,
      },
      { onConflict: "evaluation_id,criterion_id" },
    );
    if (error) return actionFail(error.message);
  }

  return null;
}

export async function saveEvaluationDraftAction(
  payload: unknown,
): Promise<ActionResult & { evaluationId?: string }> {
  try {
    const headerList = await headers();
    const { supabase, judgeId } = await requireJudgeClient();
    const rate = checkEvaluationMutationRateLimit(
      judgeId || clientKeyFromHeaders(headerList),
    );
    if (!rate.allowed) {
      return actionFail("Too many save attempts. Please wait a moment.");
    }

    const parsed = evaluationDraftSchema.safeParse(payload);
    if (!parsed.success) {
      return actionFail(parsed.error.issues[0]?.message ?? "Invalid evaluation");
    }

    const access = await getJudgeTeamAccess(parsed.data.team_id);
    if (!access.allowed || !access.project) {
      if (access.workspace.blockReason === "event_ended") {
        return actionFail("This expo has ended. Judging is closed.");
      }
      return actionFail("You are not assigned to evaluate this team.");
    }

    if (access.workspace.event?.status !== "active") {
      return actionFail("This expo has ended. Judging is closed.");
    }

    if (
      access.project.evaluation?.status === "submitted" ||
      access.project.assignmentId !== parsed.data.assignment_id
    ) {
      return actionFail("Evaluation cannot be modified.");
    }

    await ensureStandardCriteria(supabase, parsed.data.event_id);

    const { data: criteria, error: criteriaError } = await supabase
      .from(TABLES.evaluationCriteria)
      .select("id, max_score, name")
      .eq("event_id", parsed.data.event_id)
      .eq("active", true);
    if (criteriaError) return actionFail(criteriaError.message);

    const standardCriteria = filterStandardCriteria(criteria ?? []);
    const criteriaMax = new Map(
      standardCriteria.map((c) => [c.id, Number(c.max_score)]),
    );

    let evaluationId = access.project.evaluation?.id;

    if (!evaluationId) {
      const { data: created, error: createError } = await supabase
        .from(TABLES.evaluations)
        .insert({
          event_id: parsed.data.event_id,
          judge_id: judgeId,
          team_id: parsed.data.team_id,
          assignment_id: parsed.data.assignment_id,
          status: "draft",
          comments: parsed.data.comments,
        })
        .select("id")
        .single();
      if (createError) return actionFail(createError.message);
      evaluationId = created.id;
    } else {
      const { error: updateError } = await supabase
        .from(TABLES.evaluations)
        .update({ comments: parsed.data.comments })
        .eq("id", evaluationId)
        .eq("status", "draft");
      if (updateError) return actionFail(updateError.message);
    }

    const scoreError = await upsertEvaluationScores(
      supabase,
      evaluationId,
      parsed.data.scores,
      criteriaMax,
    );
    if (scoreError) return scoreError;

    revalidatePath("/judge/dashboard");
    revalidatePath("/judge/projects");
    revalidatePath(`/judge/evaluate/${parsed.data.team_id}`);

    return { ...actionOk("Draft saved."), evaluationId };
  } catch (e) {
    return actionFail(
      e instanceof Error ? e.message : "Failed to save draft",
    );
  }
}

export async function submitEvaluationAction(
  payload: unknown,
): Promise<ActionResult> {
  try {
    const headerList = await headers();
    const { supabase, judgeId } = await requireJudgeClient();
    const rate = checkEvaluationMutationRateLimit(
      judgeId || clientKeyFromHeaders(headerList),
    );
    if (!rate.allowed) {
      return actionFail("Too many submit attempts. Please wait a moment.");
    }

    const parsed = evaluationSubmitSchema.safeParse(payload);
    if (!parsed.success) {
      return actionFail(parsed.error.issues[0]?.message ?? "Invalid evaluation");
    }

    const access = await getJudgeTeamAccess(parsed.data.team_id);
    if (!access.allowed || !access.project) {
      if (access.workspace.blockReason === "event_ended") {
        return actionFail("This expo has ended. Judging is closed.");
      }
      return actionFail("You are not assigned to evaluate this team.");
    }

    if (access.workspace.event?.status !== "active") {
      return actionFail("This expo has ended. Judging is closed.");
    }

    if (access.project.evaluation?.status === "submitted") {
      return actionFail("Evaluation already submitted.");
    }

    await ensureStandardCriteria(supabase, parsed.data.event_id);

    const { data: criteria, error: criteriaError } = await supabase
      .from(TABLES.evaluationCriteria)
      .select("id, max_score, name")
      .eq("event_id", parsed.data.event_id)
      .eq("active", true)
      .order("display_order");
    if (criteriaError) return actionFail(criteriaError.message);

    const activeCriteria = filterStandardCriteria(criteria ?? []);
    if (activeCriteria.length === 0) {
      return actionFail("No evaluation criteria configured for this event.");
    }

    const scoreMap = new Map(
      parsed.data.scores.map((s) => [s.criterion_id, s]),
    );

    for (const c of activeCriteria) {
      const score = scoreMap.get(c.id);
      if (!score) {
        return actionFail(`Missing score for "${c.name}"`);
      }
      if (score.score > Number(c.max_score)) {
        return actionFail(`Score for "${c.name}" exceeds maximum.`);
      }
    }

    const draftResult = await saveEvaluationDraftAction(parsed.data);
    if (!draftResult.ok || !draftResult.evaluationId) {
      return draftResult;
    }

    const { error: submitError } = await supabase
      .from(TABLES.evaluations)
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        comments: parsed.data.comments,
      })
      .eq("id", draftResult.evaluationId)
      .eq("judge_id", judgeId)
      .eq("status", "draft");

    if (submitError) return actionFail(submitError.message);

    revalidatePath("/judge/dashboard");
    revalidatePath("/judge/projects");
    revalidatePath(`/judge/evaluate/${parsed.data.team_id}`);

    return actionOk("Evaluation submitted successfully.");
  } catch (e) {
    return actionFail(
      e instanceof Error ? e.message : "Failed to submit evaluation",
    );
  }
}
