export type {
  UserRole,
  EventStatus,
  EvaluationStatus,
  Profile,
  Event,
  Team,
  TeamMember,
  Judge,
  JudgeGroup,
  JudgeGroupMember,
  JudgingAssignment,
  EvaluationCriterion,
  CriterionAbetOutcome,
  Evaluation,
  EvaluationScore,
  Database,
} from "./database";

export { SEED_IDS } from "./database";

/** @deprecated Prefer Profile.full_name from database types */
export type JudgeGroupSummary = {
  id: string;
  name: string;
  colorKey: string;
};
