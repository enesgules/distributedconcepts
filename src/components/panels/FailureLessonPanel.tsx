"use client";

import { useDatabaseStore } from "@/lib/store/database-store";
import { useFailoverStore } from "@/lib/store/failover-store";
import { getRegionById } from "@/lib/regions";
import {
  ActionButton,
  CoursePanel,
  PathStrip,
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
        Confirm failure
      </ActionButton>
    ) : detectionReady ? (
      <ActionButton onClick={() => useFailoverStore.getState().startElection()}>
        Promote standby
      </ActionButton>
    ) : phase === "elected" ? (
      <ActionButton onClick={() => useFailoverStore.getState().startRecovery()}>
        Resume writes
      </ActionButton>
    ) : phase === "complete" ? (
      <div className="space-y-2">
        <ActionButton onClick={onFinish}>View course</ActionButton>
        <ActionButton tone="secondary" onClick={() => useFailoverStore.getState().replay()}>
          Replay
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
      ? `${primary?.city ?? "Leader"} has a standby`
      : phase === "failure"
        ? "Writes stop. Reads continue."
        : phase === "detecting"
          ? "Checking the failure"
          : phase === "electing"
            ? "Promoting the standby"
            : phase === "elected"
              ? "New leader ready"
              : phase === "complete"
                ? `Recovered in ${downtimeMs}ms`
                : "Resuming writes";

  const detail =
    phase === "idle"
      ? "Same region. Different machine."
      : phase === "failure"
        ? undefined
        : phase === "detecting"
          ? "One timeout is not enough."
          : phase === "electing"
            ? undefined
            : phase === "elected"
              ? "Clients must reconnect."
              : phase === "complete"
                ? "Reads stayed online."
                : undefined;

  return (
    <CoursePanel lessonId="failure" footer={footer}>
      <Stage
        title={title}
        detail={detail}
      >
        <PathStrip items={["fail", "confirm", "standby", "resume"]} activeIndex={activeIndex} />
      </Stage>
    </CoursePanel>
  );
}
