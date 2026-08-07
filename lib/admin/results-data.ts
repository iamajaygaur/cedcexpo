import "server-only";

import type { createClient } from "@/lib/supabase/server";
import {
  average,
  competitionRank,
  dualGroupFinalScore,
  maxWeightedTotal,
  weightedEvaluationTotal,
  type DualGroupAverage,
} from "@/lib/scoring/rankings";
import { ensureStandardCriteria } from "@/lib/scoring/ensure-standard-criteria";
import {
  filterStandardCriteria,
  STANDARD_MAX_TOTAL,
} from "@/lib/scoring/standard-criteria";
import { TABLES } from "@/lib/supabase/tables";
import type {
  CriterionAbetOutcome,
  Evaluation,
  EvaluationCriterion,
  EvaluationScore,
  Event,
  JudgeGroup,
  Team,
} from "@/types/database";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type TeamGroupAverageRow = DualGroupAverage & {
  group: JudgeGroup;
};

export type TeamRankingRow = {
  rank: number;
  tied: boolean;
  team: Team;
  groups: JudgeGroup[];
  /** Per color-group averages (equal weight in final score). */
  groupAverages: TeamGroupAverageRow[];
  evaluationCount: number;
  averageScore: number;
  averagePercent: number;
  maxPossible: number;
};

export type CriterionAverageRow = {
  criterion: EvaluationCriterion;
  averageScore: number;
  sampleCount: number;
  abetCodes: string[];
};

export type AbetAverageRow = {
  outcome_code: string;
  outcome_label: string;
  averageScore: number;
  sampleCount: number;
};

export type JudgeCompletionRow = {
  judgeId: string;
  fullName: string;
  email: string;
  groupName: string | null;
  groupColorKey: string | null;
  submitted: number;
  expected: number;
  percent: number;
};

export type ResultsBundle = {
  event: Event;
  rankings: TeamRankingRow[];
  criterionAverages: CriterionAverageRow[];
  abetAverages: AbetAverageRow[];
  judgeCompletion: JudgeCompletionRow[];
  categories: string[];
  groups: JudgeGroup[];
  submittedEvaluationCount: number;
  draftEvaluationCount: number;
};

export async function loadResultsBundle(
  supabase: Supabase,
  eventId: string,
  filters?: {
    groupId?: string | null;
    category?: string | null;
  },
): Promise<ResultsBundle | null> {
  const { data: event, error: eventError } = await supabase
    .from(TABLES.events)
    .select("*")
    .eq("id", eventId)
    .maybeSingle();
  if (eventError) throw new Error(eventError.message);
  if (!event) return null;

  await ensureStandardCriteria(supabase, eventId);

  const [
    { data: teams, error: teamsError },
    { data: groups, error: groupsError },
    { data: assignments, error: assignError },
    { data: criteria, error: criteriaError },
    { data: evaluations, error: evalError },
    { data: members, error: membersError },
  ] = await Promise.all([
    supabase.from(TABLES.teams).select("*").eq("event_id", eventId),
    supabase
      .from(TABLES.judgeGroups)
      .select("*")
      .eq("event_id", eventId)
      .order("display_order"),
    supabase
      .from(TABLES.judgingAssignments)
      .select("team_id, group_id")
      .eq("event_id", eventId),
    supabase
      .from(TABLES.evaluationCriteria)
      .select("*, criterion_abet_outcomes(*)")
      .eq("event_id", eventId)
      .eq("active", true)
      .order("display_order"),
    supabase
      .from(TABLES.evaluations)
      .select("*, evaluation_scores(*)")
      .eq("event_id", eventId),
    supabase
      .from(TABLES.judgeGroupMembers)
      .select("judge_id, group_id, judges(*, profiles(full_name, email))")
      .eq("event_id", eventId),
  ]);

  if (teamsError) throw new Error(teamsError.message);
  if (groupsError) throw new Error(groupsError.message);
  if (assignError) throw new Error(assignError.message);
  if (criteriaError) throw new Error(criteriaError.message);
  if (evalError) throw new Error(evalError.message);
  if (membersError) throw new Error(membersError.message);

  const teamList = (teams ?? []) as Team[];
  const groupList = (groups ?? []) as JudgeGroup[];
  const groupMap = new Map(groupList.map((g) => [g.id, g]));
  const teamGroups = new Map<string, string[]>();
  for (const a of assignments ?? []) {
    const list = teamGroups.get(a.team_id) ?? [];
    list.push(a.group_id);
    teamGroups.set(a.team_id, list);
  }

  type CriterionRow = EvaluationCriterion & {
    criterion_abet_outcomes: CriterionAbetOutcome[];
  };
  // Rankings use the fixed CEDC rubric only (5 × 10 = 50).
  const criteriaList = filterStandardCriteria(
    (criteria ?? []) as CriterionRow[],
  );
  const criteriaMap = new Map(criteriaList.map((c) => [c.id, c]));
  const maxPossible =
    criteriaList.length > 0
      ? maxWeightedTotal(criteriaList)
      : STANDARD_MAX_TOTAL;

  type EvalRow = Evaluation & { evaluation_scores: EvaluationScore[] };
  const allEvals = (evaluations ?? []) as EvalRow[];
  const submitted = allEvals.filter((e) => e.status === "submitted");
  const drafts = allEvals.filter((e) => e.status === "draft");

  const categories = Array.from(
    new Set(
      teamList
        .map((t) => t.category.trim())
        .filter((c) => c.length > 0),
    ),
  ).sort();

  let filteredTeams = teamList;
  if (filters?.groupId) {
    filteredTeams = filteredTeams.filter((t) =>
      (teamGroups.get(t.id) ?? []).includes(filters.groupId!),
    );
  }
  if (filters?.category) {
    filteredTeams = filteredTeams.filter(
      (t) => t.category === filters.category,
    );
  }

  const filteredTeamIds = new Set(filteredTeams.map((t) => t.id));
  const submittedForFilter = submitted.filter((e) =>
    filteredTeamIds.has(e.team_id),
  );

  // judge_id → color group for this event (one group per judge).
  const groupByJudge = new Map<string, string>();
  for (const m of members ?? []) {
    groupByJudge.set(m.judge_id, m.group_id);
  }

  // teamId → groupId → judge totals (/50)
  const totalsByTeamGroup = new Map<string, Map<string, number[]>>();

  for (const evaluation of submittedForFilter) {
    const judgeGroupId = groupByJudge.get(evaluation.judge_id);
    if (!judgeGroupId) continue;

    const assigned = teamGroups.get(evaluation.team_id) ?? [];
    if (!assigned.includes(judgeGroupId)) continue;

    const scoreRows = (evaluation.evaluation_scores ?? [])
      .map((s) => {
        const criterion = criteriaMap.get(s.criterion_id);
        if (!criterion) return null;
        return {
          score: Number(s.score),
          weight: Number(criterion.weight),
        };
      })
      .filter((r): r is { score: number; weight: number } => r !== null);

    const total = weightedEvaluationTotal(scoreRows);
    let byGroup = totalsByTeamGroup.get(evaluation.team_id);
    if (!byGroup) {
      byGroup = new Map();
      totalsByTeamGroup.set(evaluation.team_id, byGroup);
    }
    const list = byGroup.get(judgeGroupId) ?? [];
    list.push(total);
    byGroup.set(judgeGroupId, list);
  }

  const unsorted = filteredTeams
    .map((team) => {
      const gids = teamGroups.get(team.id) ?? [];
      const scored = dualGroupFinalScore({
        assignedGroupIds: gids,
        totalsByGroup: totalsByTeamGroup.get(team.id) ?? new Map(),
      });
      if (!scored) return null;

      const groups = gids
        .map((gid) => groupMap.get(gid))
        .filter((g): g is JudgeGroup => Boolean(g));

      const groupAverages: TeamGroupAverageRow[] = scored.groupAverages
        .map((ga) => {
          const group = groupMap.get(ga.groupId);
          if (!group) return null;
          return { ...ga, group };
        })
        .filter((r): r is TeamGroupAverageRow => r !== null);

      const averagePercent =
        maxPossible > 0 ? (scored.finalScore / maxPossible) * 100 : 0;

      return {
        team,
        groups,
        groupAverages,
        evaluationCount: scored.evaluationCount,
        averageScore: scored.finalScore,
        averagePercent,
        maxPossible,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.averageScore - a.averageScore);

  const ranks = competitionRank(unsorted.map((r) => r.averageScore));
  const rankings: TeamRankingRow[] = unsorted.map((row, index) => {
    const rank = ranks[index]!;
    const tied =
      unsorted.filter((r) => nearlyEqualScore(r.averageScore, row.averageScore))
        .length > 1;
    return { ...row, rank, tied };
  });

  // Criterion averages (submitted only, event-wide or filtered teams)
  const criterionScoreBuckets = new Map<string, number[]>();
  for (const evaluation of submittedForFilter) {
    for (const s of evaluation.evaluation_scores ?? []) {
      const list = criterionScoreBuckets.get(s.criterion_id) ?? [];
      list.push(Number(s.score));
      criterionScoreBuckets.set(s.criterion_id, list);
    }
  }

  const criterionAverages: CriterionAverageRow[] = criteriaList.map((c) => {
    const samples = criterionScoreBuckets.get(c.id) ?? [];
    return {
      criterion: c,
      averageScore: average(samples) ?? 0,
      sampleCount: samples.length,
      abetCodes: c.criterion_abet_outcomes.map((a) => a.outcome_code),
    };
  });

  const abetBuckets = new Map<
    string,
    { label: string; scores: number[] }
  >();
  for (const c of criteriaList) {
    const samples = criterionScoreBuckets.get(c.id) ?? [];
    for (const outcome of c.criterion_abet_outcomes) {
      const bucket = abetBuckets.get(outcome.outcome_code) ?? {
        label: outcome.outcome_label || `ABET ${outcome.outcome_code}`,
        scores: [],
      };
      bucket.scores.push(...samples);
      abetBuckets.set(outcome.outcome_code, bucket);
    }
  }

  const abetAverages: AbetAverageRow[] = Array.from(abetBuckets.entries())
    .map(([code, bucket]) => ({
      outcome_code: code,
      outcome_label: bucket.label,
      averageScore: average(bucket.scores) ?? 0,
      sampleCount: bucket.scores.length,
    }))
    .sort((a, b) => a.outcome_code.localeCompare(b.outcome_code));

  // Judge completion (expected = teams in their group)
  const teamsByGroup = new Map<string, number>();
  for (const a of assignments ?? []) {
    teamsByGroup.set(a.group_id, (teamsByGroup.get(a.group_id) ?? 0) + 1);
  }

  const submittedByJudge = new Map<string, number>();
  for (const e of submitted) {
    submittedByJudge.set(
      e.judge_id,
      (submittedByJudge.get(e.judge_id) ?? 0) + 1,
    );
  }

  const judgeCompletion: JudgeCompletionRow[] = (members ?? []).map((m) => {
    const judgeRaw = m.judges as
      | {
          id: string;
          profiles: { full_name: string; email: string } | null;
        }
      | {
          id: string;
          profiles: { full_name: string; email: string } | null;
        }[]
      | null;
    const judge = Array.isArray(judgeRaw) ? judgeRaw[0] : judgeRaw;
    const group = groupMap.get(m.group_id) ?? null;
    const expected = teamsByGroup.get(m.group_id) ?? 0;
    const done = submittedByJudge.get(m.judge_id) ?? 0;
    return {
      judgeId: m.judge_id,
      fullName: judge?.profiles?.full_name ?? "Judge",
      email: judge?.profiles?.email ?? "",
      groupName: group?.name ?? null,
      groupColorKey: group?.color_key ?? null,
      submitted: done,
      expected,
      percent: expected > 0 ? Math.round((done / expected) * 100) : 0,
    };
  });

  return {
    event: event as Event,
    rankings,
    criterionAverages,
    abetAverages,
    judgeCompletion,
    categories,
    groups: groupList,
    submittedEvaluationCount: submitted.length,
    draftEvaluationCount: drafts.length,
  };
}

function nearlyEqualScore(a: number, b: number) {
  return Math.abs(a - b) < 1e-6;
}
