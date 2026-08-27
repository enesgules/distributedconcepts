export type StepId = "build" | "write" | "stale-read" | "failure";

export interface Step {
  id: StepId;
  slug: StepId;
  title: string;
  summary: string;
}

export const STEPS = [
  {
    id: "build",
    slug: "build",
    title: "Build two copies",
    summary: "Place a leader and a read copy.",
  },
  {
    id: "write",
    slug: "write",
    title: "Follow one write",
    summary: "See why a write finishes before its copy.",
  },
  {
    id: "stale-read",
    slug: "stale-read",
    title: "Race the copy",
    summary: "Race a read against replication.",
  },
  {
    id: "failure",
    slug: "failure",
    title: "Break the leader",
    summary: "Replace a failed leader.",
  },
] as const satisfies readonly Step[];

export function getStepIndexById(stepId: StepId): number {
  const index = STEPS.findIndex((step) => step.id === stepId);
  if (index < 0) throw new Error(`Lesson "${stepId}" has no step`);
  return index;
}
