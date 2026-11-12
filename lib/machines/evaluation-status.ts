import { defineMachine } from "@/lib/fsm";
import type { EvaluationStatus } from "@/types/database";

export type EvaluationStatusEvent = "SAVE_DRAFT" | "SUBMIT";

/** Persisted evaluation row. Submit is terminal. */
export const evaluationStatusMachine = defineMachine<
  EvaluationStatus,
  EvaluationStatusEvent
>({
  id: "evaluation-status",
  initial: "draft",
  states: {
    draft: { SAVE_DRAFT: "draft", SUBMIT: "submitted" },
    submitted: {},
  },
});

export type DerivedEvalStatus = "not_started" | "in_progress" | "submitted";

export function deriveEvalStatus(
  evaluation: { status: EvaluationStatus } | null | undefined,
): DerivedEvalStatus {
  if (!evaluation) return "not_started";
  if (evaluation.status === "submitted") return "submitted";
  return "in_progress";
}

export function canSubmitEvaluation(status: EvaluationStatus | null): boolean {
  return status === null || status === "draft";
}

export function canSaveEvaluationDraft(status: EvaluationStatus | null): boolean {
  return status === null || evaluationStatusMachine.can(status, "SAVE_DRAFT");
}
