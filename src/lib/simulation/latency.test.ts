import { describe, expect, it } from "vitest";
import {
  calculateGlobalCoverage,
  compareLatency,
  compareLatencyBetweenRegions,
  sampleLatency,
} from "./latency";

describe("latency model", () => {
  it("keeps comparisons deterministic", () => {
    const first = compareLatency(41, 28.98, 39.04, -77.49);
    const second = compareLatency(41, 28.98, 39.04, -77.49);

    expect(first).toBe(second);
  });

  it("uses measured region latency without hidden jitter", () => {
    expect(compareLatencyBetweenRegions("eu-central-1", "eu-west-2")).toBe(
      15
    );
  });

  it("samples variation through an explicit random source", () => {
    const baseline = compareLatency(41, 28.98, 39.04, -77.49);

    expect(sampleLatency(41, 28.98, 39.04, -77.49, () => 0.5)).toBe(
      baseline
    );
    expect(sampleLatency(41, 28.98, 39.04, -77.49, () => 0)).toBeLessThan(
      baseline
    );
  });

  it("reuses one world sample for coverage comparisons", () => {
    const first = calculateGlobalCoverage("us-east-1", ["eu-west-1"]);
    const second = calculateGlobalCoverage("us-east-1", ["eu-west-1"]);

    expect(first).toBe(second);
  });
});
