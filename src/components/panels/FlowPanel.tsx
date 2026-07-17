"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useDatabaseStore } from "@/lib/store/database-store";
import { getRegionById } from "@/lib/regions";
import type { LatLon } from "@/lib/geo-utils";

/** Shared chrome for the step panels: card, header, scrollable body, footer. */
export function FlowPanel({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="flex h-full flex-col rounded-2xl border border-zinc-800/50 bg-zinc-950/90 backdrop-blur-md"
    >
      <div className="shrink-0 border-b border-zinc-800/50 px-5 pt-5 pb-4">
        <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
        <p className="mt-1 text-[11px] text-zinc-500">{description}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {children}
      </div>
      <div className="shrink-0 border-t border-zinc-800/50 px-5 py-4 space-y-2">
        {footer}
      </div>
    </motion.div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-2">
      {children}
    </p>
  );
}

/** Primary + read replica chips for the current database config. */
export function RegionSummary() {
  const primaryRegion = useDatabaseStore((s) => s.primaryRegion);
  const readRegions = useDatabaseStore((s) => s.readRegions);
  const primary = primaryRegion ? getRegionById(primaryRegion) : null;

  return (
    <div>
      <SectionLabel>Database Config</SectionLabel>
      <div className="space-y-2">
        {primary && (
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
              Primary
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              {primary.city}
            </span>
          </div>
        )}
        {readRegions.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              Read
            </span>
            <div className="flex flex-wrap gap-1.5">
              {readRegions.map((id) => {
                const region = getRegionById(id);
                if (!region) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 text-[11px] text-zinc-300"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {region.city}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ClientLocationBlock({ location }: { location: LatLon | null }) {
  return (
    <div>
      <SectionLabel>Client Location</SectionLabel>
      {location ? (
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          <span className="font-mono text-xs text-zinc-300">
            {location.lat.toFixed(1)}°, {location.lon.toFixed(1)}°
          </span>
        </div>
      ) : (
        <p className="text-[11px] text-zinc-500 italic">
          Click anywhere on the globe to set your location
        </p>
      )}
    </div>
  );
}

/** db> prompt with editable command and optional response line. */
export function CommandTerminal({
  value,
  onChange,
  disabled,
  response,
}: {
  value: string;
  onChange: (cmd: string) => void;
  disabled: boolean;
  response: string | null;
}) {
  return (
    <div>
      <SectionLabel>Command</SectionLabel>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-red-400 shrink-0">db&gt;</span>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="flex-1 bg-transparent font-mono text-xs text-zinc-200 outline-none placeholder-zinc-600 disabled:opacity-50"
            spellCheck={false}
          />
        </div>
        {response && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 font-mono text-xs text-emerald-400"
          >
            {response}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export function LatencyCounter({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-baseline gap-2"
    >
      <span className="font-mono text-lg font-bold text-cyan-400">
        {value}ms
      </span>
      <span className="text-[10px] text-zinc-500">{label}</span>
    </motion.div>
  );
}

/** Execute / Replay footer shared by the flow panels. */
export function ExecuteFooter({
  complete,
  onExecute,
  onReplay,
  disabled,
  busy,
  executeLabel = "Execute",
  busyLabel = "Executing...",
  replayLabel = "Replay",
  completeHint,
}: {
  complete: boolean;
  onExecute: () => void;
  onReplay: () => void;
  disabled: boolean;
  busy: boolean;
  executeLabel?: string;
  busyLabel?: string;
  replayLabel?: string;
  completeHint?: string;
}) {
  if (complete) {
    return (
      <>
        <button
          onClick={onReplay}
          className="w-full rounded-full border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
        >
          {replayLabel}
        </button>
        {completeHint && (
          <p className="text-[10px] text-zinc-600 text-center">{completeHint}</p>
        )}
      </>
    );
  }
  return (
    <button
      onClick={onExecute}
      disabled={disabled || busy}
      className="w-full rounded-full bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-400/20 disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {busy ? busyLabel : executeLabel}
    </button>
  );
}
