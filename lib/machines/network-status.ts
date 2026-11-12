import { defineMachine } from "@/lib/fsm";

export type NetworkStatusState = "online" | "slow" | "offline";

export type NetworkStatusEvent =
  | "ONLINE"
  | "SLOW"
  | "OFFLINE";

export const networkStatusMachine = defineMachine<
  NetworkStatusState,
  NetworkStatusEvent
>({
  id: "network-status",
  initial: "online",
  states: {
    online: { SLOW: "slow", OFFLINE: "offline" },
    slow: { ONLINE: "online", OFFLINE: "offline", SLOW: "slow" },
    offline: { ONLINE: "online", SLOW: "slow" },
  },
});

export function networkStatusFromFlags(
  online: boolean,
  slow: boolean,
): NetworkStatusState {
  if (!online) return "offline";
  if (slow) return "slow";
  return "online";
}
