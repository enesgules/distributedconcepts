"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
    <div className="flex h-full flex-col rounded-2xl border border-zinc-800/50 bg-zinc-950/90 backdrop-blur-md">
      <div className="shrink-0 border-b border-zinc-800/50 px-5 pt-5 pb-4">
        <h2 className="text-balance text-sm font-semibold text-zinc-200">
          {title}
        </h2>
        <p className="mt-1 text-pretty text-[11px] text-zinc-400">
          {description}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {children}
      </div>
      <div className="shrink-0 border-t border-zinc-800/50 px-5 py-4 space-y-2">
        {footer}
      </div>
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-2">
      {children}
    </p>
  );
}

export interface LessonBeat {
  title: string;
  detail: string;
}

export function LessonSequence({
  beats,
  activeIndex,
  complete = false,
  running = false,
}: {
  beats: readonly LessonBeat[];
  activeIndex: number;
  complete?: boolean;
  running?: boolean;
}) {
  const boundedIndex = Math.min(Math.max(activeIndex, 0), beats.length - 1);
  const activeBeat = beats[boundedIndex];

  return (
    <div className="rounded-xl bg-zinc-900/65 p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.07)]">
      <div className="flex items-center">
        {beats.map((beat, index) => {
          const isDone = complete || index < boundedIndex;
          const isActive = !complete && index === boundedIndex;

          return (
            <div key={beat.title} className="flex min-w-0 flex-1 items-center last:flex-none">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-[background-color,box-shadow,color] duration-200 ${
                  isDone
                    ? "bg-emerald-400 text-zinc-950"
                    : isActive
                      ? "bg-cyan-400/12 text-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,0.45)]"
                      : "bg-zinc-800 text-zinc-600 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
                }`}
                aria-label={`${beat.title}, ${isDone ? "complete" : isActive ? "current" : "upcoming"}`}
              >
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.span
                    key={isDone ? "done" : "number"}
                    initial={{
                      opacity: 0,
                      scale: 0.25,
                      filter: "blur(4px)",
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      filter: "blur(0px)",
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.25,
                      filter: "blur(4px)",
                    }}
                    transition={{
                      type: "spring",
                      duration: 0.3,
                      bounce: 0,
                    }}
                  >
                    {isDone ? "✓" : index + 1}
                  </motion.span>
                </AnimatePresence>
              </div>
              {index < beats.length - 1 && (
                <div
                  className={`mx-1.5 h-px min-w-2 flex-1 transition-colors duration-200 ${
                    index < boundedIndex || complete
                      ? "bg-emerald-400/45"
                      : "bg-zinc-800"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <motion.div
        key={complete ? "complete" : activeBeat.title}
        initial={{
          opacity: 0,
          transform: "translateY(4px)",
          filter: "blur(2px)",
        }}
        animate={{
          opacity: 1,
          transform: "translateY(0px)",
          filter: "blur(0px)",
        }}
        transition={{
          duration: 0.18,
          ease: [0.23, 1, 0.32, 1],
        }}
        className="mt-3"
        aria-live="polite"
      >
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          {complete
            ? "Lesson complete"
            : running
              ? `Action ${boundedIndex + 1} is running`
              : `Action ${boundedIndex + 1} of ${beats.length}`}
        </p>
        <p className="mt-1 text-xs font-semibold text-zinc-200">
          {complete ? "You followed the whole path" : activeBeat.title}
        </p>
        <p className="mt-1 text-pretty text-[11px] leading-relaxed text-zinc-400">
          {complete
            ? beats.map((beat) => beat.title.toLowerCase()).join(" → ")
            : activeBeat.detail}
        </p>
      </motion.div>
    </div>
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
              Leader
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
            className="flex-1 rounded-sm bg-transparent font-mono text-xs text-zinc-200 outline-none placeholder-zinc-600 focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:opacity-50"
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
      <span className="font-mono text-lg font-bold tabular-nums text-cyan-400">
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
  nextLabel,
  onNext,
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
  nextLabel?: string;
  onNext?: () => void;
}) {
  if (complete) {
    return (
      <>
        {nextLabel && onNext && (
          <button
            onClick={onNext}
            className="min-h-10 w-full rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-zinc-950 transition-[background-color,scale] duration-150 hover:bg-emerald-300 active:scale-[0.96]"
          >
            {nextLabel}
          </button>
        )}
        <button
          onClick={onReplay}
          className="min-h-10 w-full rounded-full border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-xs font-medium text-zinc-300 transition-[background-color,border-color,scale] duration-150 hover:border-zinc-600 hover:bg-zinc-800 active:scale-[0.96]"
        >
          {replayLabel}
        </button>
        {completeHint && (
          <p className="text-pretty text-center text-[10px] text-zinc-500">
            {completeHint}
          </p>
        )}
      </>
    );
  }
  return (
    <button
      onClick={onExecute}
      disabled={disabled || busy}
      className="min-h-10 w-full rounded-full bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-400 transition-[background-color,scale] duration-150 hover:bg-emerald-400/20 active:not-disabled:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-30"
    >
      {busy ? busyLabel : executeLabel}
    </button>
  );
}
