import { defineMachine } from "@/lib/fsm";

/** Judge password-help marker lifecycle (notes field). */
export type PasswordHelpState = "none" | "requested" | "cleared";

export type PasswordHelpEvent = "REQUEST" | "ADMIN_RESET" | "CLEAR";

export const passwordHelpMachine = defineMachine<
  PasswordHelpState,
  PasswordHelpEvent
>({
  id: "password-help",
  initial: "none",
  states: {
    none: { REQUEST: "requested" },
    requested: { ADMIN_RESET: "cleared", CLEAR: "none" },
    cleared: { REQUEST: "requested" },
  },
});
