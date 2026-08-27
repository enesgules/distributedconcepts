import type { LatLon } from "../geo-utils";
import { ANIMATION_SPEED, advance } from "./animation";
import { transition, type SimulationEffect, type SimulationTransition } from "./effects";
import { staleReadMarginMs } from "./latency";

export type ConsistencyPhase =
  | "idle"
  | "writing"
  | "write-ack"
  | "racing"
  | "result"
  | "complete";

export interface ConsistencySimulationState {
  clientLocation: LatLon | null;
  phase: ConsistencyPhase;
  readDelay: number;
  writeProgress: number;
  replicationProgress: number;
  readProgress: number;
  readStarted: boolean;
  raceElapsedMs: number;
  resultElapsedSeconds: number;
  primaryLatencyMs: number;
  replicationLatencyMs: number;
  readLatencyMs: number;
  isStale: boolean | null;
}

export type ConsistencySimulationAction =
  | { kind: "set-client"; location: LatLon }
  | { kind: "set-read-delay"; readDelayMs: number }
  | {
      kind: "start";
      primaryLatencyMs: number;
      replicationLatencyMs: number;
      readLatencyMs: number;
    }
  | { kind: "start-race" }
  | { kind: "tick"; deltaSeconds: number }
  | { kind: "reset" };

export function createConsistencySimulationState(
  preserved: Pick<
    ConsistencySimulationState,
    "clientLocation" | "readDelay"
  > = { clientLocation: null, readDelay: 120 }
): ConsistencySimulationState {
  return {
    ...preserved,
    phase: "idle",
    writeProgress: 0,
    replicationProgress: 0,
    readProgress: 0,
    readStarted: false,
    raceElapsedMs: 0,
    resultElapsedSeconds: 0,
    primaryLatencyMs: 0,
    replicationLatencyMs: 0,
    readLatencyMs: 0,
    isStale: null,
  };
}

function resolveRace(
  state: ConsistencySimulationState,
  effects: SimulationEffect[]
): SimulationTransition<ConsistencySimulationState> {
  const isStale =
    staleReadMarginMs(
      state.readDelay,
      state.readLatencyMs,
      state.replicationLatencyMs
    ) < 0;
  effects.push({
    kind: "sound",
    sound: isStale ? "stale" : "replica-arrive",
  });
  return transition(
    {
      ...state,
      phase: "result",
      isStale,
      resultElapsedSeconds: 0,
    },
    effects
  );
}

export function reduceConsistencySimulation(
  state: ConsistencySimulationState,
  action: ConsistencySimulationAction
): SimulationTransition<ConsistencySimulationState> {
  switch (action.kind) {
    case "set-client":
      return transition({
        ...createConsistencySimulationState(state),
        clientLocation: action.location,
      });
    case "set-read-delay":
      return state.phase === "idle" || state.phase === "write-ack"
        ? transition({ ...state, readDelay: Math.max(0, action.readDelayMs) })
        : transition(state);
    case "start":
      if (state.phase !== "idle" || !state.clientLocation) {
        return transition(state);
      }
      return transition(
        {
          ...state,
          phase: "writing",
          writeProgress: 0,
          replicationProgress: 0,
          readProgress: 0,
          readStarted: false,
          raceElapsedMs: 0,
          resultElapsedSeconds: 0,
          primaryLatencyMs: action.primaryLatencyMs,
          replicationLatencyMs: action.replicationLatencyMs,
          readLatencyMs: action.readLatencyMs,
          isStale: null,
        },
        [{ kind: "sound", sound: "packet-send" }]
      );
    case "start-race":
      return state.phase === "write-ack"
        ? transition(
            {
              ...state,
              phase: "racing",
              replicationProgress: 0,
              readProgress: 0,
              readStarted: false,
              raceElapsedMs: 0,
            },
            [{ kind: "sound", sound: "replicate" }]
          )
        : transition(state);
    case "tick": {
      if (state.phase === "writing") {
        const writeProgress = advance(
          state.writeProgress,
          action.deltaSeconds,
          state.primaryLatencyMs
        );
        return writeProgress >= 1
          ? transition(
              { ...state, phase: "write-ack", writeProgress: 1 },
              [{ kind: "sound", sound: "ack" }]
            )
          : transition({ ...state, writeProgress });
      }

      if (state.phase === "result") {
        const resultElapsedSeconds =
          state.resultElapsedSeconds + action.deltaSeconds;
        return resultElapsedSeconds >= 0.6
          ? transition({
              ...state,
              phase: "complete",
              resultElapsedSeconds: 0.6,
            })
          : transition({ ...state, resultElapsedSeconds });
      }

      if (state.phase !== "racing") return transition(state);
      const effects: SimulationEffect[] = [];
      const raceElapsedMs =
        state.raceElapsedMs + action.deltaSeconds / ANIMATION_SPEED;
      const readStarted = state.readStarted || raceElapsedMs >= state.readDelay;
      if (readStarted && !state.readStarted) {
        effects.push({ kind: "sound", sound: "packet-send" });
      }
      const replicationProgress = advance(
        state.replicationProgress,
        action.deltaSeconds,
        state.replicationLatencyMs
      );
      const readDeltaSeconds = state.readStarted
        ? action.deltaSeconds
        : Math.max(0, raceElapsedMs - state.readDelay) * ANIMATION_SPEED;
      const readProgress = readStarted
        ? advance(state.readProgress, readDeltaSeconds, state.readLatencyMs)
        : state.readProgress;
      const nextState = {
        ...state,
        raceElapsedMs,
        readStarted,
        replicationProgress,
        readProgress,
      };

      return readProgress >= 1
        ? resolveRace(nextState, effects)
        : transition(nextState, effects);
    }
    case "reset":
      return transition(createConsistencySimulationState(state));
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
