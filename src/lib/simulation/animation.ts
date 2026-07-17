// Shared pacing for the flow visualizations: real latency (ms) is compressed
// into animation seconds. 200ms latency → 0.6s of animation.
export const ANIMATION_SPEED = 0.003;
export const MIN_DURATION = 0.3;

/** Animation duration (seconds) for a simulated latency, floored so short hops stay visible. */
export function latencyToDuration(latencyMs: number): number {
  return Math.max(latencyMs * ANIMATION_SPEED, MIN_DURATION);
}

/** Pause (ms) on a flash/ack before the next phase starts. */
export const FLASH_PAUSE_MS = 400;

/**
 * Advance a 0→1 progress value by delta seconds, paced by simulated latency.
 * Clamps at 1; callers detect completion with `p >= 1`.
 */
export function advance(
  progress: number,
  delta: number,
  latencyMs: number
): number {
  return Math.min(progress + delta / latencyToDuration(latencyMs), 1);
}
