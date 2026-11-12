import { defineMachine } from "@/lib/fsm";

/**
 * Generic open/closed dialog machine used by delete/password/detail overlays.
 * Entity identity stays outside the machine (nullable row id).
 */
export type DialogState = "closed" | "open";

export type DialogEvent = "OPEN" | "CLOSE";

export const dialogMachine = defineMachine<DialogState, DialogEvent>({
  id: "dialog",
  initial: "closed",
  states: {
    closed: { OPEN: "open" },
    open: { CLOSE: "closed" },
  },
});
