import { create } from "zustand";
import {
  EMPTY_TOPOLOGY,
  prepareTopology,
  transitionTopology,
  type Topology,
} from "@/lib/topology";

interface DatabaseState extends Topology {
  setPrimary: (regionId: string) => void;
  addReadRegion: (regionId: string) => void;
  removeReadRegion: (regionId: string) => void;
  toggleRegion: (regionId: string) => void;
  prepare: () => void;
  restore: (topology: Topology) => void;
  reset: () => void;
}

export const useDatabaseStore = create<DatabaseState>((set) => ({
  ...EMPTY_TOPOLOGY,

  setPrimary: (regionId) =>
    set((state) =>
      transitionTopology(state, { kind: "set-primary", regionId })
    ),

  addReadRegion: (regionId) =>
    set((state) =>
      transitionTopology(state, { kind: "add-replica", regionId })
    ),

  removeReadRegion: (regionId) =>
    set((state) =>
      transitionTopology(state, { kind: "remove-replica", regionId })
    ),

  toggleRegion: (regionId) =>
    set((state) =>
      transitionTopology(state, { kind: "toggle-region", regionId })
    ),

  prepare: () => set((state) => prepareTopology(state)),

  restore: (topology) =>
    set((state) => transitionTopology(state, { kind: "restore", topology })),

  reset: () => set((state) => transitionTopology(state, { kind: "reset" })),
}));
