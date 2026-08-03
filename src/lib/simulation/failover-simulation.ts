import type { Topology } from "../topology";
import { advance, latencyToDuration } from "./animation";
import { transition, type SimulationTransition } from "./effects";

export type FailoverPhase =
  | "idle"
  | "failure"
  | "detecting"
  | "electing"
  | "elected"
  | "recovering"
  | "complete";

export interface QueuedRequest {
  id: string;
  command: string;
  clientLat: number;
  clientLon: number;
}

export type FailoverEventType =
  | "failure"
  | "detect"
  | "election"
  | "elected"
  | "reconnect"
  | "resume";

export interface FailoverEvent {
  time: number;
  label: string;
  type: FailoverEventType;
}

export interface FailoverSimulationState {
  phase: FailoverPhase;
  failedRegionId: string | null;
  newPrimaryId: string | null;
  failureFlashProgress: number;
  arcBreakProgress: number;
  detectionProgress: number;
  electionProgress: number;
  recoveryProgress: number;
  drainingProgress: number;
  queuedRequests: QueuedRequest[];
  requestQueueVisible: boolean;
  events: FailoverEvent[];
  downtimeMs: number;
  detectionTimeMs: number;
  electionTimeMs: number;
  recoveryTimeMs: number;
  originalTopology: Topology | null;
}

export type FailoverSimulationAction =
  | { kind: "kill-primary"; topology: Topology }
  | { kind: "start-detection" }
  | { kind: "start-election" }
  | { kind: "start-recovery" }
  | { kind: "tick"; deltaSeconds: number }
  | { kind: "reset" };

const queuedRequests: QueuedRequest[] = [
  {
    id: "req-0",
    command: 'SET user:1 "online"',
    clientLat: 40.7,
    clientLon: -74,
  },
  {
    id: "req-1",
    command: "INCR counter",
    clientLat: 48.9,
    clientLon: 2.35,
  },
  {
    id: "req-2",
    command: 'SET status "active"',
    clientLat: 37.5,
    clientLon: 127,
  },
];

export function createFailoverSimulationState(): FailoverSimulationState {
  return {
    phase: "idle",
    failedRegionId: null,
    newPrimaryId: null,
    failureFlashProgress: 0,
    arcBreakProgress: 0,
    detectionProgress: 0,
    electionProgress: 0,
    recoveryProgress: 0,
    drainingProgress: 0,
    queuedRequests: [],
    requestQueueVisible: false,
    events: [],
    downtimeMs: 0,
    detectionTimeMs: 800,
    electionTimeMs: 1200,
    recoveryTimeMs: 600,
    originalTopology: null,
  };
}

export function reduceFailoverSimulation(
  state: FailoverSimulationState,
  action: FailoverSimulationAction
): SimulationTransition<FailoverSimulationState> {
  switch (action.kind) {
    case "kill-primary": {
      const { primaryRegion, readRegions } = action.topology;
      if (state.phase !== "idle" || !primaryRegion || readRegions.length === 0) {
        return transition(state);
      }
      return transition(
        {
          ...createFailoverSimulationState(),
          phase: "failure",
          failedRegionId: primaryRegion,
          newPrimaryId: primaryRegion,
          queuedRequests,
          events: [
            { time: 0, label: "Leader node failed!", type: "failure" },
          ],
          originalTopology: {
            primaryRegion,
            readRegions: [...readRegions],
          },
        },
        [{ kind: "sound", sound: "failure" }]
      );
    }
    case "start-detection":
      if (state.phase !== "failure" || state.failureFlashProgress < 1) {
        return transition(state);
      }
      return transition({
        ...state,
        phase: "detecting",
        events: [
          ...state.events,
          { time: 0, label: "Health checks started", type: "detect" },
        ],
      });
    case "start-election":
      if (state.phase !== "detecting" || state.detectionProgress < 1) {
        return transition(state);
      }
      return transition(
        {
          ...state,
          phase: "electing",
          events: [
            ...state.events,
            {
              time: state.detectionTimeMs,
              label: "Failure confirmed by health checks",
              type: "detect",
            },
            {
              time: state.detectionTimeMs,
              label: "Backup replica election started",
              type: "election",
            },
          ],
        },
        [{ kind: "sound", sound: "election" }]
      );
    case "start-recovery":
      if (state.phase !== "elected") return transition(state);
      return transition({
        ...state,
        phase: "recovering",
        events: [
          ...state.events,
          {
            time: state.detectionTimeMs + state.electionTimeMs,
            label: "Replication connections re-establishing",
            type: "reconnect",
          },
          {
            time: state.detectionTimeMs + state.electionTimeMs,
            label: "Queued writes draining to new leader",
            type: "reconnect",
          },
        ],
      });
    case "tick": {
      if (state.phase === "failure") {
        const failureFlashProgress = Math.min(
          state.failureFlashProgress + action.deltaSeconds / 0.5,
          1
        );
        const arcBreakProgress = Math.min(
          state.arcBreakProgress + action.deltaSeconds / 0.6,
          1
        );
        const revealQueue =
          failureFlashProgress >= 1 && !state.requestQueueVisible;
        return transition({
          ...state,
          failureFlashProgress,
          arcBreakProgress,
          requestQueueVisible: state.requestQueueVisible || revealQueue,
          events: revealQueue
            ? [
                ...state.events,
                {
                  time: 0,
                  label: `${state.queuedRequests.length} write requests queued`,
                  type: "failure",
                },
                {
                  time: 0,
                  label: "Read replicas continue serving reads",
                  type: "resume",
                },
              ]
            : state.events,
        });
      }
      if (state.phase === "detecting") {
        const detectionProgress = advance(
          state.detectionProgress,
          action.deltaSeconds,
          state.detectionTimeMs
        );
        return transition({
          ...state,
          detectionProgress,
          downtimeMs: Math.round(detectionProgress * state.detectionTimeMs),
        });
      }
      if (state.phase === "electing") {
        const electionProgress = advance(
          state.electionProgress,
          action.deltaSeconds,
          state.electionTimeMs
        );
        const downtimeMs =
          state.detectionTimeMs +
          Math.round(electionProgress * state.electionTimeMs);
        return electionProgress >= 1
          ? transition(
              {
                ...state,
                phase: "elected",
                electionProgress: 1,
                downtimeMs,
                events: [
                  ...state.events,
                  {
                    time: downtimeMs,
                    label: "Backup replica promoted to leader!",
                    type: "elected",
                  },
                ],
              },
              [{ kind: "sound", sound: "recovery" }]
            )
          : transition({ ...state, electionProgress, downtimeMs });
      }
      if (state.phase !== "recovering") return transition(state);
      const duration = latencyToDuration(state.recoveryTimeMs);
      const recoveryProgress = Math.min(
        state.recoveryProgress + action.deltaSeconds / duration,
        1
      );
      const drainingProgress = Math.min(
        state.drainingProgress + action.deltaSeconds / (duration * 1.2),
        1
      );
      const downtimeMs =
        state.detectionTimeMs +
        state.electionTimeMs +
        Math.round(recoveryProgress * state.recoveryTimeMs);
      const complete = recoveryProgress >= 1 && drainingProgress >= 1;
      return transition({
        ...state,
        phase: complete ? "complete" : "recovering",
        recoveryProgress,
        drainingProgress,
        downtimeMs,
        events: complete
          ? [
              ...state.events,
              {
                time: downtimeMs,
                label: "Leader region fully recovered",
                type: "resume",
              },
            ]
          : state.events,
      });
    }
    case "reset":
      return transition(createFailoverSimulationState());
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
