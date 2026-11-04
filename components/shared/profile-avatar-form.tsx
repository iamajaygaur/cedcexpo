"use client";

import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";

import { AvatarPhotoEditor } from "@/components/shared/avatar-photo-editor";
import {
  removeOwnAvatarAction,
  uploadOwnAvatarAction,
} from "@/lib/profile/actions/avatar";

type ProfileAvatarFormProps = {
  fullName: string;
  avatarUrl: string | null;
  email?: string;
};

export function ProfileAvatarForm({
  fullName,
  avatarUrl,
  email,
}: ProfileAvatarFormProps) {
  const router = useRouter();

  return (
    <section className="h-full dash-form-panel">
      <div className="mb-4 flex items-center gap-2">
        <Camera className="size-4 text-muted-foreground" aria-hidden />
        <h2 className="text-lg font-semibold">Profile photo</h2>
      </div>
      <AvatarPhotoEditor
        fullName={fullName}
        email={email}
        avatarUrl={avatarUrl}
        uploadAction={uploadOwnAvatarAction}
        removeAction={removeOwnAvatarAction}
        onUpdated={() => router.refresh()}
      />
    </section>
  );
}
