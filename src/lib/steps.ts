export type StepId = "build" | "write" | "stale-read" | "failure";

export interface Step {
  id: StepId;
  slug: StepId;
  title: string;
  shortTitle: string;
  question: string;
  summary: string;
}

export const STEPS = [
  {
    id: "build",
    slug: "build",
    title: "Build two copies",
    shortTitle: "Build",
    question: "Why put data in more than one place?",
    summary: "Place one leader, then add a copy near distant readers.",
  },
  {
    id: "write",
    slug: "write",
    title: "Follow one write",
    shortTitle: "Write",
    question: "When is a write really done?",
    summary: "Watch the leader confirm a write before the other copy catches up.",
  },
  {
    id: "stale-read",
    slug: "stale-read",
    title: "Race the copy",
    shortTitle: "Stale data",
    question: "Can two copies disagree?",
    summary: "Read immediately or wait, then see which value the replica returns.",
  },
  {
    id: "failure",
    slug: "failure",
    title: "Break the leader",
    shortTitle: "Failure",
    question: "What happens when the leader fails?",
    summary: "Pause writes, choose a standby, and bring the system back.",
  },
] as const satisfies readonly Step[];

export function getStepIndexById(stepId: StepId): number {
  const index = STEPS.findIndex((step) => step.id === stepId);
  if (index < 0) throw new Error(`Lesson "${stepId}" has no step`);
  return index;
}
