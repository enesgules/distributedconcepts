import { create } from "zustand";
import {
  createConsistencySimulationState,
  reduceConsistencySimulation,
  type ConsistencySimulationState,
} from "@/lib/simulation/consistency-simulation";
import { runSimulationEffects } from "./run-simulation-effects";

interface ConsistencyRaceStore extends ConsistencySimulationState {
  setClientLocation: (lat: number, lon: number) => void;
  setReadDelay: (readDelayMs: number) => void;
  startRace: (
    primaryLatencyMs: number,
    replicationLatencyMs: number,
    readLatencyMs: number
  ) => void;
  startReplicationRace: () => void;
  tick: (deltaSeconds: number) => void;
  reset: () => void;
}

export const useConsistencyRaceStore = create<ConsistencyRaceStore>(
  (set, get) => {
    const apply = (
      action: Parameters<typeof reduceConsistencySimulation>[1]
    ) => {
      const result = reduceConsistencySimulation(get(), action);
      set(result.state);
      runSimulationEffects(result.effects);
    };

    return {
      ...createConsistencySimulationState(),
      setClientLocation: (lat, lon) =>
        apply({ kind: "set-client", location: { lat, lon } }),
      setReadDelay: (readDelayMs) =>
        apply({ kind: "set-read-delay", readDelayMs }),
      startRace: (
        primaryLatencyMs,
        replicationLatencyMs,
        readLatencyMs
      ) =>
        apply({
          kind: "start",
          primaryLatencyMs,
          replicationLatencyMs,
          readLatencyMs,
        }),
      startReplicationRace: () => apply({ kind: "start-race" }),
      tick: (deltaSeconds) => apply({ kind: "tick", deltaSeconds }),
      reset: () => apply({ kind: "reset" }),
    };
  }
);
