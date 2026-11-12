import { defineMachine } from "@/lib/fsm";

/** Idle timeout guard: active → warn → logout. */
export type IdleSessionState = "active" | "warning" | "logging_out";

export type IdleSessionEvent =
  | "ACTIVITY"
  | "WARN"
  | "TIMEOUT"
  | "STAY"
  | "SIGN_OUT";

export const idleSessionMachine = defineMachine<
  IdleSessionState,
  IdleSessionEvent
>({
  id: "idle-session",
  initial: "active",
  states: {
    active: {
      WARN: "warning",
      TIMEOUT: "logging_out",
      SIGN_OUT: "logging_out",
      ACTIVITY: "active",
    },
    warning: {
      STAY: "active",
      TIMEOUT: "logging_out",
      SIGN_OUT: "logging_out",
    },
    logging_out: {},
  },
});
