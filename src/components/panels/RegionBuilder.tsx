"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDatabaseStore } from "@/lib/store/database-store";
import {
  regions,
  getRegionById,
  CONTINENT_ORDER,
  type Region,
} from "@/lib/regions";
import {
  calculateGlobalCoverage,
  estimateLatencyBetweenRegions,
} from "@/lib/simulation/latency";
import { playRegionToggleSound } from "@/lib/sounds";

interface ContinentGroup {
  name: string;
  regions: Region[];
}

function groupByContinent(regionList: Region[] = regions): ContinentGroup[] {
  return CONTINENT_ORDER.map((name) => ({
    name,
    regions: regionList.filter((r) => r.continent === name),
  })).filter((g) => g.regions.length > 0);
}

function RegionListItem({
  region,
  role,
  latency,
  onToggle,
  onHover,
}: {
  region: Region;
  role: "primary" | "read" | "available";
  latency: number | null;
  onToggle: () => void;
  onHover: (hovered: boolean) => void;
}) {
  return (
    <motion.button
      layout
      onClick={onToggle}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`group flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
        role === "primary"
          ? "border-amber-500/30 bg-amber-500/5"
          : role === "read"
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-zinc-800/50 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-800/40"
      }`}
    >
      {/* Status indicator */}
      <div
        className={`h-2 w-2 shrink-0 rounded-full ${
          role === "primary"
            ? "bg-amber-400"
            : role === "read"
              ? "bg-emerald-400"
              : "bg-zinc-700 group-hover:bg-zinc-500"
        }`}
      />

      {/* Region info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-200">
            {region.city}
          </span>
          <span
            className={`rounded px-1 py-px text-[9px] font-semibold uppercase ${
              region.provider === "aws"
                ? "bg-orange-500/10 text-orange-400"
                : "bg-blue-500/10 text-blue-400"
            }`}
          >
            {region.provider}
          </span>
        </div>
        <span className="font-mono text-[11px] text-zinc-500">
          {region.code}
        </span>
      </div>

      {/* Role badge or latency */}
      <div className="shrink-0">
        {role === "primary" && (
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
            Leader
          </span>
        )}
        {role === "read" && latency !== null && (
          <span className="font-mono text-[11px] text-emerald-400">
            {latency}ms
          </span>
        )}
      </div>
    </motion.button>
  );
}

interface RegionBuilderProps {
  suggestedRegionId?: string;
  onNext?: () => void;
}

export default function RegionBuilder({
  suggestedRegionId,
  onNext,
}: RegionBuilderProps) {
  const [query, setQuery] = useState("");
  const primaryRegion = useDatabaseStore((s) => s.primaryRegion);
  const readRegions = useDatabaseStore((s) => s.readRegions);
  const toggleRegion = useDatabaseStore((s) => s.toggleRegion);
  const setHoveredRegion = useDatabaseStore((s) => s.setHoveredRegion);
  const reset = useDatabaseStore((s) => s.reset);

  const activeProvider = primaryRegion
    ? getRegionById(primaryRegion)?.provider
    : null;
  const suggestedRegion = suggestedRegionId
    ? getRegionById(suggestedRegionId)
    : null;
  const recommendedReplica = useMemo(() => {
    if (!primaryRegion || !activeProvider || readRegions.length > 0) return null;

    let bestRegion: Region | null = null;
    let bestCoverage = Number.POSITIVE_INFINITY;
    for (const region of regions) {
      if (region.provider !== activeProvider || region.id === primaryRegion)
        continue;
      const coverage = calculateGlobalCoverage(primaryRegion, [region.id]);
      if (coverage < bestCoverage) {
        bestCoverage = coverage;
        bestRegion = region;
      }
    }
    return bestRegion;
  }, [activeProvider, primaryRegion, readRegions.length]);

  const continentGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = regions.filter((region) => {
      if (activeProvider && region.provider !== activeProvider) return false;
      if (!primaryRegion && !normalizedQuery && region.id === suggestedRegionId)
        return false;
      if (
        primaryRegion &&
        !normalizedQuery &&
        region.id === recommendedReplica?.id
      )
        return false;
      if (!normalizedQuery) return true;
      return [
        region.city,
        region.country,
        region.code,
        region.provider,
        region.continent,
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
    return groupByContinent(filtered);
  }, [
    activeProvider,
    primaryRegion,
    query,
    recommendedReplica?.id,
    suggestedRegionId,
  ]);

  function getRole(regionId: string): "primary" | "read" | "available" {
    if (regionId === primaryRegion) return "primary";
    if (readRegions.includes(regionId)) return "read";
    return "available";
  }

  function getLatency(regionId: string): number | null {
    if (!primaryRegion || regionId === primaryRegion) return null;
    return estimateLatencyBetweenRegions(primaryRegion, regionId);
  }

  function handleToggle(region: Region) {
    playRegionToggleSound(
      getRole(region.id) !== "available",
      primaryRegion !== null
    );
    toggleRegion(region.id);
  }

  const hasReplica = readRegions.length > 0;
  const primaryOnlyLatency = primaryRegion
    ? calculateGlobalCoverage(primaryRegion, [])
    : null;
  const currentLatency = primaryRegion
    ? calculateGlobalCoverage(primaryRegion, readRegions)
    : null;
  const latencySaved =
    primaryOnlyLatency !== null && currentLatency !== null
      ? primaryOnlyLatency - currentLatency
      : 0;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-zinc-800/50 bg-zinc-950/90 backdrop-blur-md">
      {/* Header */}
      <div className="shrink-0 border-b border-zinc-800/50 px-5 pt-5 pb-4">
        <h2 className="text-balance text-lg font-semibold text-zinc-100">
          Add a Read Replica
        </h2>
        <p className="mt-1 text-pretty text-xs text-zinc-400">
          Your leader commits every write. Add a copy closer to distant readers.
        </p>

        {/* Step indicator */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                primaryRegion
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "border border-zinc-700 text-zinc-600"
              }`}
            >
              {primaryRegion ? "✓" : "1"}
            </div>
            <span
              className={`text-xs ${primaryRegion ? "text-zinc-300" : "text-zinc-500"}`}
            >
              Leader placed
            </span>
          </div>

          <div className="h-px w-4 bg-zinc-800" />

          <div className="flex items-center gap-2">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                hasReplica
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "border border-zinc-700 text-zinc-600"
              }`}
            >
              {hasReplica ? "✓" : "2"}
            </div>
            <span
              className={`text-xs ${hasReplica ? "text-zinc-300" : "text-zinc-500"}`}
            >
              Add a replica
            </span>
          </div>
        </div>
      </div>

      {/* Region list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {recommendedReplica && !query && (
          <div className="mb-3">
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-500/80">
              Best next replica
            </p>
            <RegionListItem
              region={recommendedReplica}
              role="available"
              latency={getLatency(recommendedReplica.id)}
              onToggle={() => handleToggle(recommendedReplica)}
              onHover={(hovered) =>
                setHoveredRegion(hovered ? recommendedReplica.id : null)
              }
            />
            <p className="mt-1.5 px-1 text-[10px] text-zinc-500">
              This copy gives the largest drop in average global read latency.
            </p>
          </div>
        )}

        {activeProvider && (
          <div className="mb-3 rounded-xl bg-zinc-900/70 px-3 py-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
            <p className="text-pretty text-[11px] leading-relaxed text-zinc-400">
              This database now uses{" "}
              <span className="font-semibold uppercase text-zinc-200">
                {activeProvider}
              </span>{" "}
              regions. Reset to choose another provider.
            </p>
          </div>
        )}

        <label className="relative mb-3 block">
          <span className="sr-only">Search regions</span>
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
          >
            <circle
              cx="7"
              cy="7"
              r="4.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="m10.5 10.5 3 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by city or region code"
            className="h-10 w-full rounded-xl bg-zinc-900/70 pl-9 pr-3 text-xs text-zinc-200 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] outline-none placeholder:text-zinc-600 focus:shadow-[0_0_0_2px_rgba(52,211,153,0.55)]"
          />
        </label>

        {!primaryRegion && !query && suggestedRegion && (
          <div className="mb-4">
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-500/80">
              Recommended near you
            </p>
            <RegionListItem
              region={suggestedRegion}
              role="available"
              latency={null}
              onToggle={() => handleToggle(suggestedRegion)}
              onHover={(hovered) =>
                setHoveredRegion(hovered ? suggestedRegion.id : null)
              }
            />
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {continentGroups.map((group) => (
            <div key={group.name} className="region-group mb-4">
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                {group.name}
              </p>
              <div className="flex flex-col gap-1.5">
                {group.regions.map((region) => (
                  <RegionListItem
                    key={region.id}
                    region={region}
                    role={getRole(region.id)}
                    latency={getLatency(region.id)}
                    onToggle={() => handleToggle(region)}
                    onHover={(h) => setHoveredRegion(h ? region.id : null)}
                  />
                ))}
              </div>
            </div>
          ))}
        </AnimatePresence>

        {continentGroups.length === 0 && (
          <p className="px-2 py-8 text-center text-xs text-zinc-500">
            No regions match &quot;{query}&quot;.
          </p>
        )}
      </div>

      {/* Footer */}
      {(primaryRegion || readRegions.length > 0) && (
        <div className="shrink-0 space-y-2 border-t border-zinc-800/50 px-5 py-3">
          {hasReplica ? (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-zinc-400">
                  {readRegions.length} replica
                  {readRegions.length !== 1 ? "s" : ""} selected
                </span>
                {latencySaved > 0 && currentLatency !== null && (
                  <span className="font-mono text-[11px] text-emerald-400">
                    {latencySaved}ms faster worldwide
                  </span>
                )}
              </div>
              {onNext && (
                <button
                  onClick={onNext}
                  className="min-h-10 w-full rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-zinc-950 transition-[background-color,scale] duration-150 hover:bg-emerald-300 active:scale-[0.96]"
                >
                  Commit a write
                </button>
              )}
            </>
          ) : (
            <p className="text-pretty text-center text-[11px] text-zinc-500">
              Add one read replica. The heatmap shows where reads become faster.
            </p>
          )}
          <div className="flex justify-end">
            <button
              onClick={reset}
              className="min-h-10 cursor-pointer rounded-full px-3 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
