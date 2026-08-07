import "server-only";

import { requireSessionProfile } from "@/lib/auth/session";
import {
  getJudgeTeamAccess,
  type AssignedProject,
  type JudgeWorkspace,
} from "@/lib/judge/context";
import { ensureStandardCriteria } from "@/lib/scoring/ensure-standard-criteria";
import { filterStandardCriteria } from "@/lib/scoring/standard-criteria";
import { createClient } from "@/lib/supabase/server";
import { TABLES } from "@/lib/supabase/tables";
import type {
  CriterionAbetOutcome,
  Evaluation,
  EvaluationCriterion,
  EvaluationScore,
  Event,
  Team,
  TeamMember,
} from "@/types/database";

export type CriterionWithAbet = EvaluationCriterion & {
  criterion_abet_outcomes: CriterionAbetOutcome[];
};

export type EvaluationPageData = {
  access: Awaited<ReturnType<typeof getJudgeTeamAccess>>;
  criteria: CriterionWithAbet[];
  scores: EvaluationScore[];
  /** Admin opened a team they are not assigned to — UI preview only. */
  adminPreview: boolean;
  denyReason:
    | "not_assigned"
    | "no_judge_profile"
    | "no_event"
    | "event_ended"
    | "no_group"
    | "no_team"
    | null;
};

async function loadCriteriaAndScores(
  eventId: string,
  evaluation: Evaluation | null,
): Promise<{ criteria: CriterionWithAbet[]; scores: EvaluationScore[] }> {
  const supabase = await createClient();
  await ensureStandardCriteria(supabase, eventId);

  const { data: criteria, error: criteriaError } = await supabase
    .from(TABLES.evaluationCriteria)
    .select("*, criterion_abet_outcomes(*)")
    .eq("event_id", eventId)
    .eq("active", true)
    .order("display_order");

  if (criteriaError) throw new Error(criteriaError.message);

  const filtered = filterStandardCriteria(
    (criteria ?? []) as CriterionWithAbet[],
  );

  let scores: EvaluationScore[] = [];
  if (evaluation) {
    const { data: scoreRows, error: scoreError } = await supabase
      .from(TABLES.evaluationScores)
      .select("*")
      .eq("evaluation_id", evaluation.id);
    if (scoreError) throw new Error(scoreError.message);
    scores = (scoreRows ?? []) as EvaluationScore[];
  }

  return {
    criteria: filtered,
    scores,
  };
}

/**
 * Admin-only: load any team so the evaluation UI can be previewed
 * without a judge group assignment.
 */
async function loadAdminTeamPreview(teamId: string): Promise<{
  event: Event;
  project: AssignedProject;
} | null> {
  const supabase = await createClient();

  const { data: teamRow, error: teamError } = await supabase
    .from(TABLES.teams)
    .select("*, team_members(*)")
    .eq("id", teamId)
    .maybeSingle();

  if (teamError) throw new Error(teamError.message);
  if (!teamRow) return null;

  const { team_members, ...team } = teamRow as Team & {
    team_members: TeamMember[];
  };

  const { data: event, error: eventError } = await supabase
    .from(TABLES.events)
    .select("*")
    .eq("id", team.event_id)
    .maybeSingle();

  if (eventError) throw new Error(eventError.message);
  if (!event) return null;

  // Prefer a real assignment id if one exists (for form payload shape).
  const { data: assignment } = await supabase
    .from(TABLES.judgingAssignments)
    .select("id")
    .eq("event_id", event.id)
    .eq("team_id", team.id)
    .limit(1)
    .maybeSingle();

  const project: AssignedProject = {
    team: team as Team,
    members: (team_members ?? []) as TeamMember[],
    evaluation: null,
    status: "not_started",
    assignmentId: assignment?.id ?? "00000000-0000-0000-0000-000000000000",
  };

  return { event: event as Event, project };
}

export async function getEvaluationPageData(
  teamId: string,
  options: { previewJudgeId?: string | null } = {},
): Promise<EvaluationPageData> {
  const access = await getJudgeTeamAccess(teamId, {
    previewJudgeId: options.previewJudgeId,
  });

  if (access.allowed && access.project && access.workspace.event) {
    const { criteria, scores } = await loadCriteriaAndScores(
      access.workspace.event.id,
      access.project.evaluation,
    );
    return {
      access,
      criteria,
      scores,
      adminPreview: false,
      denyReason: null,
    };
  }

  // Admin UI preview for any team (design / QA without judge assignment).
  try {
    const profile = await requireSessionProfile();
    if (profile.role === "admin") {
      const preview = await loadAdminTeamPreview(teamId);
      if (preview) {
        const { criteria, scores } = await loadCriteriaAndScores(
          preview.event.id,
          null,
        );
        const workspace: JudgeWorkspace = {
          ...access.workspace,
          event: preview.event,
          projects: [preview.project],
        };
        return {
          access: {
            workspace,
            project: preview.project,
            allowed: true as const,
          },
          criteria,
          scores,
          adminPreview: true,
          denyReason: null,
        };
      }
      return {
        access,
        criteria: [],
        scores: [],
        adminPreview: false,
        denyReason: "no_team",
      };
    }
  } catch {
    // not signed in / not admin
  }

  const denyReason =
    access.workspace.blockReason === "no_judge_profile"
      ? "no_judge_profile"
      : access.workspace.blockReason === "no_event"
        ? "no_event"
        : access.workspace.blockReason === "event_ended"
          ? "event_ended"
          : access.workspace.blockReason === "no_group"
            ? "no_group"
            : "not_assigned";

  return {
    access,
    criteria: [],
    scores: [],
    adminPreview: false,
    denyReason,
  };
}
