"use client";

import { useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useDatabaseStore } from "@/lib/store/database-store";
import { useWriteFlowStore } from "@/lib/store/write-flow-store";
import { getRegionById } from "@/lib/regions";
import { calculateDistance } from "@/lib/geo-utils";
import {
  estimateLatency,
  estimateLatencyBetweenRegions,
} from "@/lib/simulation/latency";
import { playPacketSendSound } from "@/lib/sounds";
import {
  FlowPanel,
  RegionSummary,
  ClientLocationBlock,
  CommandTerminal,
  LatencyCounter,
  ExecuteFooter,
} from "./FlowPanel";

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
      <p className="mt-1.5 text-[11px] text-zinc-500">
        Replicas are eventually consistent — the client gets{" "}
        <span className="font-mono text-emerald-400">OK</span> before all
        replicas have the data.
      </p>
    </motion.div>
  );
}

function PhaseNarration() {
  const phase = useWriteFlowStore((s) => s.phase);
  const clientLocation = useWriteFlowStore((s) => s.clientLocation);
  const replicaStatuses = useWriteFlowStore((s) => s.replicaStatuses);
  const primaryRegion = useDatabaseStore((s) => s.primaryRegion);

  const primary = primaryRegion ? getRegionById(primaryRegion) : null;

  const distanceKm = useMemo(() => {
    if (!clientLocation || !primary) return null;
    return Math.round(
      calculateDistance(
        clientLocation.lat,
        clientLocation.lon,
        primary.lat,
        primary.lon
      )
    );
  }, [clientLocation, primary]);

  const furthestReplica = useMemo(() => {
    if (replicaStatuses.length === 0) return null;
    const sorted = [...replicaStatuses].sort(
      (a, b) => b.latencyMs - a.latencyMs
    );
    const region = getRegionById(sorted[0].regionId);
    return region
      ? { city: region.city, latencyMs: sorted[0].latencyMs }
      : null;
  }, [replicaStatuses]);

  let text: string | null = null;

  if (phase === "idle" && clientLocation && primary) {
    text = `Ready. Your command will travel ${distanceKm?.toLocaleString()}km to the primary in ${primary.city}.`;
  } else if (phase === "to-primary" && primary) {
    text = `Your SET command is crossing ${distanceKm?.toLocaleString()}km to reach the primary in ${primary.city}...`;
  } else if (phase === "primary-ack") {
    const verb = replicaStatuses.length === 1 ? "doesn't" : "don't";
    text = `Primary confirmed! Client gets OK. But ${replicaStatuses.length} read replica${replicaStatuses.length !== 1 ? "s" : ""} ${verb} have this data yet...`;
  } else if (phase === "replicating" && furthestReplica) {
    text = `Data is fanning out to ${replicaStatuses.length} replica${replicaStatuses.length !== 1 ? "s" : ""}. The furthest is ${furthestReplica.city} (${furthestReplica.latencyMs}ms away)...`;
  }

  if (!text) return null;

  return (
    <motion.p
      key={phase}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="text-[11px] leading-relaxed text-zinc-500 italic"
    >
      {text}
    </motion.p>
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
  const isAnimating =
    phase === "to-primary" ||
    phase === "primary-ack" ||
    phase === "replicating";

  const handleExecute = useCallback(() => {
    if (!clientLocation || !primary || !primaryRegion) return;

    const primaryLatency = estimateLatency(
      clientLocation.lat,
      clientLocation.lon,
      primary.lat,
      primary.lon
    );

    const replicas = readRegions
      .map((id) => {
        const latency = estimateLatencyBetweenRegions(primaryRegion, id);
        return latency !== null ? { regionId: id, latencyMs: latency } : null;
      })
      .filter((r) => r !== null);

    playPacketSendSound();
    useWriteFlowStore.getState().startAnimation(primaryLatency, replicas);
  }, [clientLocation, primary, primaryRegion, readRegions]);

  const handleReplay = useCallback(() => {
    useWriteFlowStore.getState().reset();
  }, []);

  const displayedLatency =
    phase === "to-primary"
      ? Math.round(primaryProgress * primaryLatencyMs)
      : phase !== "idle"
        ? primaryLatencyMs
        : null;

  return (
    <FlowPanel
      title="Write Flow"
      description="Watch data travel from client to primary, then replicate to all regions"
      footer={
        <ExecuteFooter
          complete={phase === "complete"}
          onExecute={handleExecute}
          onReplay={handleReplay}
          disabled={!canExecute}
          busy={isAnimating}
          nextLabel="Compare reads"
          onNext={onNext}
          completeHint="Click a different spot on the globe to see how distance affects write latency"
        />
      }
    >
      <RegionSummary />
      <ClientLocationBlock location={clientLocation} />
      <CommandTerminal
        value={command}
        onChange={(cmd) => useWriteFlowStore.getState().setCommand(cmd)}
        disabled={phase !== "idle"}
        response={response}
      />
      <PhaseNarration />
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
