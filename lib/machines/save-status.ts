import { defineMachine } from "@/lib/fsm";

/** Client sync indicator on the evaluation form. */
export type SaveStatus = "idle" | "saving" | "saved" | "unsaved" | "error";

export type SaveStatusEvent =
  | "EDIT"
  | "SAVE"
  | "SUCCESS"
  | "FAIL"
  | "RESET";

export const saveStatusMachine = defineMachine<SaveStatus, SaveStatusEvent>({
  id: "save-status",
  initial: "idle",
  states: {
    idle: { EDIT: "unsaved", SAVE: "saving" },
    unsaved: { EDIT: "unsaved", SAVE: "saving", RESET: "idle" },
    saving: { SUCCESS: "saved", FAIL: "error" },
    saved: { EDIT: "unsaved", SAVE: "saving", RESET: "idle" },
    error: { EDIT: "unsaved", SAVE: "saving", RESET: "idle" },
  },
});
