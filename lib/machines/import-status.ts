import { defineMachine } from "@/lib/fsm";

export type ImportKind = "idle" | "success" | "error" | "partial";

export type ImportStatusEvent =
  | "RESET"
  | "SUCCEED"
  | "FAIL"
  | "PARTIAL";

export const importStatusMachine = defineMachine<ImportKind, ImportStatusEvent>({
  id: "import-status",
  initial: "idle",
  states: {
    idle: { SUCCEED: "success", FAIL: "error", PARTIAL: "partial" },
    success: { RESET: "idle" },
    error: { RESET: "idle", SUCCEED: "success", FAIL: "error", PARTIAL: "partial" },
    partial: { RESET: "idle", SUCCEED: "success", FAIL: "error", PARTIAL: "partial" },
  },
});

export type ImportStatus =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | { kind: "partial"; message: string };

export function importStatusAfter(
  current: ImportStatus,
  event: ImportStatusEvent,
  message = "",
): ImportStatus {
  const next = importStatusMachine.transition(current.kind, event);
  if (next === "idle") return { kind: "idle" };
  return { kind: next, message };
}
