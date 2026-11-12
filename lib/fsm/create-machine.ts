/**
 * Tiny typed finite-state helper — no external FSM library.
 * Events that are not defined for the current state are no-ops (return same state).
 */

export type TransitionMap<S extends string, E extends string> = {
  [State in S]?: {
    [Event in E]?: S;
  };
};

export type MachineConfig<S extends string, E extends string> = {
  id: string;
  initial: S;
  states: TransitionMap<S, E>;
};

export type Machine<S extends string, E extends string> = MachineConfig<S, E> & {
  transition(state: S, event: E): S;
  can(state: S, event: E): boolean;
};

export function defineMachine<S extends string, E extends string>(
  config: MachineConfig<S, E>,
): Machine<S, E> {
  function can(state: S, event: E): boolean {
    return config.states[state]?.[event] !== undefined;
  }

  function transition(state: S, event: E): S {
    return config.states[state]?.[event] ?? state;
  }

  return {
    ...config,
    can,
    transition,
  };
}

/** Assert a domain lifecycle move; throws if the edge is illegal. */
export function assertTransition<S extends string, E extends string>(
  machine: Machine<S, E>,
  from: S,
  event: E,
): S {
  if (!machine.can(from, event)) {
    throw new Error(
      `[${machine.id}] invalid transition: ${from} --${event}-->`,
    );
  }
  return machine.transition(from, event);
}
