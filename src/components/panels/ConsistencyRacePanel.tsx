"use client";

import { useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useDatabaseStore } from "@/lib/store/database-store";
import { useConsistencyRaceStore } from "@/lib/store/consistency-race-store";
import { getRegionById } from "@/lib/regions";
import {
  estimateLatency,
  estimateLatencyBetweenRegions,
  estimateLatencyStable,
  staleReadMarginMs,
} from "@/lib/simulation/latency";
import { playPacketSendSound, playReplicateSound } from "@/lib/sounds";
import {
  FlowPanel,
  ExecuteFooter,
  LessonSequence,
  type LessonBeat,
} from "./FlowPanel";

const CONSISTENCY_BEATS = [
  {
    title: "Commit the new value",
    detail:
      "The client writes v2 to the leader. Once the leader commits it, the client receives OK.",
  },
  {
    title: "Open the stale window",
    detail:
      "The leader has v2, but the read replica still has v1. This gap lasts until replication arrives.",
  },
  {
    title: "Race read against replication",
    detail:
      "Replication and the delayed read now move toward the same replica. Whichever arrives first decides the value.",
  },
  {
    title: "Inspect the winner",
    detail:
      "A read that reaches the replica first returns v1. If replication wins, the same read returns v2.",
  },
] as const satisfies readonly LessonBeat[];

function predictionLabel(
  readDelay: number,
  replicationMs: number,
  readMs: number
): { text: string; color: string } {
  const margin = staleReadMarginMs(readDelay, readMs, replicationMs);
  if (margin <= -20) return { text: "Will be stale", color: "text-red-400" };
  if (margin <= 0) return { text: "Likely stale", color: "text-red-400" };
  if (margin <= 20) return { text: "Close race", color: "text-yellow-400" };
  return { text: "Should be fresh", color: "text-emerald-400" };
}

interface ConsistencyRacePanelProps {
  replicaRegionId: string | null;
  nearestIsPrimary: boolean;
  onNext?: () => void;
}

export default function ConsistencyRacePanel({
  replicaRegionId,
  nearestIsPrimary,
  onNext,
}: ConsistencyRacePanelProps) {
  const primaryRegion = useDatabaseStore((s) => s.primaryRegion);

  const clientLocation = useConsistencyRaceStore((s) => s.clientLocation);
  const phase = useConsistencyRaceStore((s) => s.phase);
  const readDelay = useConsistencyRaceStore((s) => s.readDelay);
  const isStale = useConsistencyRaceStore((s) => s.isStale);
  const replicationLatencyMs = useConsistencyRaceStore(
    (s) => s.replicationLatencyMs
  );
  const readLatencyMs = useConsistencyRaceStore((s) => s.readLatencyMs);

  const primary = primaryRegion ? getRegionById(primaryRegion) : null;
  const replica = replicaRegionId ? getRegionById(replicaRegionId) : null;

  const replicationMs = useMemo(() => {
    if (!primaryRegion || !replicaRegionId) return null;
    return estimateLatencyBetweenRegions(primaryRegion, replicaRegionId);
  }, [primaryRegion, replicaRegionId]);

  const readMs = useMemo(() => {
    if (!clientLocation || !replica) return null;
    return estimateLatencyStable(
      clientLocation.lat,
      clientLocation.lon,
      replica.lat,
      replica.lon
    );
  }, [clientLocation, replica]);

  const prediction =
    replicationMs !== null && readMs !== null
      ? predictionLabel(readDelay, replicationMs, readMs)
      : null;

  const canExecute =
    clientLocation !== null &&
    primary !== null &&
    replica !== null &&
    replicationMs !== null &&
    readMs !== null &&
    phase === "idle";
  const canAdvance = phase === "write-ack";
  const isAnimating =
    phase === "writing" ||
    phase === "racing" ||
    phase === "result";

  const handleExecute = useCallback(() => {
    if (
      !clientLocation ||
      !primary ||
      replicationMs === null ||
      readMs === null
    )
      return;

    const primaryLatency = estimateLatency(
      clientLocation.lat,
      clientLocation.lon,
      primary.lat,
      primary.lon
    );
    playPacketSendSound();
    useConsistencyRaceStore
      .getState()
      .startRace(primaryLatency, replicationMs, readMs);
  }, [clientLocation, primary, readMs, replicationMs]);

  const handleStartRace = useCallback(() => {
    playReplicateSound();
    useConsistencyRaceStore.getState().startReplicationRace();
  }, []);

  const handleReplay = useCallback(() => {
    useConsistencyRaceStore.getState().reset();
  }, []);

  const activeBeat =
    phase === "idle" || phase === "writing"
      ? 0
      : phase === "write-ack"
        ? 1
        : phase === "racing"
          ? 2
          : 3;
  const actionLabel =
    phase === "write-ack" ? "Start both clocks" : "Commit v2";
  const busyLabel =
    phase === "writing"
      ? "Committing v2..."
      : phase === "racing"
        ? "Racing..."
        : "Resolving result...";

  return (
    <FlowPanel
      title="Observe a Stale Read"
      description="Control the stale window, then see which request reaches the replica first"
      footer={
        nearestIsPrimary ? (
          <p className="text-center text-[11px] text-zinc-400">
            Click closer to a read replica to start the race
          </p>
        ) : (
          <ExecuteFooter
            complete={phase === "complete"}
            onExecute={
              phase === "write-ack" ? handleStartRace : handleExecute
            }
            onReplay={handleReplay}
            disabled={!canExecute && !canAdvance}
            busy={isAnimating}
            executeLabel={actionLabel}
            busyLabel={busyLabel}
            replayLabel="Run Again"
            nextLabel="Recover from failure"
            onNext={onNext}
          />
        )
      }
    >
      <>
        {!nearestIsPrimary && (
          <LessonSequence
            beats={CONSISTENCY_BEATS}
            activeIndex={activeBeat}
            running={isAnimating}
            complete={phase === "complete"}
          />
        )}

        {/* Reading from primary — no race possible */}
        {clientLocation && nearestIsPrimary && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-500/70 mb-2">
              No Race Needed
            </p>
            <p className="text-xs leading-relaxed text-zinc-300">
              Your nearest region is the{" "}
              <span className="font-semibold text-amber-400">
                leader ({primary?.city})
              </span>
              . Since writes and reads both go to the same region, there&apos;s
              no replication delay. You&apos;ll always read the latest value.
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
              Eventual consistency only affects reads from{" "}
              <span className="text-emerald-400">read replicas</span>, which
              need time to receive replicated data from the leader. Try clicking
              the globe closer to a replica region to see the race.
            </p>
          </motion.div>
        )}

        {/* Reading from indicator */}
        {clientLocation && (
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-zinc-600">Reading from</span>
            {nearestIsPrimary ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span className="font-medium text-amber-400">
                  {primary?.city}
                </span>
                <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-400">
                  Leader
                </span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="font-medium text-emerald-400">
                  {replica?.city}
                </span>
                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
                  Replica
                </span>
                {readMs !== null && (
                  <span className="font-mono text-zinc-500">~{readMs}ms</span>
                )}
              </>
            )}
          </div>
        )}

        {/* Replication context */}
        {!nearestIsPrimary && primary && replica && replicationMs !== null && (
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span className="text-zinc-600">Replication</span>
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>{primary.city}</span>
            <span className="text-zinc-600">→</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>{replica.city}</span>
            <span className="font-mono text-zinc-500">
              ~{replicationMs}ms
            </span>
          </div>
        )}

        {/* Prompt or Slider */}
        {!clientLocation ? (
          <p className="text-[11px] text-zinc-500 italic">
            Click the globe to place your client, then run the race
          </p>
        ) : !nearestIsPrimary ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                Read Delay After Write
              </p>
              <span className="font-mono text-xs text-cyan-400">
                {readDelay}ms
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={200}
              step={5}
              value={readDelay}
              onChange={(e) =>
                useConsistencyRaceStore
                  .getState()
                  .setReadDelay(Number(e.target.value))
              }
              disabled={phase !== "idle"}
              className="w-full accent-cyan-400 disabled:opacity-40"
            />
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
              How long to wait after writing before reading from{" "}
              {replica?.city ?? "the replica"}.
              {replicationMs !== null && primary && (
                <> Replication from {primary.city} takes ~{replicationMs}ms. Read too soon and {replica?.city ?? "the replica"} won&apos;t have the update yet.</>
              )}
            </p>
            {prediction && phase === "idle" && (
              <p
                className={`mt-1.5 text-xs font-medium ${prediction.color}`}
              >
                {prediction.text}
              </p>
            )}
          </div>
        ) : null}

        {/* Race Terminal */}
        {phase !== "idle" && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 space-y-1 font-mono text-xs">
            <div>
              <span className="text-red-400">db&gt;</span>{" "}
              <span className="text-zinc-200">
                SET race:value &quot;v2&quot;
              </span>
            </div>
            {(phase === "write-ack" ||
              phase === "racing" ||
              phase === "result" ||
              phase === "complete") && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-emerald-400"
              >
                OK
              </motion.div>
            )}
            {(phase === "racing" ||
              phase === "result" ||
              phase === "complete") && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-zinc-500"
                >
                  [waiting {readDelay}ms...]
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="text-red-400">db&gt;</span>{" "}
                  <span className="text-zinc-200">GET race:value</span>
                </motion.div>
              </>
            )}
            {(phase === "result" || phase === "complete") &&
              isStale !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={
                    isStale ? "text-red-400 font-bold" : "text-emerald-400"
                  }
                >
                  {isStale ? '"v1" ← STALE!' : '"v2"'}
                </motion.div>
              )}
          </div>
        )}

        {/* Insight */}
        {phase === "complete" && isStale !== null && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`rounded-xl border px-4 py-3 ${
              isStale
                ? "border-red-500/20 bg-red-500/5"
                : "border-emerald-500/20 bg-emerald-500/5"
            }`}
          >
            <p
              className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${
                isStale ? "text-red-500/70" : "text-emerald-500/70"
              }`}
            >
              {isStale ? "Stale Read" : "Fresh Read"}
            </p>
            <p className="text-xs leading-relaxed text-zinc-300">
              {isStale ? (
                <>
                  Your read arrived at{" "}
                  <span className="font-semibold text-emerald-400">
                    {replica?.city}
                  </span>{" "}
                  in{" "}
                  <span className="font-mono font-semibold text-cyan-400">
                    {readDelay + readLatencyMs}ms
                  </span>{" "}
                  ({readDelay}ms delay + {readLatencyMs}ms network), but
                  replication from{" "}
                  <span className="font-semibold text-amber-400">
                    {primary?.city}
                  </span>{" "}
                  took{" "}
                  <span className="font-mono font-semibold text-emerald-400">
                    {replicationLatencyMs}ms
                  </span>
                  . The read beat replication by{" "}
                  <span className="font-mono font-semibold text-red-400">
                    {Math.abs(
                      readDelay + readLatencyMs - replicationLatencyMs
                    )}
                    ms
                  </span>
                  , so {replica?.city} still had the old value.
                </>
              ) : (
                <>
                  Replication from{" "}
                  <span className="font-semibold text-amber-400">
                    {primary?.city}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-emerald-400">
                    {replica?.city}
                  </span>{" "}
                  completed in{" "}
                  <span className="font-mono font-semibold text-emerald-400">
                    {replicationLatencyMs}ms
                  </span>
                  . Your read arrived at{" "}
                  <span className="font-mono font-semibold text-cyan-400">
                    {readDelay + readLatencyMs}ms
                  </span>{" "}
                  ({readDelay}ms delay + {readLatencyMs}ms network). By that
                  point, {replica?.city} already had the latest data.
                </>
              )}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
              {isStale
                ? "This is eventual consistency in action. After a write, there's a brief window where replicas haven't caught up yet. Any read during that window returns stale data. Try increasing the delay to give replication enough time to finish."
                : "The replication window is typically just tens of milliseconds. As long as your read doesn't race ahead of replication, you'll always see the latest value. Try lowering the delay to find the exact boundary where staleness kicks in."}
            </p>
          </motion.div>
        )}
      </>
    </FlowPanel>
  );
}
