"use client";

import { useDatabaseStore } from "@/lib/store/database-store";
import { useWriteFlowStore } from "@/lib/store/write-flow-store";
import { getRegionById } from "@/lib/regions";
import { sampleLatency, sampleLatencyBetweenRegions } from "@/lib/simulation/latency";
import {
  ActionButton,
  CoursePanel,
  PathStrip,
  ResultCard,
  Stage,
} from "./CoursePanel";

export default function WriteLessonPanel({ onNext }: { onNext: () => void }) {
  const primaryRegion = useDatabaseStore((state) => state.primaryRegion);
  const readRegions = useDatabaseStore((state) => state.readRegions);
  const clientLocation = useWriteFlowStore((state) => state.clientLocation);
  const phase = useWriteFlowStore((state) => state.phase);
  const primaryLatencyMs = useWriteFlowStore((state) => state.primaryLatencyMs);
  const replicaStatuses = useWriteFlowStore((state) => state.replicaStatuses);
  const primary = primaryRegion ? getRegionById(primaryRegion) ?? null : null;
  const replica = readRegions[0] ? getRegionById(readRegions[0]) ?? null : null;

  const sendWrite = () => {
    if (!clientLocation || !primary || !primaryRegion) return;
    const primaryLatency = sampleLatency(
      clientLocation.lat,
      clientLocation.lon,
      primary.lat,
      primary.lon
    );
    const replicas = readRegions.flatMap((regionId) => {
      const latencyMs = sampleLatencyBetweenRegions(primaryRegion, regionId);
      return latencyMs === null ? [] : [{ regionId, latencyMs }];
    });
    useWriteFlowStore.getState().startAnimation(primaryLatency, replicas);
  };

  const isSending = phase === "to-primary";
  const activeIndex =
    phase === "idle" || phase === "to-primary"
      ? 0
      : phase === "primary-ack"
        ? 1
        : 2;
  const replicationLatency = replicaStatuses[0]?.latencyMs ?? 0;

  const footer =
    phase === "idle" ? (
      <ActionButton onClick={sendWrite} disabled={!clientLocation || !primary}>
        Send score = 1
      </ActionButton>
    ) : phase === "primary-ack" ? (
      <ActionButton onClick={() => useWriteFlowStore.getState().startReplication()}>
        Copy to {replica?.city ?? "the replica"}
      </ActionButton>
    ) : phase === "complete" ? (
      <div className="space-y-2">
        <ActionButton onClick={onNext}>Race the copy</ActionButton>
        <ActionButton tone="secondary" onClick={() => useWriteFlowStore.getState().reset()}>
          Replay
        </ActionButton>
      </div>
    ) : (
      <ActionButton disabled>
        {isSending ? "Sending to the leader…" : "Copying in the background…"}
      </ActionButton>
    );

  return (
    <CoursePanel lessonId="write" footer={footer}>
      <Stage
        title={
          phase === "primary-ack"
            ? `${primary?.city ?? "Leader"} returned OK`
            : phase === "complete"
              ? "Both copies have score = 1"
              : isSending
                ? `Sending to ${primary?.city ?? "the leader"}`
                : phase === "replicating"
                  ? `Copying to ${replica?.city ?? "the replica"}`
                  : `Send score = 1 to ${primary?.city ?? "the leader"}`
        }
        detail={
          phase === "primary-ack"
            ? `${replica?.city ?? "The copy"} still has the old value.`
            : phase === "idle"
              ? "Only the leader accepts writes."
              : undefined
        }
      >
        <PathStrip items={["client", "leader", "copy"]} activeIndex={activeIndex} />
      </Stage>

      {phase === "complete" ? (
        <ResultCard>
          OK <strong className="font-mono text-cyan-300">{primaryLatencyMs}ms</strong>
          <span className="px-2 text-zinc-500">·</span>
          copy +<strong className="font-mono text-emerald-300">{replicationLatency}ms</strong>
        </ResultCard>
      ) : null}
    </CoursePanel>
  );
}
