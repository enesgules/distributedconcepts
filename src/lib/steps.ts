// Single source of truth for the 6-step learning path. Consumed by the
// welcome overlay, bottom nav, next-step button, and page-level hints.
export interface Step {
  title: string;
  shortTitle: string;
  tagline: string;
  description: string;
  hint: string;
  nextAction: string;
}

export const STEPS: Step[] = [
  {
    title: "Place the Leader",
    shortTitle: "Leader",
    tagline: "Where writes commit",
    description:
      "Choose the one region that accepts writes and see why its distance matters",
    hint: "Choose the region where every write will commit",
    nextAction: "Add a read replica",
  },
  {
    title: "Add a Read Replica",
    shortTitle: "Replica",
    tagline: "Bring reads closer",
    description:
      "Copy data into another region and measure the read-latency tradeoff",
    hint: "Add a replica and watch the low-latency area move",
    nextAction: "Commit a write",
  },
  {
    title: "Commit a Write",
    shortTitle: "Write",
    tagline: "Acknowledge, then copy",
    description:
      "Follow a write to the leader, acknowledge it, then copy it in the background",
    hint: "Advance each system action after you understand the last one",
    nextAction: "Route a read",
  },
  {
    title: "Route a Read",
    shortTitle: "Read",
    tagline: "Use the nearest copy",
    description:
      "See how the router chooses the closest copy and returns its value",
    hint: "Move the client, then follow the chosen route in both directions",
    nextAction: "Expose a stale read",
  },
  {
    title: "Expose a Stale Read",
    shortTitle: "Consistency",
    tagline: "Find the stale window",
    description:
      "Launch replication and a read together to see which value wins",
    hint: "Change the read delay, then compare the two arrival times",
    nextAction: "Recover the leader",
  },
  {
    title: "Recover the Leader",
    shortTitle: "Recovery",
    tagline: "Keep serving traffic",
    description:
      "Fail the leader, detect the outage, elect a replacement, and resume writes",
    hint: "Advance the recovery one system decision at a time",
    nextAction: "Start over",
  },
];

export const LAST_STEP = STEPS.length - 1;
