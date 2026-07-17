import { create } from "zustand";
import { useDatabaseStore } from "./database-store";

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

export type FailoverEventType = "failure" | "detect" | "election" | "elected" | "reconnect" | "resume";

export interface FailoverEvent {
  time: number;
  label: string;
  type: FailoverEventType;
}

interface FailoverData {
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

  originalPrimaryId: string | null;
  originalReadRegions: string[];
}

interface FailoverState extends FailoverData {
  killPrimary: () => void;
  setPhase: (phase: FailoverPhase) => void;
  setFailureFlashProgress: (p: number) => void;
  setArcBreakProgress: (p: number) => void;
  setDetectionProgress: (p: number) => void;
  setElectionProgress: (p: number) => void;
  onElectionComplete: () => void;
  setRecoveryProgress: (p: number) => void;
  setDrainingProgress: (p: number) => void;
  setRequestQueueVisible: (v: boolean) => void;
  addEvent: (event: FailoverEvent) => void;
  setDowntime: (ms: number) => void;
  reset: () => void;
}

const initialState: FailoverData = {
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
  originalPrimaryId: null,
  originalReadRegions: [],
};

export const useFailoverStore = create<FailoverState>((set, get) => ({
  ...initialState,

  killPrimary: () => {
    const { primaryRegion, readRegions } = useDatabaseStore.getState();
    if (!primaryRegion || readRegions.length === 0) return;

    // Generate queued requests at client locations (cities without database regions)
    const requests: QueuedRequest[] = [
      { id: "req-0", command: 'SET user:1 "online"', clientLat: 40.7, clientLon: -74.0 },   // New York
      { id: "req-1", command: "INCR counter", clientLat: 48.9, clientLon: 2.35 },            // Paris
      { id: "req-2", command: 'SET status "active"', clientLat: 37.5, clientLon: 127.0 },    // Seoul
    ];

    set({
      ...initialState,
      phase: "failure",
      failedRegionId: primaryRegion,
      // Leader election happens WITHIN the same region — the new primary
      // stays in the same geographic location.
      newPrimaryId: primaryRegion,
      queuedRequests: requests,
      events: [{ time: 0, label: "Primary node failed!", type: "failure" }],
      originalPrimaryId: primaryRegion,
      originalReadRegions: [...readRegions],
    });
  },

  setPhase: (phase) => set({ phase }),
  setFailureFlashProgress: (p) => set({ failureFlashProgress: p }),
  setArcBreakProgress: (p) => set({ arcBreakProgress: p }),
  setDetectionProgress: (p) => set({ detectionProgress: p }),
  setElectionProgress: (p) => set({ electionProgress: p }),

  onElectionComplete: () => {
    const state = get();
    set({
      events: [
        ...state.events,
        {
          time: state.detectionTimeMs + state.electionTimeMs,
          label: `Backup replica promoted to leader!`,
          type: "elected",
        },
      ],
    });
  },

  setRecoveryProgress: (p) => set({ recoveryProgress: p }),
  setDrainingProgress: (p) => set({ drainingProgress: p }),
  setRequestQueueVisible: (v) => set({ requestQueueVisible: v }),

  addEvent: (event) =>
    set((state) => ({ events: [...state.events, event] })),

  setDowntime: (ms) => set({ downtimeMs: ms }),

  reset: () => {
    const state = get();
    // Restore original database state in a single update
    if (state.originalPrimaryId) {
      useDatabaseStore.setState({
        primaryRegion: state.originalPrimaryId,
        readRegions: [...state.originalReadRegions],
      });
    }
    set({ ...initialState });
  },
}));
