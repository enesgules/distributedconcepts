import { describe, expect, it } from "vitest";
import {
  createFailoverSimulationState,
  reduceFailoverSimulation,
} from "./failover-simulation";

describe("failover lesson simulation", () => {
  it("rejects failover without a replica", () => {
    const state = createFailoverSimulationState();
    const next = reduceFailoverSimulation(state, {
      kind: "kill-primary",
      topology: { primaryRegion: "us-east-1", readRegions: [] },
    }).state;

    expect(next).toBe(state);
  });

  it("preserves every learner checkpoint through recovery", () => {
    let state = reduceFailoverSimulation(createFailoverSimulationState(), {
      kind: "kill-primary",
      topology: {
        primaryRegion: "us-east-1",
        readRegions: ["eu-west-1"],
      },
    }).state;
    state = reduceFailoverSimulation(state, {
      kind: "tick",
      deltaSeconds: 1,
    }).state;
    expect(state.phase).toBe("failure");
    expect(state.requestQueueVisible).toBe(true);

    state = reduceFailoverSimulation(state, {
      kind: "start-detection",
    }).state;
    state = reduceFailoverSimulation(state, {
      kind: "tick",
      deltaSeconds: 3,
    }).state;
    expect(state.phase).toBe("detecting");

    state = reduceFailoverSimulation(state, {
      kind: "start-election",
    }).state;
    state = reduceFailoverSimulation(state, {
      kind: "tick",
      deltaSeconds: 5,
    }).state;
    expect(state.phase).toBe("elected");

    state = reduceFailoverSimulation(state, {
      kind: "start-recovery",
    }).state;
    state = reduceFailoverSimulation(state, {
      kind: "tick",
      deltaSeconds: 5,
    }).state;
    expect(state.phase).toBe("complete");
    expect(state.events.at(-1)?.label).toBe("Leader region fully recovered");
  });
});
