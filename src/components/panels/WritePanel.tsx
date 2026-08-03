"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { useDatabaseStore } from "@/lib/store/database-store";
import { useWriteFlowStore } from "@/lib/store/write-flow-store";
import { getRegionById } from "@/lib/regions";
import {
  sampleLatency,
  sampleLatencyBetweenRegions,
} from "@/lib/simulation/latency";
import {
  FlowPanel,
  RegionSummary,
  ClientLocationBlock,
  CommandTerminal,
  LatencyCounter,
  ExecuteFooter,
  LessonSequence,
  type LessonBeat,
} from "./FlowPanel";

const WRITE_BEATS = [
  {
    title: "Send to the leader",
    detail:
      "The client sends the command to the only region allowed to accept writes. More distance means more write latency.",
  },
  {
    title: "Commit and acknowledge",
    detail:
      "The leader stores the value and returns OK. The client can continue even though remote replicas are still behind.",
  },
  {
    title: "Copy in the background",
    detail:
      "The leader sends the committed value to every read replica. Each copy catches up after its own network delay.",
  },
] as const satisfies readonly LessonBeat[];

function InsightInline() {
  const primaryLatencyMs = useWriteFlowStore((s) => s.primaryLatencyMs);
  const replicaStatuses = useWriteFlowStore((s) => s.replicaStatuses);

  const maxReplicationMs = Math.max(
    ...replicaStatuses.map((r) => r.latencyMs),
    0
  );
  const totalMs = primaryLatencyMs + maxReplicationMs;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500/70 mb-1.5">
        Key Insight
      </p>
      <p className="text-xs leading-relaxed text-zinc-300">
        Write confirmed in{" "}
        <span className="font-mono font-semibold text-cyan-400">
          {primaryLatencyMs}ms
        </span>
        . Full replication in{" "}
        <span className="font-mono font-semibold text-emerald-400">
          {totalMs}ms
        </span>
        .
      </p>
      <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
        Replicas are eventually consistent. The client gets{" "}
        <span className="font-mono text-emerald-400">OK</span> before all
        replicas have the data.
      </p>
    </motion.div>
  );
}

export default function WritePanel({ onNext }: { onNext?: () => void }) {
  const primaryRegion = useDatabaseStore((s) => s.primaryRegion);
  const readRegions = useDatabaseStore((s) => s.readRegions);

  const clientLocation = useWriteFlowStore((s) => s.clientLocation);
  const phase = useWriteFlowStore((s) => s.phase);
  const command = useWriteFlowStore((s) => s.command);
  const response = useWriteFlowStore((s) => s.response);
  const primaryProgress = useWriteFlowStore((s) => s.primaryProgress);
  const primaryLatencyMs = useWriteFlowStore((s) => s.primaryLatencyMs);

  const primary = primaryRegion ? getRegionById(primaryRegion) : null;

  const canExecute =
    clientLocation !== null && primary !== null && phase === "idle";
  const canAdvance = phase === "primary-ack";
  const isAnimating = phase === "to-primary" || phase === "replicating";

  const handleExecute = useCallback(() => {
    if (!clientLocation || !primary || !primaryRegion) return;

    const primaryLatency = sampleLatency(
      clientLocation.lat,
      clientLocation.lon,
      primary.lat,
      primary.lon
    );

    const replicas = readRegions
      .map((id) => {
        const latency = sampleLatencyBetweenRegions(primaryRegion, id);
        return latency !== null ? { regionId: id, latencyMs: latency } : null;
      })
      .filter((r) => r !== null);

    useWriteFlowStore.getState().startAnimation(primaryLatency, replicas);
  }, [clientLocation, primary, primaryRegion, readRegions]);

  const handleStartReplication = useCallback(() => {
    useWriteFlowStore.getState().startReplication();
  }, []);

  const handleReplay = useCallback(() => {
    useWriteFlowStore.getState().reset();
  }, []);

  const activeBeat =
    phase === "idle" || phase === "to-primary"
      ? 0
      : phase === "primary-ack"
        ? 1
        : 2;
  const actionLabel =
    phase === "primary-ack"
      ? `Copy to ${readRegions.length} replica${readRegions.length !== 1 ? "s" : ""}`
      : "Send write";
  const busyLabel =
    phase === "replicating" ? "Copying to replicas..." : "Sending to leader...";

  const displayedLatency =
    phase === "to-primary"
      ? Math.round(primaryProgress * primaryLatencyMs)
      : phase !== "idle"
        ? primaryLatencyMs
        : null;

  return (
    <FlowPanel
      title="Follow a Write"
      description="Advance through the commit, acknowledgement, and background copy"
      footer={
        <ExecuteFooter
          complete={phase === "complete"}
          onExecute={
            phase === "primary-ack" ? handleStartReplication : handleExecute
          }
          onReplay={handleReplay}
          disabled={!canExecute && !canAdvance}
          busy={isAnimating}
          executeLabel={actionLabel}
          busyLabel={busyLabel}
          nextLabel="Read from a replica"
          onNext={onNext}
          completeHint="Move the client and replay to see how leader distance changes commit latency"
        />
      }
    >
      <RegionSummary />
      <ClientLocationBlock location={clientLocation} />
      <LessonSequence
        beats={WRITE_BEATS}
        activeIndex={activeBeat}
        running={isAnimating}
        complete={phase === "complete"}
      />
      <CommandTerminal
        value={command}
        onChange={(cmd) => useWriteFlowStore.getState().setCommand(cmd)}
        disabled={phase !== "idle"}
        response={response}
      />
      {displayedLatency !== null && (
        <LatencyCounter
          value={displayedLatency}
          label={phase === "to-primary" ? "traveling..." : "write latency"}
        />
      )}
      {phase === "complete" && <InsightInline />}
    </FlowPanel>
  );
}
