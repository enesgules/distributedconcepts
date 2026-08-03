import { getRegionById, regions, type Provider } from "./regions";

export interface Topology {
  primaryRegion: string | null;
  readRegions: string[];
}

export type TopologyAction =
  | { kind: "set-primary"; regionId: string }
  | { kind: "add-replica"; regionId: string }
  | { kind: "remove-replica"; regionId: string }
  | { kind: "toggle-region"; regionId: string }
  | { kind: "restore"; topology: Topology }
  | { kind: "reset" };

export const EMPTY_TOPOLOGY: Topology = {
  primaryRegion: null,
  readRegions: [],
};

function validReplicaIds(primaryRegion: string, candidates: readonly string[]) {
  const primary = getRegionById(primaryRegion);
  if (!primary) return [];

  const seen = new Set<string>();
  return candidates.filter((candidateId) => {
    if (seen.has(candidateId) || candidateId === primaryRegion) return false;
    const candidate = getRegionById(candidateId);
    if (!candidate || candidate.provider !== primary.provider) return false;
    seen.add(candidateId);
    return true;
  });
}

export function normalizeTopology(topology: Topology): Topology {
  if (!topology.primaryRegion || !getRegionById(topology.primaryRegion)) {
    return { ...EMPTY_TOPOLOGY };
  }

  return {
    primaryRegion: topology.primaryRegion,
    readRegions: validReplicaIds(topology.primaryRegion, topology.readRegions),
  };
}

export function transitionTopology(
  topology: Topology,
  action: TopologyAction
): Topology {
  const current = normalizeTopology(topology);

  switch (action.kind) {
    case "set-primary": {
      if (!getRegionById(action.regionId)) return current;
      return normalizeTopology({
        primaryRegion: action.regionId,
        readRegions: current.readRegions,
      });
    }
    case "add-replica": {
      if (!current.primaryRegion) return current;
      return normalizeTopology({
        ...current,
        readRegions: [...current.readRegions, action.regionId],
      });
    }
    case "remove-replica":
      return {
        ...current,
        readRegions: current.readRegions.filter(
          (regionId) => regionId !== action.regionId
        ),
      };
    case "toggle-region": {
      if (!current.primaryRegion) {
        return transitionTopology(current, {
          kind: "set-primary",
          regionId: action.regionId,
        });
      }
      if (action.regionId === current.primaryRegion) {
        return { ...EMPTY_TOPOLOGY };
      }
      return transitionTopology(current, {
        kind: current.readRegions.includes(action.regionId)
          ? "remove-replica"
          : "add-replica",
        regionId: action.regionId,
      });
    }
    case "restore":
      return normalizeTopology(action.topology);
    case "reset":
      return { ...EMPTY_TOPOLOGY };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function prepareTopology(topology: Topology): Topology {
  let prepared = normalizeTopology(topology);
  if (!prepared.primaryRegion) {
    const defaultPrimary = getRegionById("us-east-1") ?? regions[0];
    if (!defaultPrimary) return prepared;
    prepared = transitionTopology(prepared, {
      kind: "set-primary",
      regionId: defaultPrimary.id,
    });
  }

  if (prepared.readRegions.length > 0 || !prepared.primaryRegion) {
    return prepared;
  }

  const primary = getRegionById(prepared.primaryRegion);
  if (!primary) return prepared;
  const replica =
    regions.find(
      (region) =>
        region.provider === primary.provider &&
        region.id !== primary.id &&
        region.continent !== primary.continent
    ) ??
    regions.find(
      (region) =>
        region.provider === primary.provider && region.id !== primary.id
    );

  return replica
    ? transitionTopology(prepared, {
        kind: "add-replica",
        regionId: replica.id,
      })
    : prepared;
}

export function getTopologyProvider(topology: Topology): Provider | null {
  if (!topology.primaryRegion) return null;
  return getRegionById(topology.primaryRegion)?.provider ?? null;
}

export function getTopologyRegionIds(topology: Topology): string[] {
  const normalized = normalizeTopology(topology);
  return normalized.primaryRegion
    ? [normalized.primaryRegion, ...normalized.readRegions]
    : [];
}
