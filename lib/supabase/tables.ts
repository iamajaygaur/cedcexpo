import type { Database } from "@/types/database";

/** Typed table name union for compile-time safety. */
export type PublicTable = keyof Database["public"]["Tables"];

export const TABLES = {
  profiles: "profiles",
  events: "events",
  teams: "teams",
  teamMembers: "team_members",
  judges: "judges",
  judgeGroups: "judge_groups",
  judgeGroupMembers: "judge_group_members",
  judgingAssignments: "judging_assignments",
  evaluationCriteria: "evaluation_criteria",
  criterionAbetOutcomes: "criterion_abet_outcomes",
  evaluations: "evaluations",
  evaluationScores: "evaluation_scores",
  reportJobs: "report_jobs",
} as const satisfies Record<string, PublicTable>;
