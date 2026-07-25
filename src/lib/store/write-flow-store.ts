import { create } from "zustand";
import type { LatLon } from "@/lib/geo-utils";

export type AnimationPhase =
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

interface WriteFlowState {
  clientLocation: LatLon | null;
  phase: AnimationPhase;
  primaryProgress: number;
  primaryLatencyMs: number;
  replicaStatuses: ReplicaStatus[];
  command: string;
  response: string | null;
  events: WriteFlowEvent[];

  setClientLocation: (lat: number, lon: number) => void;
  setCommand: (cmd: string) => void;
  startAnimation: (
    primaryLatency: number,
    replicas: Array<{ regionId: string; latencyMs: number }>
  ) => void;
  setPrimaryProgress: (p: number) => void;
  onPrimaryAck: () => void;
  startReplication: () => void;
  setReplicaProgress: (regionId: string, progress: number) => void;
  onReplicaArrive: (regionId: string) => void;
  setPhase: (phase: AnimationPhase) => void;
  addEvent: (event: WriteFlowEvent) => void;
  reset: () => void;
}

export const useWriteFlowStore = create<WriteFlowState>((set, get) => ({
  clientLocation: null,
  phase: "idle",
  primaryProgress: 0,
  primaryLatencyMs: 0,
  replicaStatuses: [],
  command: 'SET mykey "hello"',
  response: null,
  events: [],

  setClientLocation: (lat, lon) => {
    // Reset any in-progress animation before moving the client
    if (get().phase !== "idle") get().reset();
    set({ clientLocation: { lat, lon } });
  },

  setCommand: (cmd) => set({ command: cmd }),

  startAnimation: (primaryLatency, replicas) =>
    set({
      phase: "to-primary",
      primaryProgress: 0,
      primaryLatencyMs: primaryLatency,
      replicaStatuses: replicas.map((r) => ({
        regionId: r.regionId,
        progress: 0,
        latencyMs: r.latencyMs,
        arrived: false,
      })),
      response: null,
      events: [
        {
          time: 0,
          label: `${get().command} sent from client`,
          type: "send",
        },
      ],
    }),

  setPrimaryProgress: (p) => set({ primaryProgress: p }),

  onPrimaryAck: () => {
    const state = get();
    set({
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
    });
  },

  startReplication: () => {
    const state = get();
    if (state.phase !== "primary-ack") return;
    set({
      phase: "replicating",
      events: [
        ...state.events,
        {
          time: state.primaryLatencyMs,
          label: `Replication started to ${state.replicaStatuses.length} replica${state.replicaStatuses.length !== 1 ? "s" : ""}`,
          type: "replicate",
        },
      ],
    });
  },

  setReplicaProgress: (regionId, progress) =>
    set((state) => ({
      replicaStatuses: state.replicaStatuses.map((r) =>
        r.regionId === regionId ? { ...r, progress } : r
      ),
    })),

  onReplicaArrive: (regionId) =>
    set((state) => {
      const replica = state.replicaStatuses.find(
        (r) => r.regionId === regionId
      );
      return {
        replicaStatuses: state.replicaStatuses.map((r) =>
          r.regionId === regionId ? { ...r, arrived: true, progress: 1 } : r
        ),
        events: [
          ...state.events,
          {
            time: state.primaryLatencyMs + (replica?.latencyMs ?? 0),
            label: `${regionId} received data (+${replica?.latencyMs ?? 0}ms)`,
            type: "arrive",
          },
        ],
      };
    }),

  setPhase: (phase) => set({ phase }),

  addEvent: (event) =>
    set((state) => ({ events: [...state.events, event] })),

  reset: () =>
    set({
      phase: "idle",
      primaryProgress: 0,
      primaryLatencyMs: 0,
      replicaStatuses: [],
      response: null,
      events: [],
    }),
}));
