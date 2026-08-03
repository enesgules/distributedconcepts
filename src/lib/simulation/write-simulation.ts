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

export interface WriteFlowEvent {
  time: number;
  label: string;
  type: "send" | "ack" | "replicate" | "arrive";
}

export interface WriteSimulationState {
  clientLocation: LatLon | null;
  phase: WritePhase;
  primaryProgress: number;
  primaryLatencyMs: number;
  replicaStatuses: ReplicaStatus[];
  command: string;
  response: string | null;
  events: WriteFlowEvent[];
}

export type WriteSimulationAction =
  | { kind: "set-client"; location: LatLon }
  | { kind: "set-command"; command: string }
  | {
      kind: "start";
      primaryLatencyMs: number;
      replicas: Array<{ regionId: string; latencyMs: number }>;
    }
  | { kind: "start-replication" }
  | { kind: "tick"; deltaSeconds: number }
  | { kind: "reset" };

export function createWriteSimulationState(
  preserved: Pick<WriteSimulationState, "clientLocation" | "command"> = {
    clientLocation: null,
    command: 'SET mykey "hello"',
  }
): WriteSimulationState {
  return {
    ...preserved,
    phase: "idle",
    primaryProgress: 0,
    primaryLatencyMs: 0,
    replicaStatuses: [],
    response: null,
    events: [],
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
          phase: "to-primary",
          primaryProgress: 0,
          primaryLatencyMs: action.primaryLatencyMs,
          replicaStatuses: action.replicas.map((replica) => ({
            ...replica,
            progress: 0,
            arrived: false,
          })),
          response: null,
          events: [
            {
              time: 0,
              label: `${state.command} sent from client`,
              type: "send",
            },
          ],
        },
        [{ kind: "sound", sound: "packet-send" }]
      );
    case "start-replication":
      if (state.phase !== "primary-ack") return transition(state);
      return transition(
        {
          ...state,
          phase: "replicating",
          events: [
            ...state.events,
            {
              time: state.primaryLatencyMs,
              label: `Replication started to ${state.replicaStatuses.length} replica${state.replicaStatuses.length === 1 ? "" : "s"}`,
              type: "replicate",
            },
          ],
        },
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
            response: "OK",
            events: [
              ...state.events,
              {
                time: state.primaryLatencyMs,
                label: "Leader confirmed: OK",
                type: "ack",
              },
            ],
          },
          [{ kind: "sound", sound: "ack" }]
        );
      }

      if (state.phase !== "replicating") return transition(state);
      const effects: SimulationEffect[] = [];
      const events = [...state.events];
      const replicaStatuses = state.replicaStatuses.map((replica) => {
        if (replica.arrived) return replica;
        const progress = advance(
          replica.progress,
          action.deltaSeconds,
          replica.latencyMs
        );
        if (progress < 1) return { ...replica, progress };
        effects.push({ kind: "sound", sound: "replica-arrive" });
        events.push({
          time: state.primaryLatencyMs + replica.latencyMs,
          label: `${replica.regionId} received data (+${replica.latencyMs}ms)`,
          type: "arrive",
        });
        return { ...replica, progress: 1, arrived: true };
      });
      const complete = replicaStatuses.every((replica) => replica.arrived);
      return transition(
        {
          ...state,
          phase: complete ? "complete" : "replicating",
          replicaStatuses,
          events,
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
