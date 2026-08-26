"use client";

import { useMemo } from "react";
import { useDatabaseStore } from "@/lib/store/database-store";
import { getRegionById, regions, type Region } from "@/lib/regions";
import { calculateGlobalCoverage } from "@/lib/simulation/latency";
import { playRegionToggleSound, playSelectSound } from "@/lib/sounds";
import {
  ActionButton,
  CoursePanel,
  PathStrip,
  ResultCard,
  Stage,
} from "./CoursePanel";

function findBestReplica(primary: Region): Region | null {
  let best: Region | null = null;
  let bestCoverage = Number.POSITIVE_INFINITY;
  for (const region of regions) {
    if (region.provider !== primary.provider || region.id === primary.id) continue;
    const coverage = calculateGlobalCoverage(primary.id, [region.id]);
    if (coverage < bestCoverage) {
      best = region;
      bestCoverage = coverage;
    }
  }
  return best;
}

export default function BuildPanel({
  suggestedLeader,
  onNext,
}: {
  suggestedLeader: Region | null;
  onNext: () => void;
}) {
  const primaryRegion = useDatabaseStore((state) => state.primaryRegion);
  const readRegions = useDatabaseStore((state) => state.readRegions);
  const primary = primaryRegion ? getRegionById(primaryRegion) ?? null : null;
  const replica = readRegions[0] ? getRegionById(readRegions[0]) ?? null : null;
  const recommendedReplica = useMemo(
    () => (primary ? findBestReplica(primary) : null),
    [primary]
  );

  const beforeLatency = primary ? calculateGlobalCoverage(primary.id, []) : null;
  const afterLatency =
    primary && replica ? calculateGlobalCoverage(primary.id, [replica.id]) : null;

  const placeLeader = () => {
    if (!suggestedLeader) return;
    playSelectSound();
    useDatabaseStore.getState().setPrimary(suggestedLeader.id);
  };

  const addReplica = () => {
    if (!recommendedReplica) return;
    playRegionToggleSound(false, true);
    useDatabaseStore.getState().addReadRegion(recommendedReplica.id);
  };

  const footer = !primary ? (
    <ActionButton onClick={placeLeader} disabled={!suggestedLeader}>
      {suggestedLeader ? `Place leader in ${suggestedLeader.city}` : "Finding a nearby region…"}
    </ActionButton>
  ) : !replica ? (
    <ActionButton onClick={addReplica} disabled={!recommendedReplica}>
      {recommendedReplica ? `Add a copy in ${recommendedReplica.city}` : "Choose a copy"}
    </ActionButton>
  ) : (
    <ActionButton onClick={onNext}>Follow one write</ActionButton>
  );

  return (
    <CoursePanel lessonId="build" footer={footer}>
      {!primary ? (
        <Stage
          label="First, choose one machine"
          title="The leader stores every write"
          detail="Start near your first users."
        >
          <PathStrip items={["client", "leader"]} activeIndex={0} />
        </Stage>
      ) : !replica ? (
        <Stage
          label={`${primary.city} is the leader`}
          title="One copy is far from most readers"
          detail="Add one replica on the other side of the world. It can answer nearby reads."
        >
          <PathStrip items={[primary.city, "network", "copy"]} activeIndex={1} />
        </Stage>
      ) : (
        <Stage
          label="System ready"
          title={`${primary.city} writes. ${replica.city} reads.`}
          detail="Both machines store the same data. The leader remains the only place that accepts writes."
        >
          <PathStrip items={[primary.city, "copy", replica.city]} activeIndex={2} />
        </Stage>
      )}

      {primary && replica && beforeLatency !== null && afterLatency !== null ? (
        <ResultCard>
          Average read latency falls from <strong className="font-mono text-zinc-50">{beforeLatency}ms</strong> to{" "}
          <strong className="font-mono text-emerald-300">{afterLatency}ms</strong>. The tradeoff is that the copy needs time to catch up.
        </ResultCard>
      ) : null}
    </CoursePanel>
  );
}
