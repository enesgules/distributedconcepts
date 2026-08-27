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
          title="Choose where writes start"
        >
          <PathStrip items={["client", "leader"]} activeIndex={0} />
        </Stage>
      ) : !replica ? (
        <Stage
          title="Add a copy near readers"
        >
          <PathStrip items={[primary.city, "network", "copy"]} activeIndex={1} />
          <LatencyLegend />
        </Stage>
      ) : (
        <Stage
          title={`${primary.city} writes. ${replica.city} reads.`}
        >
          <PathStrip items={[primary.city, "copy", replica.city]} activeIndex={2} />
          <LatencyLegend />
        </Stage>
      )}

      {primary && replica && beforeLatency !== null && afterLatency !== null ? (
        <ResultCard>
          Read latency: <strong className="font-mono text-zinc-50">{beforeLatency}ms</strong>
          <span className="px-2 text-zinc-500">→</span>
          <strong className="font-mono text-emerald-300">{afterLatency}ms</strong>
        </ResultCard>
      ) : null}
    </CoursePanel>
  );
}

function LatencyLegend() {
  return (
    <div
      className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--text-tertiary)]"
      aria-label="Map colors show read latency from fast to slow"
    >
      <span>Read latency</span>
      <span className="flex items-center gap-2" aria-hidden="true">
        <span className="size-1.5 rounded-full bg-emerald-400" />
        Fast
        <span className="h-px w-5 bg-linear-to-r from-emerald-400 via-amber-400 to-red-400" />
        Slow
        <span className="size-1.5 rounded-full bg-red-400" />
      </span>
    </div>
  );
}
