export type SimulationSound =
  | "packet-send"
  | "ack"
  | "replicate"
  | "replica-arrive"
  | "response"
  | "stale"
  | "failure"
  | "election"
  | "recovery";

export interface SimulationEffect {
  kind: "sound";
  sound: SimulationSound;
}

export interface SimulationTransition<State> {
  state: State;
  effects: SimulationEffect[];
}

export function transition<State>(
  state: State,
  effects: SimulationEffect[] = []
): SimulationTransition<State> {
  return { state, effects };
}
