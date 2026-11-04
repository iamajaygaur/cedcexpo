"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, Loader2 } from "lucide-react";

import { AvatarCropDialog } from "@/components/shared/avatar-crop-dialog";
import { showAppToast } from "@/components/shared/app-toast";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { ActionResult } from "@/lib/admin/action-result";
import { cn } from "@/lib/utils";

type AvatarPhotoEditorProps = {
  fullName: string;
  avatarUrl: string | null;
  email?: string;
  /** Extra FormData fields (e.g. judge_id). */
  extraFields?: Record<string, string>;
  uploadAction: (
    prev: ActionResult,
    formData: FormData,
  ) => Promise<ActionResult>;
  removeAction: (
    prev: ActionResult,
    formData: FormData,
  ) => Promise<ActionResult>;
  onUpdated?: () => void;
  compact?: boolean;
  className?: string;
};

/**
 * Profile photo control with LinkedIn-style crop: pick → drag/zoom → save.
 */
export function AvatarPhotoEditor({
  fullName,
  avatarUrl,
  email,
  extraFields,
  uploadAction,
  removeAction,
  onUpdated,
  compact = false,
  className,
}: AvatarPhotoEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  function openPicker() {
    if (pending) return;
    inputRef.current?.click();
  }

  function clearCropPreview() {
    setCropOpen(false);
    setCropSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (inputRef.current) inputRef.current.value = "";
  }

  function run(
    action: (
      prev: ActionResult,
      formData: FormData,
    ) => Promise<ActionResult>,
    formData: FormData,
  ) {
    startTransition(async () => {
      const result = await action({ ok: true }, formData);
      if (result.ok) {
        showAppToast({
          tone: "success",
          title: result.message ?? "Photo updated",
        });
        clearCropPreview();
        onUpdated?.();
      } else {
        showAppToast({
          tone: "error",
          title: result.message ?? "Could not update photo",
        });
      }
    });
  }

  function onFileSelected(file: File | null) {
    if (!file) return;
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setCropOpen(true);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onCropConfirm(file: File) {
    const formData = new FormData();
    formData.set("avatar", file);
    if (extraFields) {
      for (const [key, value] of Object.entries(extraFields)) {
        formData.set(key, value);
      }
    }
    run(uploadAction, formData);
  }

  function onRemove() {
    if (pending || !avatarUrl) return;
    const formData = new FormData();
    if (extraFields) {
      for (const [key, value] of Object.entries(extraFields)) {
        formData.set(key, value);
      }
    }
    run(removeAction, formData);
  }

  return (
    <>
      <div className={cn("flex items-center gap-4", className)}>
        <button
          type="button"
          onClick={openPicker}
          disabled={pending}
          className={cn(
            "group relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            pending && "cursor-wait opacity-80",
          )}
          aria-label={avatarUrl ? "Change profile photo" : "Add profile photo"}
        >
          <UserAvatar
            name={fullName}
            src={avatarUrl}
            size={compact ? "lg" : "xl"}
            className="bg-muted text-muted-foreground ring-1 ring-border"
          />
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity",
              "group-hover:opacity-100 group-focus-visible:opacity-100",
              pending && "opacity-100",
            )}
            aria-hidden
          >
            {pending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Camera className="size-5" />
            )}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          {!compact ? (
            <>
              <p className="truncate text-sm font-semibold text-foreground">
                {fullName || "Your profile"}
              </p>
              {email ? (
                <p className="truncate text-xs text-muted-foreground">{email}</p>
              ) : null}
            </>
          ) : (
            <p className="text-sm font-semibold text-foreground">Profile photo</p>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">
            {pending
              ? "Saving…"
              : "Crop and zoom before saving · JPG, PNG, WebP, or GIF · max 2 MB"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="button"
              onClick={openPicker}
              disabled={pending}
              className="text-sm font-semibold text-primary hover:underline disabled:opacity-50"
            >
              {avatarUrl ? "Change photo" : "Upload photo"}
            </button>
            {avatarUrl ? (
              <button
                type="button"
                onClick={onRemove}
                disabled={pending}
                className="text-sm font-medium text-muted-foreground hover:text-destructive hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
        />
      </div>

      <AvatarCropDialog
        open={cropOpen}
        imageSrc={cropSrc}
        pending={pending}
        onOpenChange={(open) => {
          if (!open) clearCropPreview();
          else setCropOpen(true);
        }}
        onConfirm={onCropConfirm}
      />
    </>
  );
}
