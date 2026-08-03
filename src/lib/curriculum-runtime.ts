import type { ConsistencyPhase } from "./simulation/consistency-simulation";
import type { FailoverPhase } from "./simulation/failover-simulation";
import type { ReadPhase } from "./simulation/read-simulation";
import type { WritePhase } from "./simulation/write-simulation";
import {
  STEPS,
  getStepIndexById,
  type Step,
  type StepId,
} from "./steps";

export const OPEN_CURRICULUM_EVENT =
  "distributed-concepts:open-curriculum";

export type CurriculumLocation =
  | { kind: "home"; curriculum: boolean }
  | { kind: "lesson"; lessonId: StepId };

export type RegionInteraction =
  | "choose-primary"
  | "toggle-replica"
  | "place-client"
  | "none";

export interface LessonCompletionFacts {
  primaryRegion: string | null;
  readRegionCount: number;
  writePhase: WritePhase;
  readPhase: ReadPhase;
  consistencyPhase: ConsistencyPhase;
  failoverPhase: FailoverPhase;
}

const preparedTopologyLessons = new Set<StepId>([
  "write-path",
  "replica-read",
  "stale-read",
  "recovery",
]);
const replicaPreferredClientLessons = new Set<StepId>([
  "replica-read",
  "stale-read",
]);

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
  return {
    kind: "home",
    curriculum: /^\/lessons\/?$/.test(pathname),
  };
}

export function getAdjacentLessonId(
  lessonId: StepId,
  direction: "previous" | "next"
): StepId | null {
  const offset = direction === "next" ? 1 : -1;
  return STEPS[getStepIndexById(lessonId) + offset]?.id ?? null;
}

export function lessonNeedsPreparedTopology(lessonId: StepId): boolean {
  return preparedTopologyLessons.has(lessonId);
}

export function lessonPrefersReplicaClient(lessonId: StepId): boolean {
  return replicaPreferredClientLessons.has(lessonId);
}

export function getRegionInteraction(lessonId: StepId): RegionInteraction {
  switch (lessonId) {
    case "distributed-service":
      return "choose-primary";
    case "replication":
      return "toggle-replica";
    case "write-path":
    case "replica-read":
    case "stale-read":
      return "place-client";
    case "recovery":
      return "none";
    default: {
      const _exhaustive: never = lessonId;
      return _exhaustive;
    }
  }
}

export function isLessonComplete(
  lessonId: StepId,
  facts: LessonCompletionFacts
): boolean {
  switch (lessonId) {
    case "distributed-service":
      return facts.primaryRegion !== null;
    case "replication":
      return facts.primaryRegion !== null && facts.readRegionCount > 0;
    case "write-path":
      return facts.writePhase === "complete";
    case "replica-read":
      return facts.readPhase === "complete";
    case "stale-read":
      return (
        facts.consistencyPhase === "result" ||
        facts.consistencyPhase === "complete"
      );
    case "recovery":
      return facts.failoverPhase === "complete";
    default: {
      const _exhaustive: never = lessonId;
      return _exhaustive;
    }
  }
}
