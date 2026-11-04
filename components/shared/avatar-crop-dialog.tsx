"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCroppedImageBlob } from "@/lib/profile/crop-image";
import { cn } from "@/lib/utils";

type AvatarCropDialogProps = {
  open: boolean;
  imageSrc: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (file: File) => void;
  pending?: boolean;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
const NUDGE = 8;

function ToolButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted disabled:opacity-40"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function AvatarCropDialog({
  open,
  imageSrc,
  onOpenChange,
  onConfirm,
  pending = false,
}: AvatarCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [exporting, setExporting] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  function resetView() {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  }

  function handleOpenChange(next: boolean) {
    if (pending || exporting) return;
    if (!next) resetView();
    onOpenChange(next);
  }

  function nudge(dx: number, dy: number) {
    setCrop((c) => ({ x: c.x + dx, y: c.y + dy }));
  }

  async function handleSave() {
    if (!imageSrc || !croppedAreaPixels || pending || exporting) return;
    setExporting(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, {
        size: 512,
        quality: 0.92,
        rotation,
      });
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      onConfirm(file);
      resetView();
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  }

  const busy = pending || exporting;

  return (
    <Dialog open={open && Boolean(imageSrc)} onOpenChange={handleOpenChange}>
      <DialogContent
        className="z-[320] flex max-h-[min(94dvh,44rem)] w-[calc(100%-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl"
        overlayClassName="z-[310]"
        showCloseButton={!busy}
      >
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4 pr-12">
          <DialogTitle>Edit photo</DialogTitle>
          <DialogDescription>
            Drag the image to move it. Zoom, rotate, then save. The circle is
            what others will see.
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-56 w-full shrink-0 bg-black sm:h-72">
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              cropShape="round"
              showGrid={false}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
              classes={{
                containerClassName: "rounded-none h-full",
                mediaClassName: "max-w-none",
              }}
            />
          ) : null}
        </div>

        <div className="min-h-0 shrink-0 space-y-4 overflow-y-auto border-t border-border px-5 py-4">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Move
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <ToolButton
                label="Move left"
                disabled={busy}
                onClick={() => nudge(-NUDGE, 0)}
              >
                <ArrowLeft className="size-4" aria-hidden />
              </ToolButton>
              <ToolButton
                label="Move up"
                disabled={busy}
                onClick={() => nudge(0, -NUDGE)}
              >
                <ArrowUp className="size-4" aria-hidden />
              </ToolButton>
              <ToolButton
                label="Move down"
                disabled={busy}
                onClick={() => nudge(0, NUDGE)}
              >
                <ArrowDown className="size-4" aria-hidden />
              </ToolButton>
              <ToolButton
                label="Move right"
                disabled={busy}
                onClick={() => nudge(NUDGE, 0)}
              >
                <ArrowRight className="size-4" aria-hidden />
              </ToolButton>
              <p className="text-xs text-muted-foreground">
                Or drag the photo in the circle
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Zoom · {Math.round(zoom * 100)}%
            </p>
            <div className="flex items-center gap-3">
              <ToolButton
                label="Zoom out"
                disabled={busy || zoom <= MIN_ZOOM}
                onClick={() =>
                  setZoom((z) =>
                    Math.max(MIN_ZOOM, Number((z - ZOOM_STEP).toFixed(2))),
                  )
                }
              >
                <Minus className="size-4" aria-hidden />
              </ToolButton>
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                disabled={busy}
                aria-label="Zoom"
                className={cn(
                  "h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
              <ToolButton
                label="Zoom in"
                disabled={busy || zoom >= MAX_ZOOM}
                onClick={() =>
                  setZoom((z) =>
                    Math.min(MAX_ZOOM, Number((z + ZOOM_STEP).toFixed(2))),
                  )
                }
              >
                <Plus className="size-4" aria-hidden />
              </ToolButton>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Rotate · {((rotation % 360) + 360) % 360}°
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <ToolButton
                label="Rotate left 90°"
                disabled={busy}
                onClick={() => setRotation((r) => r - 90)}
              >
                <RotateCcw className="size-4" aria-hidden />
              </ToolButton>
              <ToolButton
                label="Rotate right 90°"
                disabled={busy}
                onClick={() => setRotation((r) => r + 90)}
              >
                <RotateCw className="size-4" aria-hidden />
              </ToolButton>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={rotation}
                disabled={busy}
                aria-label="Fine rotate"
                className={cn(
                  "h-2 min-w-[8rem] flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-primary",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
                onChange={(e) => setRotation(Number(e.target.value))}
              />
              <ToolButton
                label="Reset move, zoom, and rotation"
                disabled={busy}
                onClick={resetView}
              >
                <span className="text-[10px] font-bold tracking-wide">RST</span>
              </ToolButton>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-background px-5 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
            disabled={busy}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="lg"
            className="w-full sm:w-auto"
            disabled={busy || !croppedAreaPixels}
            onClick={() => void handleSave()}
          >
            {busy ? "Saving…" : "Save photo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
