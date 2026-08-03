import { describe, expect, it } from "vitest";
import {
  createConsistencySimulationState,
  reduceConsistencySimulation,
} from "./consistency-simulation";

function startRace(readDelay: number, replicationLatency: number, readLatency: number) {
  let state = reduceConsistencySimulation(
    createConsistencySimulationState({
      clientLocation: { lat: 41, lon: 29 },
      readDelay,
    }),
    {
      kind: "start",
      primaryLatencyMs: 10,
      replicationLatencyMs: replicationLatency,
      readLatencyMs: readLatency,
    }
  ).state;
  state = reduceConsistencySimulation(state, {
    kind: "tick",
    deltaSeconds: 1,
  }).state;
  return reduceConsistencySimulation(state, { kind: "start-race" }).state;
}

describe("consistency lesson simulation", () => {
  it("resolves a stale read from the stored latency scenario", () => {
    let state = startRace(0, 100, 10);
    state = reduceConsistencySimulation(state, {
      kind: "tick",
      deltaSeconds: 1,
    }).state;

    expect(state.phase).toBe("result");
    expect(state.isStale).toBe(true);
  });

  it("resolves a fresh read when replication wins", () => {
    let state = startRace(100, 50, 10);
    state = reduceConsistencySimulation(state, {
      kind: "tick",
      deltaSeconds: 1,
    }).state;

    expect(state.phase).toBe("result");
    expect(state.isStale).toBe(false);
  });

  it("keeps the result visible before completing", () => {
    let state = startRace(0, 100, 10);
    state = reduceConsistencySimulation(state, {
      kind: "tick",
      deltaSeconds: 1,
    }).state;
    state = reduceConsistencySimulation(state, {
      kind: "tick",
      deltaSeconds: 0.3,
    }).state;
    expect(state.phase).toBe("result");

    state = reduceConsistencySimulation(state, {
      kind: "tick",
      deltaSeconds: 0.3,
    }).state;
    expect(state.phase).toBe("complete");
  });
});
