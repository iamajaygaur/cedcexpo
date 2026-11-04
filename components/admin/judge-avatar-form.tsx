"use client";

import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";

import { AvatarPhotoEditor } from "@/components/shared/avatar-photo-editor";
import {
  removeJudgeAvatarAction,
  uploadJudgeAvatarAction,
} from "@/lib/profile/actions/avatar";

type JudgeAvatarFormProps = {
  judgeId: string;
  fullName: string;
  avatarUrl: string | null;
  /** Compact layout for detail dialogs. */
  compact?: boolean;
};

export function JudgeAvatarForm({
  judgeId,
  fullName,
  avatarUrl,
  compact = false,
}: JudgeAvatarFormProps) {
  const router = useRouter();

  const editor = (
    <AvatarPhotoEditor
      fullName={fullName}
      avatarUrl={avatarUrl}
      compact={compact}
      extraFields={{ judge_id: judgeId }}
      uploadAction={uploadJudgeAvatarAction}
      removeAction={removeJudgeAvatarAction}
      onUpdated={() => router.refresh()}
    />
  );

  if (compact) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        {editor}
      </div>
    );
  }

  return (
    <section className="dash-form-panel">
      <div className="mb-4 flex items-center gap-2">
        <Camera className="size-4 text-muted-foreground" aria-hidden />
        <h2 className="text-sm font-bold tracking-wide text-foreground uppercase">
          Profile photo
        </h2>
      </div>
      {editor}
    </section>
  );
}
