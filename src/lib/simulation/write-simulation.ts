import type { LatLon } from "../geo-utils";
import { advance } from "./animation";
import {
  transition,
  type SimulationEffect,
  type SimulationTransition,
} from "./effects";

export type WritePhase =
  | "idle"
  | "to-primary"
  | "primary-ack"
  | "replicating"
  | "complete";

export interface ReplicaStatus {
  regionId: string;
  progress: number;
  latencyMs: number;
  arrived: boolean;
}

export interface WriteSimulationState {
  clientLocation: LatLon | null;
  phase: WritePhase;
  primaryProgress: number;
  primaryLatencyMs: number;
  replicaStatuses: ReplicaStatus[];
}

export type WriteSimulationAction =
  | { kind: "set-client"; location: LatLon }
  | {
      kind: "start";
      primaryLatencyMs: number;
      replicas: Array<{ regionId: string; latencyMs: number }>;
    }
  | { kind: "start-replication" }
  | { kind: "tick"; deltaSeconds: number }
  | { kind: "reset" };

export function createWriteSimulationState(
  preserved: Pick<WriteSimulationState, "clientLocation"> = {
    clientLocation: null,
  }
): WriteSimulationState {
  return {
    ...preserved,
    phase: "idle",
    primaryProgress: 0,
    primaryLatencyMs: 0,
    replicaStatuses: [],
  };
}

export function reduceWriteSimulation(
  state: WriteSimulationState,
  action: WriteSimulationAction
): SimulationTransition<WriteSimulationState> {
  switch (action.kind) {
    case "set-client":
      return transition({
        ...createWriteSimulationState(state),
        clientLocation: action.location,
      });
    case "start":
      if (state.phase !== "idle" || !state.clientLocation) {
        return transition(state);
      }
      return transition(
        {
          ...state,
          phase: "to-primary",
          primaryProgress: 0,
          primaryLatencyMs: action.primaryLatencyMs,
          replicaStatuses: action.replicas.map((replica) => ({
            ...replica,
            progress: 0,
            arrived: false,
          })),
        },
        [{ kind: "sound", sound: "packet-send" }]
      );
    case "start-replication":
      if (state.phase !== "primary-ack") return transition(state);
      return transition(
        { ...state, phase: "replicating" },
        [{ kind: "sound", sound: "replicate" }]
      );
    case "tick": {
      if (state.phase === "to-primary") {
        const primaryProgress = advance(
          state.primaryProgress,
          action.deltaSeconds,
          state.primaryLatencyMs
        );
        if (primaryProgress < 1) {
          return transition({ ...state, primaryProgress });
        }
        return transition(
          {
            ...state,
            phase: "primary-ack",
            primaryProgress: 1,
          },
          [{ kind: "sound", sound: "ack" }]
        );
      }

      if (state.phase !== "replicating") return transition(state);
      const effects: SimulationEffect[] = [];
      const replicaStatuses = state.replicaStatuses.map((replica) => {
        if (replica.arrived) return replica;
        const progress = advance(
          replica.progress,
          action.deltaSeconds,
          replica.latencyMs
        );
        if (progress < 1) return { ...replica, progress };
        effects.push({ kind: "sound", sound: "replica-arrive" });
        return { ...replica, progress: 1, arrived: true };
      });
      const complete = replicaStatuses.every((replica) => replica.arrived);
      return transition(
        {
          ...state,
          phase: complete ? "complete" : "replicating",
          replicaStatuses,
        },
        effects
      );
    }
    case "reset":
      return transition(createWriteSimulationState(state));
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
