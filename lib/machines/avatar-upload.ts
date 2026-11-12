import { defineMachine } from "@/lib/fsm";

export type AvatarUploadState =
  | "idle"
  | "cropping"
  | "exporting"
  | "uploading"
  | "error";

export type AvatarUploadEvent =
  | "PICK"
  | "CONFIRM_CROP"
  | "EXPORT_DONE"
  | "UPLOAD_DONE"
  | "FAIL"
  | "CANCEL"
  | "RESET";

export const avatarUploadMachine = defineMachine<
  AvatarUploadState,
  AvatarUploadEvent
>({
  id: "avatar-upload",
  initial: "idle",
  states: {
    idle: { PICK: "cropping" },
    cropping: {
      CONFIRM_CROP: "exporting",
      CANCEL: "idle",
      FAIL: "error",
    },
    exporting: {
      EXPORT_DONE: "uploading",
      FAIL: "error",
      CANCEL: "idle",
    },
    uploading: {
      UPLOAD_DONE: "idle",
      FAIL: "error",
    },
    error: { RESET: "idle", PICK: "cropping" },
  },
});
