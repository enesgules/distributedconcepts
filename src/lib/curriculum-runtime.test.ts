import { describe, expect, it } from "vitest";
import {
  getAdjacentLessonId,
  getRegionInteraction,
  isLessonComplete,
  lessonNeedsPreparedTopology,
  parseCurriculumLocation,
  type LessonCompletionFacts,
} from "./curriculum-runtime";

const incompleteFacts: LessonCompletionFacts = {
  primaryRegion: null,
  readRegionCount: 0,
  writePhase: "idle",
  readPhase: "idle",
  consistencyPhase: "idle",
  failoverPhase: "idle",
};

describe("curriculum runtime", () => {
  it("resolves stable lesson identity from routes", () => {
    expect(parseCurriculumLocation("/lessons/stale-read")).toEqual({
      kind: "lesson",
      lessonId: "stale-read",
    });
    expect(parseCurriculumLocation("/lessons")).toEqual({
      kind: "home",
      curriculum: true,
    });
  });

  it("owns order and region interaction policy", () => {
    expect(getAdjacentLessonId("write-path", "next")).toBe("replica-read");
    expect(getAdjacentLessonId("distributed-service", "previous")).toBeNull();
    expect(getRegionInteraction("replication")).toBe("toggle-replica");
    expect(getRegionInteraction("recovery")).toBe("none");
    expect(lessonNeedsPreparedTopology("stale-read")).toBe(true);
  });

  it("derives completion once for persistence and navigation", () => {
    expect(
      isLessonComplete("replication", {
        ...incompleteFacts,
        primaryRegion: "us-east-1",
        readRegionCount: 1,
      })
    ).toBe(true);
    expect(
      isLessonComplete("stale-read", {
        ...incompleteFacts,
        consistencyPhase: "result",
      })
    ).toBe(true);
    expect(isLessonComplete("recovery", incompleteFacts)).toBe(false);
  });
});
