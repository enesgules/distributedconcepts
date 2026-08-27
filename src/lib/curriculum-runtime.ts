import type { ConsistencyPhase } from "./simulation/consistency-simulation";
import type { FailoverPhase } from "./simulation/failover-simulation";
import type { WritePhase } from "./simulation/write-simulation";
import { STEPS, getStepIndexById, type Step, type StepId } from "./steps";

export const OPEN_COURSE_EVENT = "distributed-concepts:open-course";

export type CurriculumLocation =
  | { kind: "home"; course: boolean }
  | { kind: "lesson"; lessonId: StepId };

export type TopologyRequirement = "none" | "leader-and-replica";

export interface LessonCompletionFacts {
  primaryRegion: string | null;
  readRegionCount: number;
  writePhase: WritePhase;
  consistencyPhase: ConsistencyPhase;
  failoverPhase: FailoverPhase;
}

export function isStepId(value: unknown): value is StepId {
  return typeof value === "string" && STEPS.some((step) => step.id === value);
}

export function getLessonById(lessonId: StepId): Step {
  return STEPS[getStepIndexById(lessonId)];
}

export function getLessonBySlug(slug: string): Step | null {
  return STEPS.find((step) => step.slug === slug) ?? null;
}

export function getLessonUrl(lessonId: StepId): string {
  return `/lessons/${getLessonById(lessonId).slug}`;
}

export function parseCurriculumLocation(pathname: string): CurriculumLocation {
  const lessonPath = pathname.match(/^\/lessons\/([^/]+)\/?$/);
  if (lessonPath) {
    const lesson = getLessonBySlug(lessonPath[1]);
    if (lesson) return { kind: "lesson", lessonId: lesson.id };
  }
  return { kind: "home", course: /^\/lessons\/?$/.test(pathname) };
}

export function getAdjacentLessonId(
  lessonId: StepId,
  direction: "previous" | "next"
): StepId | null {
  const offset = direction === "next" ? 1 : -1;
  return STEPS[getStepIndexById(lessonId) + offset]?.id ?? null;
}

export function getTopologyRequirement(
  lessonId: StepId
): TopologyRequirement {
  return lessonId === "build" ? "none" : "leader-and-replica";
}

export function isLessonComplete(
  lessonId: StepId,
  facts: LessonCompletionFacts
): boolean {
  switch (lessonId) {
    case "build":
      return facts.primaryRegion !== null && facts.readRegionCount > 0;
    case "write":
      return facts.writePhase === "complete";
    case "stale-read":
      return facts.consistencyPhase === "complete";
    case "failure":
      return facts.failoverPhase === "complete";
    default: {
      const _exhaustive: never = lessonId;
      return _exhaustive;
    }
  }
}
