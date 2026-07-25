export type ChapterId = "foundations" | "copies" | "agreement" | "scale";

export type StepId =
  | "distributed-service"
  | "replication"
  | "write-path"
  | "replica-read"
  | "stale-read"
  | "recovery";

export interface Step {
  id: StepId;
  slug: string;
  chapterId: ChapterId;
  title: string;
  shortTitle: string;
  tagline: string;
  description: string;
  hint: string;
  nextAction: string;
}

export const STEPS = [
  {
    id: "distributed-service",
    slug: "distributed-service",
    chapterId: "foundations",
    title: "Build a Distributed Service",
    shortTitle: "Service",
    tagline: "Choose where writes begin",
    description:
      "Place the first node, then see how clients and messages reach it across the network",
    hint: "Choose the node that will accept and order every write",
    nextAction: "Replicate the data",
  },
  {
    id: "replication",
    slug: "replication",
    chapterId: "copies",
    title: "Replicate the Data",
    shortTitle: "Replication",
    tagline: "Keep a second copy",
    description:
      "Add a replica in another region and compare the read-latency coverage",
    hint: "Add a replica and watch the low-latency area move",
    nextAction: "Follow a write",
  },
  {
    id: "write-path",
    slug: "write-path",
    chapterId: "copies",
    title: "Follow a Write",
    shortTitle: "Writes",
    tagline: "Commit, then copy",
    description:
      "Advance a write through the leader commit, acknowledgement, and background replication",
    hint: "Advance one system decision after you understand the last one",
    nextAction: "Read from a replica",
  },
  {
    id: "replica-read",
    slug: "replica-read",
    chapterId: "copies",
    title: "Read from a Replica",
    shortTitle: "Reads",
    tagline: "Use the nearest copy",
    description:
      "Move the client and follow how the router chooses a nearby copy",
    hint: "Move the client, then follow the request and response",
    nextAction: "Observe a stale read",
  },
  {
    id: "stale-read",
    slug: "stale-read",
    chapterId: "copies",
    title: "Observe a Stale Read",
    shortTitle: "Consistency",
    tagline: "Find the stale window",
    description:
      "Race replication against a nearby read and inspect which value arrives first",
    hint: "Change the read delay, then compare both arrival times",
    nextAction: "Recover from failure",
  },
  {
    id: "recovery",
    slug: "recovery",
    chapterId: "agreement",
    title: "Recover from Failure",
    shortTitle: "Recovery",
    tagline: "Elect, repair, resume",
    description:
      "Fail the leader, detect the outage, elect a replacement, and resume writes",
    hint: "Advance the recovery one system decision at a time",
    nextAction: "Return to curriculum",
  },
] satisfies readonly Step[];

interface CurriculumLessonBase {
  title: string;
  summary: string;
}

export type CurriculumLesson =
  | (CurriculumLessonBase & {
      kind: "interactive";
      stepId: StepId;
    })
  | (CurriculumLessonBase & {
      kind: "planned";
    });

export interface CurriculumChapter {
  id: ChapterId;
  number: string;
  shortTitle: string;
  title: string;
  question: string;
  accent: string;
  signalLabels: readonly [string, string, string];
  lessons: readonly CurriculumLesson[];
}

export const CURRICULUM_CHAPTERS = [
  {
    id: "foundations",
    number: "01",
    shortTitle: "Rules",
    title: "Distribution changes the rules",
    question: "What changes when work crosses a network?",
    accent: "#67e8f9",
    signalLabels: ["client", "message", "node"],
    lessons: [
      {
        kind: "interactive",
        stepId: "distributed-service",
        title: "From one server to a distributed service",
        summary: "Nodes, clients, local state, and messages in one interaction.",
      },
      {
        kind: "planned",
        title: "The network is uncertain",
        summary: "Latency, timeouts, retries, and ambiguous failure.",
      },
    ],
  },
  {
    id: "copies",
    number: "02",
    shortTitle: "Copies",
    title: "Copies disagree",
    question: "What happens when the same data lives in several places?",
    accent: "#45e6a7",
    signalLabels: ["leader", "write", "replica"],
    lessons: [
      {
        kind: "interactive",
        stepId: "replication",
        title: "Replicate the data",
        summary: "Add a second copy and see what proximity changes.",
      },
      {
        kind: "interactive",
        stepId: "write-path",
        title: "Follow a write",
        summary: "Commit first, acknowledge, then replicate.",
      },
      {
        kind: "interactive",
        stepId: "replica-read",
        title: "Read from a replica",
        summary: "Route a client to the nearest available copy.",
      },
      {
        kind: "interactive",
        stepId: "stale-read",
        title: "Observe a stale read",
        summary: "Race a read against replication lag.",
      },
      {
        kind: "planned",
        title: "Choose a consistency promise",
        summary: "Compare eventual, session, and linearizable reads.",
      },
      {
        kind: "planned",
        title: "Wait for a quorum",
        summary: "Trade latency and availability for stronger agreement.",
      },
    ],
  },
  {
    id: "agreement",
    number: "03",
    shortTitle: "Agreement",
    title: "Agree through failure",
    question: "How do independent nodes commit one history?",
    accent: "#c4b5fd",
    signalLabels: ["candidate", "vote", "quorum"],
    lessons: [
      {
        kind: "planned",
        title: "Order concurrent writes",
        summary: "See why clocks cannot settle every conflict.",
      },
      {
        kind: "planned",
        title: "Commit one history",
        summary: "Replicated logs, majorities, and consensus.",
      },
      {
        kind: "planned",
        title: "Split the network",
        summary: "Partitions, split brain, and the CAP tradeoff.",
      },
      {
        kind: "interactive",
        stepId: "recovery",
        title: "Recover from failure",
        summary: "Detect, elect, repair, and resume one action at a time.",
      },
    ],
  },
  {
    id: "scale",
    number: "04",
    shortTitle: "Scale",
    title: "Distribute the workload",
    question: "How does the design change when one copy is not enough?",
    accent: "#fdba74",
    signalLabels: ["router", "key", "shard"],
    lessons: [
      {
        kind: "planned",
        title: "Partition the data",
        summary: "Divide keys between nodes and route each request.",
      },
      {
        kind: "planned",
        title: "Rebalance the cluster",
        summary: "Move ownership safely when nodes join or leave.",
      },
      {
        kind: "planned",
        title: "Handle a hotspot",
        summary: "Respond when one key receives most of the traffic.",
      },
      {
        kind: "planned",
        title: "Coordinate across shards",
        summary: "Atomicity, two-phase commit, and partial completion.",
      },
    ],
  },
] satisfies readonly CurriculumChapter[];

export const LAST_STEP = STEPS.length - 1;

export function getStepIndexById(stepId: StepId): number {
  const index = STEPS.findIndex((step) => step.id === stepId);
  if (index < 0) {
    throw new Error(`Interactive lesson "${stepId}" has no step`);
  }
  return index;
}

export function getStepIndexBySlug(slug: string): number {
  return STEPS.findIndex((step) => step.slug === slug);
}
