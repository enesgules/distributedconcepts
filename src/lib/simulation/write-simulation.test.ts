import { describe, expect, it } from "vitest";
import {
  createWriteSimulationState,
  reduceWriteSimulation,
} from "./write-simulation";

describe("write lesson simulation", () => {
  it("keeps commit and replication as separate teaching checkpoints", () => {
    let state = reduceWriteSimulation(createWriteSimulationState(), {
      kind: "set-client",
      location: { lat: 41, lon: 29 },
    }).state;
    state = reduceWriteSimulation(state, {
      kind: "start",
      primaryLatencyMs: 10,
      replicas: [{ regionId: "eu-west-1", latencyMs: 20 }],
    }).state;
    state = reduceWriteSimulation(state, {
      kind: "tick",
      deltaSeconds: 1,
    }).state;

    expect(state.phase).toBe("primary-ack");
    state = reduceWriteSimulation(state, {
      kind: "tick",
      deltaSeconds: 1,
    }).state;
    expect(state.phase).toBe("primary-ack");

    state = reduceWriteSimulation(state, {
      kind: "start-replication",
    }).state;
    state = reduceWriteSimulation(state, {
      kind: "tick",
      deltaSeconds: 1,
    }).state;
    expect(state.phase).toBe("complete");
    expect(state.replicaStatuses[0].arrived).toBe(true);
  });
});
