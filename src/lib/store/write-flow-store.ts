import { create } from "zustand";
import {
  createWriteSimulationState,
  reduceWriteSimulation,
  type WriteSimulationState,
} from "@/lib/simulation/write-simulation";
import { runSimulationEffects } from "./run-simulation-effects";

interface WriteFlowStore extends WriteSimulationState {
  setClientLocation: (lat: number, lon: number) => void;
  setCommand: (command: string) => void;
  startAnimation: (
    primaryLatencyMs: number,
    replicas: Array<{ regionId: string; latencyMs: number }>
  ) => void;
  startReplication: () => void;
  tick: (deltaSeconds: number) => void;
  reset: () => void;
}

export const useWriteFlowStore = create<WriteFlowStore>((set, get) => {
  const apply = (
    action: Parameters<typeof reduceWriteSimulation>[1]
  ) => {
    const result = reduceWriteSimulation(get(), action);
    set(result.state);
    runSimulationEffects(result.effects);
  };

  return {
    ...createWriteSimulationState(),
    setClientLocation: (lat, lon) =>
      apply({ kind: "set-client", location: { lat, lon } }),
    setCommand: (command) => apply({ kind: "set-command", command }),
    startAnimation: (primaryLatencyMs, replicas) =>
      apply({ kind: "start", primaryLatencyMs, replicas }),
    startReplication: () => apply({ kind: "start-replication" }),
    tick: (deltaSeconds) => apply({ kind: "tick", deltaSeconds }),
    reset: () => apply({ kind: "reset" }),
  };
});
