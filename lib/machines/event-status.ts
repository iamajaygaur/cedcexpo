import { defineMachine } from "@/lib/fsm";
import type { EventStatus } from "@/types/database";

export type EventStatusEvent =
  | "ACTIVATE"
  | "PAUSE"
  | "COMPLETE"
  | "ARCHIVE"
  | "REOPEN_DRAFT"
  | "REACTIVATE";

/**
 * Expo lifecycle. Illegal jumps (e.g. archived → active) are rejected by
 * `can` / `assertTransition`.
 */
export const eventStatusMachine = defineMachine<EventStatus, EventStatusEvent>({
  id: "event-status",
  initial: "draft",
  states: {
    draft: { ACTIVATE: "active" },
    active: {
      PAUSE: "draft",
      COMPLETE: "completed",
      ARCHIVE: "archived",
    },
    completed: { ARCHIVE: "archived", REACTIVATE: "active" },
    archived: { REOPEN_DRAFT: "draft" },
  },
});

/** Map a target status to the event that reaches it from `from`, if any. */
export function eventStatusEventForTarget(
  from: EventStatus,
  to: EventStatus,
): EventStatusEvent | null {
  if (from === to) return null;
  const events: EventStatusEvent[] = [
    "ACTIVATE",
    "PAUSE",
    "COMPLETE",
    "ARCHIVE",
    "REOPEN_DRAFT",
    "REACTIVATE",
  ];
  for (const event of events) {
    if (eventStatusMachine.transition(from, event) === to) return event;
  }
  return null;
}

export function canChangeEventStatus(from: EventStatus, to: EventStatus): boolean {
  if (from === to) return true;
  return eventStatusEventForTarget(from, to) !== null;
}
