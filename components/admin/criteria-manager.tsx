"use client";

import { AdminActionForm } from "@/components/admin/admin-action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteCriterionAction,
  upsertCriterionAction,
} from "@/lib/admin/actions/criteria";
import type { CriterionAbetOutcome, EvaluationCriterion } from "@/types/database";

type CriterionRow = EvaluationCriterion & {
  criterion_abet_outcomes: CriterionAbetOutcome[];
};

type CriteriaManagerProps = {
  eventId: string;
  criteria: CriterionRow[];
};

export function CriteriaManager({ eventId, criteria }: CriteriaManagerProps) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-3">
        {criteria.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-muted/40 px-4 py-10 text-center text-sm text-muted-foreground">
            No evaluation criteria yet. Add rubric items for this event.
          </p>
        ) : (
          criteria.map((c) => (
            <details
              key={c.id}
              className="rounded-md border border-border bg-card"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-semibold">
                    {c.display_order}. {c.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Max {c.max_score} · weight {c.weight}
                    {c.category ? ` · ${c.category}` : ""}
                    {c.active ? "" : " · inactive"}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {c.criterion_abet_outcomes
                    .map((a) => a.outcome_code)
                    .join(", ") || "No ABET tags"}
                </span>
              </summary>
              <div className="space-y-4 border-t border-border px-4 py-4">
                <AdminActionForm action={upsertCriterionAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="event_id" value={eventId} />
                  <CriterionFields
                    criterion={c}
                    abetDefault={c.criterion_abet_outcomes
                      .map((a) => a.outcome_code)
                      .join(",")}
                  />
                  <Button type="submit" size="lg">
                    Save criterion
                  </Button>
                </AdminActionForm>
                <AdminActionForm action={deleteCriterionAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <Button type="submit" variant="destructive" size="sm">
                    Delete
                  </Button>
                </AdminActionForm>
              </div>
            </details>
          ))
        )}
      </div>

      <div className="h-fit rounded-md border border-border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold">Add criterion</h2>
        <AdminActionForm action={upsertCriterionAction}>
          <input type="hidden" name="event_id" value={eventId} />
          <CriterionFields />
          <Button type="submit" size="lg" className="w-full">
            Create criterion
          </Button>
        </AdminActionForm>
      </div>
    </div>
  );
}

function CriterionFields({
  criterion,
  abetDefault = "",
}: {
  criterion?: EvaluationCriterion;
  abetDefault?: string;
}) {
  const suffix = criterion?.id ?? "new";
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`name-${suffix}`}>Name</Label>
        <Input
          id={`name-${suffix}`}
          name="name"
          required
          defaultValue={criterion?.name}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`description-${suffix}`}>Description</Label>
        <Textarea
          id={`description-${suffix}`}
          name="description"
          defaultValue={criterion?.description}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`category-${suffix}`}>Category</Label>
          <Input
            id={`category-${suffix}`}
            name="category"
            defaultValue={criterion?.category}
            placeholder="Technical / ABET"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`order-${suffix}`}>Display order</Label>
          <Input
            id={`order-${suffix}`}
            name="display_order"
            type="number"
            defaultValue={criterion?.display_order ?? 0}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`max-${suffix}`}>Max score</Label>
          <Input
            id={`max-${suffix}`}
            name="max_score"
            type="number"
            step="0.5"
            defaultValue={criterion?.max_score ?? 10}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`weight-${suffix}`}>Weight</Label>
          <Input
            id={`weight-${suffix}`}
            name="weight"
            type="number"
            step="0.1"
            defaultValue={criterion?.weight ?? 1}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`abet-${suffix}`}>ABET codes (comma-separated)</Label>
        <Input
          id={`abet-${suffix}`}
          name="abet_codes"
          defaultValue={abetDefault}
          placeholder="1,2,3"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={criterion?.active ?? true}
          value="on"
        />
        Active
      </label>
    </>
  );
}
