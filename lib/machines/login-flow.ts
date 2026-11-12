import { defineMachine } from "@/lib/fsm";

export type LoginFlowState = "idle" | "submitting" | "success" | "error";

export type LoginFlowEvent = "SUBMIT" | "SUCCEED" | "FAIL" | "RESET";

export const loginFlowMachine = defineMachine<LoginFlowState, LoginFlowEvent>({
  id: "login-flow",
  initial: "idle",
  states: {
    idle: { SUBMIT: "submitting" },
    submitting: { SUCCEED: "success", FAIL: "error" },
    success: { RESET: "idle" },
    error: { RESET: "idle", SUBMIT: "submitting" },
  },
});
