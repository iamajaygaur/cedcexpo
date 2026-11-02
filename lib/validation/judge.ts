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

/** Submit requires a non-empty comment on every scored criterion. */
export const evaluationSubmitSchema = evaluationDraftSchema.superRefine(
  (data, ctx) => {
    data.scores.forEach((row, index) => {
      if (!row.comment.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "A comment is required for every criterion before submit.",
          path: ["scores", index, "comment"],
        });
      }
    });
  },
);

export type EvaluationDraftInput = z.infer<typeof evaluationDraftSchema>;
