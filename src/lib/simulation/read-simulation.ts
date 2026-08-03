import type { LatLon } from "../geo-utils";
import { advance } from "./animation";
import { transition, type SimulationTransition } from "./effects";

export type ReadPhase =
  | "idle"
  | "fetching"
  | "arriving"
  | "responding"
  | "complete";

export interface ReadSimulationState {
  clientLocation: LatLon | null;
  phase: ReadPhase;
  fetchProgress: number;
  responseProgress: number;
  nearestRegionId: string | null;
  nearestLatencyMs: number;
  primaryLatencyMs: number;
  command: string;
  response: string | null;
}

export type ReadSimulationAction =
  | { kind: "set-client"; location: LatLon }
  | { kind: "set-command"; command: string }
  | {
      kind: "start";
      nearestRegionId: string;
      nearestLatencyMs: number;
      primaryLatencyMs: number;
    }
  | { kind: "return-response" }
  | { kind: "tick"; deltaSeconds: number }
  | { kind: "reset" };

export function createReadSimulationState(
  preserved: Pick<ReadSimulationState, "clientLocation" | "command"> = {
    clientLocation: null,
    command: "GET mykey",
  }
): ReadSimulationState {
  return {
    ...preserved,
    phase: "idle",
    fetchProgress: 0,
    responseProgress: 0,
    nearestRegionId: null,
    nearestLatencyMs: 0,
    primaryLatencyMs: 0,
    response: null,
  };
}

export function reduceReadSimulation(
  state: ReadSimulationState,
  action: ReadSimulationAction
): SimulationTransition<ReadSimulationState> {
  switch (action.kind) {
    case "set-client":
      return transition({
        ...createReadSimulationState(state),
        clientLocation: action.location,
      });
    case "set-command":
      return state.phase === "idle"
        ? transition({ ...state, command: action.command })
        : transition(state);
    case "start":
      if (state.phase !== "idle" || !state.clientLocation) {
        return transition(state);
      }
      return transition(
        {
          ...state,
          phase: "fetching",
          fetchProgress: 0,
          responseProgress: 0,
          nearestRegionId: action.nearestRegionId,
          nearestLatencyMs: action.nearestLatencyMs,
          primaryLatencyMs: action.primaryLatencyMs,
          response: null,
        },
        [{ kind: "sound", sound: "packet-send" }]
      );
    case "return-response":
      return state.phase === "arriving"
        ? transition({ ...state, phase: "responding" })
        : transition(state);
    case "tick": {
      if (state.phase === "fetching") {
        const fetchProgress = advance(
          state.fetchProgress,
          action.deltaSeconds,
          state.nearestLatencyMs
        );
        return fetchProgress >= 1
          ? transition(
              { ...state, phase: "arriving", fetchProgress: 1 },
              [{ kind: "sound", sound: "ack" }]
            )
          : transition({ ...state, fetchProgress });
      }
      if (state.phase === "responding") {
        const responseProgress = advance(
          state.responseProgress,
          action.deltaSeconds,
          state.nearestLatencyMs
        );
        return responseProgress >= 1
          ? transition(
              {
                ...state,
                phase: "complete",
                responseProgress: 1,
                response: '"hello"',
              },
              [{ kind: "sound", sound: "response" }]
            )
          : transition({ ...state, responseProgress });
      }
      return transition(state);
    }
    case "reset":
      return transition(createReadSimulationState(state));
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
