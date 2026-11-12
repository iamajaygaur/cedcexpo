"use client";

import { useCallback, useReducer } from "react";

import type { Machine } from "@/lib/fsm/create-machine";

export function useMachine<S extends string, E extends string>(
  machine: Machine<S, E>,
  initialState: S = machine.initial,
) {
  const [state, dispatchEvent] = useReducer(
    (current: S, event: E) => machine.transition(current, event),
    initialState,
  );

  const send = useCallback((event: E) => {
    dispatchEvent(event);
  }, []);

  const can = useCallback(
    (event: E) => machine.can(state, event),
    [machine, state],
  );

  return { state, send, can } as const;
}
