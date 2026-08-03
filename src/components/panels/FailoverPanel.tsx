"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useDatabaseStore } from "@/lib/store/database-store";
import { useFailoverStore, type FailoverPhase } from "@/lib/store/failover-store";
import { getRegionById } from "@/lib/regions";
import {
  FlowPanel,
  LessonSequence,
  SectionLabel,
  type LessonBeat,
} from "./FlowPanel";

const FAILOVER_BEATS = [
  {
    title: "Fail the leader",
    detail:
      "The active leader stops responding. Reads still use remote replicas, but new writes have nowhere to commit.",
  },
  {
    title: "Confirm the outage",
    detail:
      "Health checks wait long enough to distinguish a failed leader from a short network delay.",
  },
  {
    title: "Elect a replacement",
    detail:
      "Backup nodes inside the same region choose one new leader. The database avoids moving the write region.",
  },
  {
    title: "Resume queued writes",
    detail:
      "Replicas reconnect to the replacement leader and queued writes drain in their original order.",
  },
] as const satisfies readonly LessonBeat[];

function getNarration({
  phase,
  failedCity,
  queueCount,
  failureReady,
  detectionReady,
}: {
  phase: FailoverPhase;
  failedCity: string;
  queueCount: number;
  failureReady: boolean;
  detectionReady: boolean;
}): string | null {
  if (phase === "failure") {
    return failureReady
      ? `${queueCount} writes are queued. Read replicas still serve reads while the system waits for a health check.`
      : `The leader in ${failedCity} stopped responding. Connections are breaking and writes can no longer commit.`;
  }
  if (phase === "detecting") {
    return detectionReady
      ? "Health checks agree that the leader is down. The cluster can now elect a replacement."
      : "Health checks are confirming that this is a real outage, not a brief network delay.";
  }
  if (phase === "electing") {
    return `Backup nodes in ${failedCity} are choosing one new leader. Writes remain queued during the vote.`;
  }
  if (phase === "elected") {
    return `A new leader is ready in ${failedCity}. Replicas and queued clients still need to reconnect.`;
  }
  if (phase === "recovering") {
    return "Read replicas are reconnecting. Queued writes are moving to the replacement leader.";
  }
  return null;
}

export default function FailoverPanel({
  onRestart,
}: {
  onRestart?: () => void;
}) {
  const primaryRegion = useDatabaseStore((s) => s.primaryRegion);
  const readRegions = useDatabaseStore((s) => s.readRegions);

  const phase = useFailoverStore((s) => s.phase);
  const failedRegionId = useFailoverStore((s) => s.failedRegionId);
  const downtimeMs = useFailoverStore((s) => s.downtimeMs);
  const queuedRequests = useFailoverStore((s) => s.queuedRequests);
  const failureFlashProgress = useFailoverStore(
    (s) => s.failureFlashProgress
  );
  const detectionProgress = useFailoverStore((s) => s.detectionProgress);
  const killPrimary = useFailoverStore((s) => s.killPrimary);
  const startDetection = useFailoverStore((s) => s.startDetection);
  const startElection = useFailoverStore((s) => s.startElection);
  const startRecovery = useFailoverStore((s) => s.startRecovery);
  const replay = useFailoverStore((s) => s.replay);

  const failedRegion = failedRegionId ? getRegionById(failedRegionId) : null;
  const currentPrimary = primaryRegion ? getRegionById(primaryRegion) : null;

  const failureReady = phase === "failure" && failureFlashProgress >= 1;
  const detectionReady = phase === "detecting" && detectionProgress >= 1;
  const narration = getNarration({
    phase,
    failedCity: failedRegion?.city ?? "unknown",
    queueCount: queuedRequests.length,
    failureReady,
    detectionReady,
  });
  const isAnimating =
    (phase === "failure" && !failureReady) ||
    (phase === "detecting" && !detectionReady) ||
    phase === "electing" ||
    phase === "recovering";
  const activeBeat =
    phase === "idle" || (phase === "failure" && !failureReady)
      ? 0
      : phase === "failure" ||
          phase === "detecting"
        ? 1
        : phase === "electing" || phase === "elected"
          ? 2
          : 3;

  const lessonAction =
    phase === "idle"
      ? {
          label: "Fail the leader",
          onClick: killPrimary,
          className:
            "bg-red-400/10 text-red-400 hover:bg-red-400/20 disabled:opacity-30",
        }
      : failureReady
        ? {
            label: "Run health checks",
            onClick: startDetection,
            className:
              "bg-amber-400/10 text-amber-300 hover:bg-amber-400/20",
          }
        : detectionReady
          ? {
              label: "Elect a new leader",
              onClick: startElection,
              className:
                "bg-amber-400/10 text-amber-300 hover:bg-amber-400/20",
            }
          : phase === "elected"
            ? {
                label: "Reconnect and resume",
                onClick: startRecovery,
                className:
                  "bg-emerald-400 text-zinc-950 hover:bg-emerald-300",
              }
            : null;

  return (
    <FlowPanel
      title="Recover from Failure"
      description="Advance through detection, election, and traffic recovery"
      footer={
        <>
          {lessonAction && (
            <button
              onClick={lessonAction.onClick}
              disabled={!primaryRegion || readRegions.length === 0}
              className={`min-h-10 w-full cursor-pointer rounded-full px-4 py-2 text-xs font-semibold transition-[background-color,scale] duration-150 active:scale-[0.96] disabled:cursor-not-allowed ${lessonAction.className}`}
            >
              {lessonAction.label}
            </button>
          )}
          {isAnimating && (
            <div className="text-center text-xs text-[var(--text-tertiary)]">
              {phase === "failure"
                ? "Breaking connections..."
                : phase === "detecting"
                  ? "Checking leader health..."
                  : phase === "electing"
                    ? "Voting for a leader..."
                    : "Resuming traffic..."}
            </div>
          )}
          {phase === "complete" && (
            <>
              {onRestart && (
                <button
                  onClick={onRestart}
                  className="min-h-10 w-full rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-zinc-950 transition-[background-color,scale] duration-150 hover:bg-emerald-300 active:scale-[0.96]"
                >
                  Return to curriculum
                </button>
              )}
              <button
                onClick={replay}
                className="min-h-10 w-full cursor-pointer rounded-full border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-xs font-medium text-zinc-300 transition-[background-color,border-color,scale] duration-150 hover:border-zinc-600 hover:bg-zinc-800 active:scale-[0.96]"
              >
                Replay failover
              </button>
            </>
          )}
        </>
      }
    >
      <>
        <LessonSequence
          beats={FAILOVER_BEATS}
          activeIndex={activeBeat}
          running={isAnimating}
          complete={phase === "complete"}
        />

        {/* Cluster Status */}
        <div>
          <SectionLabel>Cluster Status</SectionLabel>
          <div className="space-y-1.5">
            {/* Primary */}
            {currentPrimary && (
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    phase === "idle"
                      ? "bg-amber-400"
                      : phase === "complete"
                        ? "bg-amber-400"
                        : phase === "elected" || phase === "recovering"
                          ? "bg-amber-400 animate-pulse"
                        : "bg-red-400 animate-pulse"
                  }`}
                />
                <span className="text-xs text-zinc-300">
                  {currentPrimary.city}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                    phase === "idle"
                      ? "bg-amber-500/10 text-amber-400"
                      : phase === "elected" ||
                          phase === "recovering" ||
                          phase === "complete"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {phase === "idle"
                    ? "Leader"
                    : phase === "elected"
                      ? "Elected"
                      : phase === "recovering"
                        ? "Reconnecting"
                        : phase === "complete"
                          ? "Leader"
                      : "Failed"}
                </span>
              </div>
            )}

            {/* Read replicas continue serving reads throughout failover */}
            {readRegions.map((id) => {
              const region = getRegionById(id);
              if (!region) return null;
              return (
                <div key={id} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-xs text-zinc-300">
                    {region.city}
                  </span>
                  <span className="text-[9px] text-[var(--text-muted)]">Read</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Downtime Counter */}
        <AnimatePresence>
          {phase !== "idle" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Downtime
              </p>
              <div className="flex items-baseline gap-2">
                <motion.span
                  key={downtimeMs}
                  className={`font-mono text-2xl font-bold ${
                    phase === "complete" ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {downtimeMs}ms
                </motion.span>
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  {phase === "complete" ? "total downtime" : "downtime..."}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase Narration */}
        <AnimatePresence mode="wait">
          {narration && (
            <motion.p
              key={phase}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
              className="text-xs italic text-zinc-400"
            >
              {narration}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Key Insight (on complete) */}
        <AnimatePresence>
          {phase === "complete" && failedRegion && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3"
            >
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-500/70">
                Key Insight
              </p>
              <p className="text-xs leading-relaxed text-zinc-300">
                Recovery completed in{" "}
                <span className="font-mono font-semibold text-cyan-400">
                  {downtimeMs}ms
                </span>
                . A backup replica in {failedRegion.city} was promoted to
                leader. The write region did not move.
              </p>
              <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
                The database keeps multiple copies inside the leader region for high
                availability. During failover, read replicas continue serving
                reads. Only writes are briefly interrupted.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Journey complete (on failover complete) */}
        <AnimatePresence>
          {phase === "complete" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="rounded-xl border border-[var(--line-subtle)] bg-zinc-900/50 px-4 py-3"
            >
              <p className="text-xs leading-relaxed text-zinc-300">
                You placed one leader and {readRegions.length}{" "}
                read replica{readRegions.length !== 1 ? "s" : ""}, ran a write
                and a read, saw eventual consistency, and recovered from a
                leader failure.
              </p>
              <a
                href="https://github.com/enesgules/distributedconcepts"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300"
              >
                <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
                  <path d="M8 .3l2.3 4.7 5.2.8-3.8 3.6.9 5.2L8 12.1l-4.6 2.5.9-5.2L.5 5.8l5.2-.8L8 .3z" />
                </svg>
                Enjoyed it? Star the project on GitHub
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    </FlowPanel>
  );
}
