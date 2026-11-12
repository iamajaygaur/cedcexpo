import { defineMachine } from "@/lib/fsm";
import type { SessionMode } from "@/lib/auth/session-mode";

export type SessionModeEvent = "REMEMBER" | "FORGET";

export const sessionModeMachine = defineMachine<SessionMode, SessionModeEvent>({
  id: "session-mode",
  initial: "ephemeral",
  states: {
    ephemeral: { REMEMBER: "persistent" },
    persistent: { FORGET: "ephemeral" },
  },
});

export function sessionModeFromRemember(remember: boolean): SessionMode {
  return remember ? "persistent" : "ephemeral";
}
