"use client";

import { useDatabaseStore } from "@/lib/store/database-store";
import { useFailoverStore } from "@/lib/store/failover-store";
import { getRegionById } from "@/lib/regions";
import {
  ActionButton,
  CoursePanel,
  PathStrip,
  ResultCard,
  Stage,
} from "./CoursePanel";

export default function FailureLessonPanel({
  onFinish,
}: {
  onFinish: () => void;
}) {
  const primaryRegion = useDatabaseStore((state) => state.primaryRegion);
  const readRegions = useDatabaseStore((state) => state.readRegions);
  const phase = useFailoverStore((state) => state.phase);
  const failureFlashProgress = useFailoverStore((state) => state.failureFlashProgress);
  const detectionProgress = useFailoverStore((state) => state.detectionProgress);
  const downtimeMs = useFailoverStore((state) => state.downtimeMs);
  const primary = primaryRegion ? getRegionById(primaryRegion) ?? null : null;

  const failureReady = phase === "failure" && failureFlashProgress >= 1;
  const detectionReady = phase === "detecting" && detectionProgress >= 1;
  const busy =
    (phase === "failure" && !failureReady) ||
    (phase === "detecting" && !detectionReady) ||
    phase === "electing" ||
    phase === "recovering";
  const activeIndex =
    phase === "idle" || (phase === "failure" && !failureReady)
      ? 0
      : phase === "failure" || phase === "detecting"
        ? 1
        : phase === "electing" || phase === "elected"
          ? 2
          : 3;

  const footer =
    phase === "idle" ? (
      <ActionButton
        tone="danger"
        onClick={() => useFailoverStore.getState().killPrimary()}
        disabled={!primaryRegion || readRegions.length === 0}
      >
        Fail the leader
      </ActionButton>
    ) : failureReady ? (
      <ActionButton onClick={() => useFailoverStore.getState().startDetection()}>
        Confirm the failure
      </ActionButton>
    ) : detectionReady ? (
      <ActionButton onClick={() => useFailoverStore.getState().startElection()}>
        Choose the standby
      </ActionButton>
    ) : phase === "elected" ? (
      <ActionButton onClick={() => useFailoverStore.getState().startRecovery()}>
        Resume queued writes
      </ActionButton>
    ) : phase === "complete" ? (
      <div className="space-y-2">
        <ActionButton onClick={onFinish}>View the course</ActionButton>
        <ActionButton tone="secondary" onClick={() => useFailoverStore.getState().replay()}>
          Replay the failure
        </ActionButton>
      </div>
    ) : (
      <ActionButton disabled>
        {phase === "failure"
          ? "Connections are breaking…"
          : phase === "detecting"
            ? "Checking the leader…"
            : phase === "electing"
              ? "Choosing a standby…"
              : "Resuming writes…"}
      </ActionButton>
    );

  const title =
    phase === "idle"
      ? `${primary?.city ?? "The leader"} has an in-region standby`
      : phase === "failure"
        ? "Writes stop. Reads continue."
        : phase === "detecting"
          ? "A timeout is not proof of failure"
          : phase === "electing"
            ? "The standby takes over"
            : phase === "elected"
              ? "A new leader is ready"
              : phase === "complete"
                ? "The system recovered"
                : "Queued writes are moving again";

  const detail =
    phase === "idle"
      ? "The standby is a second machine in the leader region. It stays ready without changing where writes live."
      : phase === "failure"
        ? "Read replicas can still answer. New writes wait because no leader can order them."
        : phase === "detecting"
          ? "Health checks wait long enough to separate a real outage from a slow network."
          : phase === "electing"
            ? "The in-region standby becomes leader, so the write region does not move."
            : phase === "elected"
              ? "Replicas and waiting clients still need to reconnect."
              : phase === "complete"
                ? "Reads stayed available. Writes paused, queued, and resumed in order."
                : "Replicas reconnect while queued writes drain to the new leader.";

  return (
    <CoursePanel lessonId="failure" footer={footer}>
      <Stage
        label={phase === "complete" ? "Course complete" : busy ? "System changing" : "Your next decision"}
        title={title}
        detail={detail}
      >
        <PathStrip items={["fail", "confirm", "standby", "resume"]} activeIndex={activeIndex} />
      </Stage>

      {phase === "complete" ? (
        <ResultCard>
          Writes were unavailable for <strong className="font-mono text-emerald-300">{downtimeMs}ms</strong>. Replicas kept serving reads during the outage.
        </ResultCard>
      ) : null}
    </CoursePanel>
  );
}
