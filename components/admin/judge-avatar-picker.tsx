"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";

import { AvatarCropDialog } from "@/components/shared/avatar-crop-dialog";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";

type JudgeAvatarPickerProps = {
  fullName: string;
  /** Cropped file held until Create Judge submits (optional). */
  file: File | null;
  onChange: (file: File | null) => void;
  className?: string;
};

/**
 * Optional photo while creating a judge. File is attached on Create Judge;
 * skip to keep initials (same as Excel import).
 */
export function JudgeAvatarPicker({
  fullName,
  file,
  onChange,
  className,
}: JudgeAvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  function openPicker() {
    inputRef.current?.click();
  }

  function clearCrop() {
    setCropOpen(false);
    setCropSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <>
      <section className={cn("dash-form-panel", className)}>
        <div className="mb-4 flex items-center gap-2">
          <Camera className="size-4 text-muted-foreground" aria-hidden />
          <h2 className="text-sm font-bold tracking-wide text-foreground uppercase">
            Profile photo
          </h2>
          <span className="text-xs font-medium text-muted-foreground normal-case">
            Optional
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={openPicker}
            className="group relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={file ? "Change profile photo" : "Add profile photo"}
          >
            <UserAvatar
              name={fullName || "Judge"}
              src={previewUrl}
              size="xl"
              className="bg-muted text-muted-foreground ring-1 ring-border"
            />
            <span
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              aria-hidden
            >
              <Camera className="size-5" />
            </span>
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {file ? "Photo ready" : "No photo yet"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Crop and zoom before create. Skip to show initials (same as Excel
              import). Judges can add a photo later from their login.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <button
                type="button"
                onClick={openPicker}
                className="text-sm font-semibold text-primary hover:underline"
              >
                {file ? "Change photo" : "Upload photo"}
              </button>
              {file ? (
                <button
                  type="button"
                  onClick={() => onChange(null)}
                  className="text-sm font-medium text-muted-foreground hover:text-destructive hover:underline"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const next = e.target.files?.[0] ?? null;
            if (!next) return;
            if (cropSrc) URL.revokeObjectURL(cropSrc);
            setCropSrc(URL.createObjectURL(next));
            setCropOpen(true);
            e.target.value = "";
          }}
        />
      </section>

      <AvatarCropDialog
        open={cropOpen}
        imageSrc={cropSrc}
        onOpenChange={(open) => {
          if (!open) clearCrop();
          else setCropOpen(true);
        }}
        onConfirm={(cropped) => {
          onChange(cropped);
          clearCrop();
        }}
      />
    </>
  );
}
