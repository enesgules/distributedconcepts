// Single source of truth for the 6-step learning path. Consumed by the
// welcome overlay, bottom nav, next-step button, and page-level hints.
export interface Step {
  title: string;
  shortTitle: string;
  tagline: string;
  description: string;
  hint: string;
}

export const STEPS: Step[] = [
  {
    title: "Explore the Globe",
    shortTitle: "Globe",
    tagline: "Explore regions",
    description:
      "See all available regions and find which one is closest to you",
    hint: "Drag to rotate · Scroll to zoom · Hover regions to explore",
  },
  {
    title: "Build Your Database",
    shortTitle: "Regions",
    tagline: "Build database",
    description:
      "Set a primary region, add read replicas, and see latency heatmaps form across the globe",
    hint: "Click regions on the globe or panel to build your database",
  },
  {
    title: "Write Flow",
    shortTitle: "Write",
    tagline: "Replicate data",
    description:
      "Execute a write and watch it travel to the primary, get confirmed, then replicate to every read region",
    hint: "Execute a write — or click the globe to move your client first",
  },
  {
    title: "Read Flow",
    shortTitle: "Read",
    tagline: "Nearest routing",
    description: "See how reads route to the nearest replica",
    hint: "Execute a read — or click the globe to move your client first",
  },
  {
    title: "Eventual Consistency",
    shortTitle: "Consistency",
    tagline: "Stale reads",
    description: "Race: can you read before replication finishes?",
    hint: "Adjust the delay slider, then run the race to see eventual consistency",
  },
  {
    title: "Failover",
    shortTitle: "Failover",
    tagline: "Leader election",
    description: "Kill the primary and watch leader election happen",
    hint: "Kill the primary to see automatic failover in action",
  },
];

export const LAST_STEP = STEPS.length - 1;
