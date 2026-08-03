import { create } from "zustand";
import {
  createFailoverSimulationState,
  reduceFailoverSimulation,
  type FailoverSimulationState,
} from "@/lib/simulation/failover-simulation";
import { useDatabaseStore } from "./database-store";
import { runSimulationEffects } from "./run-simulation-effects";

export type {
  FailoverEvent,
  FailoverEventType,
  FailoverPhase,
  QueuedRequest,
} from "@/lib/simulation/failover-simulation";

interface FailoverStore extends FailoverSimulationState {
  killPrimary: () => void;
  startDetection: () => void;
  startElection: () => void;
  startRecovery: () => void;
  tick: (deltaSeconds: number) => void;
  replay: () => void;
  reset: () => void;
}

export const useFailoverStore = create<FailoverStore>((set, get) => {
  const apply = (action: Parameters<typeof reduceFailoverSimulation>[1]) => {
    const result = reduceFailoverSimulation(get(), action);
    set(result.state);
    runSimulationEffects(result.effects);
  };

  return {
    ...createFailoverSimulationState(),
    killPrimary: () => {
      const { primaryRegion, readRegions } = useDatabaseStore.getState();
      apply({
        kind: "kill-primary",
        topology: { primaryRegion, readRegions },
      });
    },
    startDetection: () => apply({ kind: "start-detection" }),
    startElection: () => apply({ kind: "start-election" }),
    startRecovery: () => apply({ kind: "start-recovery" }),
    tick: (deltaSeconds) => apply({ kind: "tick", deltaSeconds }),
    replay: () => {
      const { originalTopology } = get();
      if (originalTopology) {
        useDatabaseStore.getState().restore(originalTopology);
      }
      apply({ kind: "reset" });
    },
    reset: () => apply({ kind: "reset" }),
  };
});
