"use client";

import { useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useDatabaseStore } from "@/lib/store/database-store";
import { useReadFlowStore } from "@/lib/store/read-flow-store";
import { getRegionById } from "@/lib/regions";
import { estimateLatency, findNearestRegion } from "@/lib/simulation/latency";
import { playPacketSendSound } from "@/lib/sounds";
import {
  FlowPanel,
  RegionSummary,
  ClientLocationBlock,
  CommandTerminal,
  LatencyCounter,
  ExecuteFooter,
  SectionLabel,
} from "./FlowPanel";

function InsightInline() {
  const nearestRegionId = useReadFlowStore((s) => s.nearestRegionId);
  const nearestLatencyMs = useReadFlowStore((s) => s.nearestLatencyMs);
  const primaryLatencyMs = useReadFlowStore((s) => s.primaryLatencyMs);
  const primaryRegionId = useDatabaseStore((s) => s.primaryRegion);

  const nearestRegion = nearestRegionId
    ? getRegionById(nearestRegionId)
    : null;

  const isSameAsPrimary = nearestRegionId === primaryRegionId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500/70 mb-1.5">
        Key Insight
      </p>
      {isSameAsPrimary ? (
        <>
          <p className="text-xs leading-relaxed text-zinc-300">
            Read served from the{" "}
            <span className="font-semibold text-amber-400">primary</span> (
            {nearestRegion?.city ?? nearestRegionId}) in{" "}
            <span className="font-mono font-semibold text-cyan-400">
              {nearestLatencyMs}ms
            </span>
            . The primary is already the closest region to you.
          </p>
          <p className="mt-1.5 text-[11px] text-zinc-500">
            Try placing your client closer to a read replica to see the
            routing advantage.
          </p>
        </>
      ) : (
        <>
          <p className="text-xs leading-relaxed text-zinc-300">
            Read served from{" "}
            <span className="font-semibold text-emerald-400">
              {nearestRegion?.city ?? nearestRegionId}
            </span>{" "}
            in{" "}
            <span className="font-mono font-semibold text-cyan-400">
              {nearestLatencyMs}ms
            </span>
            . Reading from primary would take{" "}
            <span className="font-mono font-semibold text-zinc-400">
              {primaryLatencyMs}ms
            </span>{" "}
            — {(primaryLatencyMs / nearestLatencyMs).toFixed(1)}x slower!
          </p>
          <p className="mt-1.5 text-[11px] text-zinc-500">
            Reads are routed to the nearest replica automatically, giving
            low-latency access from anywhere.
          </p>
        </>
      )}
    </motion.div>
  );
}

export default function ReadPanel() {
  const primaryRegion = useDatabaseStore((s) => s.primaryRegion);
  const readRegions = useDatabaseStore((s) => s.readRegions);

  const clientLocation = useReadFlowStore((s) => s.clientLocation);
  const phase = useReadFlowStore((s) => s.phase);
  const command = useReadFlowStore((s) => s.command);
  const response = useReadFlowStore((s) => s.response);
  const fetchProgress = useReadFlowStore((s) => s.fetchProgress);
  const nearestLatencyMs = useReadFlowStore((s) => s.nearestLatencyMs);

  const primary = primaryRegion ? getRegionById(primaryRegion) : null;

  // Find nearest region in real-time as client moves
  const allRegionIds = useMemo(
    () => (primaryRegion ? [primaryRegion, ...readRegions] : []),
    [primaryRegion, readRegions]
  );

  const nearest = useMemo(() => {
    if (!clientLocation) return null;
    return findNearestRegion(clientLocation.lat, clientLocation.lon, allRegionIds);
  }, [clientLocation, allRegionIds]);

  const canExecute =
    clientLocation !== null && nearest !== null && phase === "idle";
  const isAnimating =
    phase === "fetching" || phase === "arriving" || phase === "responding";

  const handleExecute = useCallback(() => {
    if (!clientLocation || !nearest || !primary || !primaryRegion) return;

    const nearestLatency = estimateLatency(
      clientLocation.lat,
      clientLocation.lon,
      nearest.region.lat,
      nearest.region.lon
    );
    const primaryLatency = estimateLatency(
      clientLocation.lat,
      clientLocation.lon,
      primary.lat,
      primary.lon
    );

    playPacketSendSound();
    useReadFlowStore
      .getState()
      .startRead(nearest.region.id, nearestLatency, primaryLatency);
  }, [clientLocation, nearest, primary, primaryRegion]);

  const handleReplay = useCallback(() => {
    useReadFlowStore.getState().reset();
  }, []);

  const displayedLatency =
    phase === "fetching"
      ? Math.round(fetchProgress * nearestLatencyMs)
      : phase !== "idle" && nearestLatencyMs > 0
        ? nearestLatencyMs
        : null;

  return (
    <FlowPanel
      title="Read Flow"
      description="See how reads route to the nearest replica for low latency"
      footer={
        <ExecuteFooter
          complete={phase === "complete"}
          onExecute={handleExecute}
          onReplay={handleReplay}
          disabled={!canExecute}
          busy={isAnimating}
        />
      }
    >
      <RegionSummary />
      <ClientLocationBlock location={clientLocation} />

      {/* Nearest Region (real-time) */}
      {nearest && phase === "idle" && (
        <div>
          <SectionLabel>Nearest Region</SectionLabel>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 text-xs">→</span>
            <span className="text-[11px] text-zinc-300">
              {nearest.region.city}
            </span>
            <span className="font-mono text-[11px] text-emerald-400">
              ~{nearest.latencyMs}ms
            </span>
          </div>
        </div>
      )}

      <CommandTerminal
        value={command}
        onChange={(cmd) => useReadFlowStore.getState().setCommand(cmd)}
        disabled={phase !== "idle"}
        response={response}
      />

      {displayedLatency !== null && (
        <LatencyCounter
          value={displayedLatency}
          label={phase === "fetching" ? "fetching..." : "read latency"}
        />
      )}

      {phase === "complete" && <InsightInline />}
    </FlowPanel>
  );
}
