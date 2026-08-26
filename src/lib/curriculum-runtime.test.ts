import { describe, expect, it } from "vitest";
import {
  getAdjacentLessonId,
  getTopologyRequirement,
  isLessonComplete,
  parseCurriculumLocation,
  type LessonCompletionFacts,
} from "./curriculum-runtime";

const incompleteFacts: LessonCompletionFacts = {
  primaryRegion: null,
  readRegionCount: 0,
  writePhase: "idle",
  consistencyPhase: "idle",
  failoverPhase: "idle",
};

describe("curriculum runtime", () => {
  it("resolves the four stable lesson routes", () => {
    expect(parseCurriculumLocation("/lessons/stale-read")).toEqual({
      kind: "lesson",
      lessonId: "stale-read",
    });
    expect(parseCurriculumLocation("/lessons")).toEqual({
      kind: "home",
      course: true,
    });
  });

  it("owns the simple course order and direct-entry requirements", () => {
    expect(getAdjacentLessonId("build", "previous")).toBeNull();
    expect(getAdjacentLessonId("build", "next")).toBe("write");
    expect(getAdjacentLessonId("stale-read", "next")).toBe("failure");
    expect(getTopologyRequirement("build")).toBe("none");
    expect(getTopologyRequirement("failure")).toBe("leader-and-replica");
  });

  it("does not finish the build until both copies exist", () => {
    expect(
      isLessonComplete("build", {
        ...incompleteFacts,
        primaryRegion: "us-east-1",
      })
    ).toBe(false);
    expect(
      isLessonComplete("build", {
        ...incompleteFacts,
        primaryRegion: "us-east-1",
        readRegionCount: 1,
      })
    ).toBe(true);
  });

  it("derives completion from each retained simulation", () => {
    expect(
      isLessonComplete("write", { ...incompleteFacts, writePhase: "complete" })
    ).toBe(true);
    expect(
      isLessonComplete("stale-read", {
        ...incompleteFacts,
        consistencyPhase: "complete",
      })
    ).toBe(true);
    expect(isLessonComplete("failure", incompleteFacts)).toBe(false);
  });
});
