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
  LessonSequence,
  type LessonBeat,
} from "./FlowPanel";

const READ_BEATS = [
  {
    title: "Choose the nearest copy",
    detail:
      "The router compares the client with every available copy and chooses the shortest network path.",
  },
  {
    title: "Fetch the value",
    detail:
      "The request reaches the selected region. That region reads its local copy without contacting the leader.",
  },
  {
    title: "Return to the client",
    detail:
      "The selected region sends the value back along the same short path. The leader stays out of the read path.",
  },
] as const satisfies readonly LessonBeat[];

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
            <span className="font-semibold text-amber-400">leader</span> (
            {nearestRegion?.city ?? nearestRegionId}) in{" "}
            <span className="font-mono font-semibold text-cyan-400">
              {nearestLatencyMs}ms
            </span>
            . The leader is already the closest region to you.
          </p>
          <p className="mt-1.5 text-[11px] text-zinc-500">
            Move the client closer to a read replica to see the
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
            . Reading from the leader would take{" "}
            <span className="font-mono font-semibold text-zinc-400">
              {primaryLatencyMs}ms
            </span>{" "}
            and be {(primaryLatencyMs / nearestLatencyMs).toFixed(1)}x slower.
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

export default function ReadPanel({ onNext }: { onNext?: () => void }) {
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
  const canAdvance = phase === "arriving";
  const isAnimating = phase === "fetching" || phase === "responding";

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

  const handleReturnResponse = useCallback(() => {
    useReadFlowStore.getState().startResponse();
  }, []);

  const handleReplay = useCallback(() => {
    useReadFlowStore.getState().reset();
  }, []);

  const activeBeat =
    phase === "idle" || phase === "fetching"
      ? 0
      : phase === "arriving"
        ? 1
        : 2;
  const actionLabel =
    phase === "arriving" ? "Return value to client" : "Route read";
  const busyLabel =
    phase === "responding" ? "Returning value..." : "Fetching local copy...";

  const displayedLatency =
    phase === "fetching"
      ? Math.round(fetchProgress * nearestLatencyMs)
      : phase !== "idle" && nearestLatencyMs > 0
        ? nearestLatencyMs
        : null;

  return (
    <FlowPanel
      title="Read from a Replica"
      description="Follow the router's choice, the local lookup, and the response"
      footer={
        <ExecuteFooter
          complete={phase === "complete"}
          onExecute={
            phase === "arriving" ? handleReturnResponse : handleExecute
          }
          onReplay={handleReplay}
          disabled={!canExecute && !canAdvance}
          busy={isAnimating}
          executeLabel={actionLabel}
          busyLabel={busyLabel}
          nextLabel="Observe a stale read"
          onNext={onNext}
        />
      }
    >
      <RegionSummary />
      <ClientLocationBlock location={clientLocation} />
      <LessonSequence
        beats={READ_BEATS}
        activeIndex={activeBeat}
        running={isAnimating}
        complete={phase === "complete"}
      />

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
