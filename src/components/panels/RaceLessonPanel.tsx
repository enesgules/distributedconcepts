"use client";

import { useDatabaseStore } from "@/lib/store/database-store";
import { useConsistencyRaceStore } from "@/lib/store/consistency-race-store";
import { getRegionById } from "@/lib/regions";
import { sampleLatency, sampleLatencyBetweenRegions } from "@/lib/simulation/latency";
import {
  ActionButton,
  CoursePanel,
  PathStrip,
  ResultCard,
  Stage,
} from "./CoursePanel";

export default function RaceLessonPanel({ onNext }: { onNext: () => void }) {
  const primaryRegion = useDatabaseStore((state) => state.primaryRegion);
  const readRegions = useDatabaseStore((state) => state.readRegions);
  const clientLocation = useConsistencyRaceStore((state) => state.clientLocation);
  const phase = useConsistencyRaceStore((state) => state.phase);
  const readDelay = useConsistencyRaceStore((state) => state.readDelay);
  const isStale = useConsistencyRaceStore((state) => state.isStale);
  const replicationLatencyMs = useConsistencyRaceStore((state) => state.replicationLatencyMs);
  const readLatencyMs = useConsistencyRaceStore((state) => state.readLatencyMs);
  const primary = primaryRegion ? getRegionById(primaryRegion) ?? null : null;
  const replica = readRegions[0] ? getRegionById(readRegions[0]) ?? null : null;

  const commitValue = () => {
    if (!clientLocation || !primary || !replica || !primaryRegion) return;
    const primaryLatency = sampleLatency(
      clientLocation.lat,
      clientLocation.lon,
      primary.lat,
      primary.lon
    );
    const replicationLatency = sampleLatencyBetweenRegions(primaryRegion, replica.id);
    const readLatency = sampleLatency(
      clientLocation.lat,
      clientLocation.lon,
      replica.lat,
      replica.lon
    );
    if (replicationLatency === null) return;
    useConsistencyRaceStore
      .getState()
      .startRace(primaryLatency, replicationLatency, readLatency);
  };

  const startRead = (delayMs: number) => {
    const store = useConsistencyRaceStore.getState();
    store.setReadDelay(delayMs);
    store.startReplicationRace();
  };

  const isBusy = phase === "writing" || phase === "racing" || phase === "result";
  const activeIndex =
    phase === "idle" || phase === "writing"
      ? 0
      : phase === "write-ack"
        ? 1
        : phase === "racing"
          ? 2
          : 3;
  const margin = Math.abs(readDelay + readLatencyMs - replicationLatencyMs);
  const safeReadDelay = Math.max(
    200,
    Math.ceil((replicationLatencyMs - readLatencyMs + 50) / 50) * 50
  );

  const footer =
    phase === "idle" ? (
      <ActionButton onClick={commitValue} disabled={!clientLocation || !primary || !replica}>
        Write score = 2
      </ActionButton>
    ) : phase === "write-ack" ? (
      <div className="grid grid-cols-2 gap-2">
        <ActionButton tone="secondary" onClick={() => startRead(safeReadDelay)}>
          Wait {safeReadDelay}ms
        </ActionButton>
        <ActionButton onClick={() => startRead(0)}>Read now</ActionButton>
      </div>
    ) : phase === "complete" ? (
      <div className="space-y-2">
        <ActionButton onClick={onNext}>Break the leader</ActionButton>
        <ActionButton tone="secondary" onClick={() => useConsistencyRaceStore.getState().reset()}>
          Try the other timing
        </ActionButton>
      </div>
    ) : (
      <ActionButton disabled>
        {phase === "writing" ? "Writing to the leader…" : "Racing read against copy…"}
      </ActionButton>
    );

  return (
    <CoursePanel lessonId="stale-read" footer={footer}>
      <Stage
        label={
          phase === "idle"
            ? `${primary?.city ?? "Leader"}: v1 · ${replica?.city ?? "Replica"}: v1`
            : phase === "write-ack"
              ? `${primary?.city ?? "Leader"}: v2 · ${replica?.city ?? "Replica"}: v1`
              : phase === "complete"
                ? `${replica?.city ?? "Replica"} returned ${isStale ? "v1" : "v2"}`
                : isBusy
                  ? "Packets in flight"
                  : "Race complete"
        }
        title={
          phase === "write-ack"
            ? "The copies disagree right now"
            : phase === "complete"
              ? isStale
                ? "The read found the old value"
                : "The copy arrived first"
              : "Update the leader, then read the replica"
        }
        detail={
          phase === "write-ack"
            ? "Choose when to read. The globe will reveal which packet reaches the replica first."
            : phase === "complete"
              ? isStale
                ? "Your read reached the replica before the update. This brief gap is eventual consistency."
                : "You waited long enough for replication, so the replica returned the latest value."
              : "A nearby replica is fast, but it may not have the newest write yet."
        }
      >
        <PathStrip items={["write v2", "leader", "race", "result"]} activeIndex={activeIndex} />
      </Stage>

      {phase === "complete" && isStale !== null ? (
        <ResultCard>
          {isStale ? "The read" : "The update"} won by{" "}
          <strong className="font-mono text-emerald-300">{margin}ms</strong>. Timing, not distance alone, decided the answer.
        </ResultCard>
      ) : null}
    </CoursePanel>
  );
}
