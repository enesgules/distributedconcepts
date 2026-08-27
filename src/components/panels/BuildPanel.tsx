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

  const chooseAnotherReplica = () => {
    if (!replica) return;
    playRegionToggleSound(true, true);
    useDatabaseStore.getState().removeReadRegion(replica.id);
  };

  const footer = !primary ? (
    <RegionChoice
      prompt="Pick any region"
      shortcut={suggestedLeader ? `Use ${suggestedLeader.city}` : "Finding nearby…"}
      onShortcut={placeLeader}
      disabled={!suggestedLeader}
    />
  ) : !replica ? (
    <RegionChoice
      prompt="Pick another region"
      shortcut={recommendedReplica ? `Use ${recommendedReplica.city}` : "Finding a copy…"}
      onShortcut={addReplica}
      disabled={!recommendedReplica}
    />
  ) : (
    <div className="grid grid-cols-2 gap-2">
      <ActionButton tone="secondary" onClick={chooseAnotherReplica}>
        Try another copy
      </ActionButton>
      <ActionButton onClick={onNext}>Follow one write</ActionButton>
    </div>
  );

  return (
    <CoursePanel lessonId="build" footer={footer}>
      {!primary ? (
        <Stage
          title="Pick where writes start"
        >
          <PathStrip items={["client", "leader"]} activeIndex={0} />
        </Stage>
      ) : !replica ? (
        <Stage
          title="Pick a second region"
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

function RegionChoice({
  prompt,
  shortcut,
  onShortcut,
  disabled,
}: {
  prompt: string;
  shortcut: string;
  onShortcut: () => void;
  disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
      <p className="flex min-h-11 items-center gap-2 pl-7 text-sm font-medium text-zinc-200 md:pl-1">
        <span
          className="size-2 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.65)]"
          aria-hidden="true"
        />
        {prompt}
      </p>
      <ActionButton tone="secondary" onClick={onShortcut} disabled={disabled}>
        {shortcut}
      </ActionButton>
    </div>
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
