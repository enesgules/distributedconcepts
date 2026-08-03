import { create } from "zustand";
import {
  createReadSimulationState,
  reduceReadSimulation,
  type ReadSimulationState,
} from "@/lib/simulation/read-simulation";
import { runSimulationEffects } from "./run-simulation-effects";

interface ReadFlowStore extends ReadSimulationState {
  setClientLocation: (lat: number, lon: number) => void;
  setCommand: (command: string) => void;
  startRead: (
    nearestRegionId: string,
    nearestLatencyMs: number,
    primaryLatencyMs: number
  ) => void;
  startResponse: () => void;
  tick: (deltaSeconds: number) => void;
  reset: () => void;
}

export const useReadFlowStore = create<ReadFlowStore>((set, get) => {
  const apply = (action: Parameters<typeof reduceReadSimulation>[1]) => {
    const result = reduceReadSimulation(get(), action);
    set(result.state);
    runSimulationEffects(result.effects);
  };

  return {
    ...createReadSimulationState(),
    setClientLocation: (lat, lon) =>
      apply({ kind: "set-client", location: { lat, lon } }),
    setCommand: (command) => apply({ kind: "set-command", command }),
    startRead: (nearestRegionId, nearestLatencyMs, primaryLatencyMs) =>
      apply({
        kind: "start",
        nearestRegionId,
        nearestLatencyMs,
        primaryLatencyMs,
      }),
    startResponse: () => apply({ kind: "return-response" }),
    tick: (deltaSeconds) => apply({ kind: "tick", deltaSeconds }),
    reset: () => apply({ kind: "reset" }),
  };
});
