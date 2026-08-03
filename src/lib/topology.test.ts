import { describe, expect, it } from "vitest";
import {
  EMPTY_TOPOLOGY,
  getTopologyProvider,
  normalizeTopology,
  prepareTopology,
  transitionTopology,
} from "./topology";

describe("topology", () => {
  it("rejects missing and cross-provider replicas", () => {
    const topology = normalizeTopology({
      primaryRegion: "us-east-1",
      readRegions: ["us-east-1", "us-east4", "eu-west-1", "missing"],
    });

    expect(topology).toEqual({
      primaryRegion: "us-east-1",
      readRegions: ["eu-west-1"],
    });
  });

  it("keeps only compatible replicas when the leader changes", () => {
    const next = transitionTopology(
      {
        primaryRegion: "us-east-1",
        readRegions: ["eu-west-1"],
      },
      { kind: "set-primary", regionId: "us-east4" }
    );

    expect(next).toEqual({ primaryRegion: "us-east4", readRegions: [] });
    expect(getTopologyProvider(next)).toBe("gcp");
  });

  it("prepares a valid same-provider topology", () => {
    const prepared = prepareTopology(EMPTY_TOPOLOGY);

    expect(prepared.primaryRegion).toBe("us-east-1");
    expect(prepared.readRegions).toHaveLength(1);
    expect(getTopologyProvider(prepared)).toBe("aws");
    expect(normalizeTopology(prepared)).toEqual(prepared);
  });

  it("normalizes restored snapshots", () => {
    const restored = transitionTopology(EMPTY_TOPOLOGY, {
      kind: "restore",
      topology: {
        primaryRegion: "us-east-1",
        readRegions: ["eu-west-1", "eu-west-1", "us-east4"],
      },
    });

    expect(restored).toEqual({
      primaryRegion: "us-east-1",
      readRegions: ["eu-west-1"],
    });
  });
});
