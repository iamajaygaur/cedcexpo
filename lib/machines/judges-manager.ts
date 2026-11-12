import { defineMachine } from "@/lib/fsm";

export type JudgesScreenMode = "list" | "create" | "edit";

export type JudgesScreenEvent =
  | "CREATE"
  | "EDIT"
  | "BACK"
  | "SAVED";

export const judgesScreenMachine = defineMachine<
  JudgesScreenMode,
  JudgesScreenEvent
>({
  id: "judges-screen",
  initial: "list",
  states: {
    list: { CREATE: "create", EDIT: "edit" },
    create: { BACK: "list", SAVED: "list" },
    edit: { BACK: "list", SAVED: "list" },
  },
});

export type JudgesViewMode = "kanban" | "matrix";

export type JudgesViewEvent = "SHOW_KANBAN" | "SHOW_MATRIX";

export const judgesViewMachine = defineMachine<JudgesViewMode, JudgesViewEvent>({
  id: "judges-view",
  initial: "kanban",
  states: {
    kanban: { SHOW_MATRIX: "matrix" },
    matrix: { SHOW_KANBAN: "kanban" },
  },
});

export type JudgesStatusFilter = "all" | "active" | "inactive";
