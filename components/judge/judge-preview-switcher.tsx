"use client";

import { useRouter } from "next/navigation";

import type { PreviewJudgeOption } from "@/lib/judge/context";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type JudgePreviewSwitcherProps = {
  judges: PreviewJudgeOption[];
  currentJudgeId: string | null;
};

export function JudgePreviewSwitcher({
  judges,
  currentJudgeId,
}: JudgePreviewSwitcherProps) {
  const router = useRouter();

  return (
    <div className="rounded-md border border-primary/30 bg-primary-container/25 p-4">
      <Label htmlFor="preview-judge" className="text-sm font-semibold">
        Admin preview — view a judge&apos;s dashboard
      </Label>
      <p className="mt-1 mb-3 text-xs text-muted-foreground">
        You stay logged in as admin. Pick a judge to see their assigned
        projects.
      </p>
      <Select
        id="preview-judge"
        className="h-11 max-w-md rounded-md bg-background"
        value={currentJudgeId ?? ""}
        onChange={(e) => {
          const id = e.target.value;
          router.push(
            id ? `/judge/dashboard?previewJudgeId=${id}` : "/judge/dashboard",
          );
        }}
      >
        <option value="">Select a judge…</option>
        {judges.map((j) => (
          <option key={j.id} value={j.id}>
            {j.name}
            {j.groupName ? ` · ${j.groupName}` : " · no group"}
            {j.email ? ` (${j.email})` : ""}
          </option>
        ))}
      </Select>
    </div>
  );
}
