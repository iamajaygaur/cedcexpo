import { z } from "zod";

export const evaluationDraftSchema = z.object({
  team_id: z.string().uuid(),
  event_id: z.string().uuid(),
  assignment_id: z.string().uuid(),
  comments: z.string().max(10000).default(""),
  scores: z.array(
    z.object({
      criterion_id: z.string().uuid(),
      score: z.number().finite().min(0),
      comment: z.string().max(2000).default(""),
    }),
  ),
});

export const evaluationSubmitSchema = evaluationDraftSchema;

export type EvaluationDraftInput = z.infer<typeof evaluationDraftSchema>;
