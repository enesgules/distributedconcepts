"use client";

import { motion } from "framer-motion";
import {
  useFailoverStore,
  type FailoverPhase,
  type FailoverEventType,
} from "@/lib/store/failover-store";
import TimelineEvents, { type TimelineStyle } from "./TimelineEvents";

const typeStyles: Record<FailoverEventType, TimelineStyle> = {
  failure: { icon: "✕", color: "text-red-400" },
  detect: { icon: "⚠", color: "text-amber-400" },
  election: { icon: "↻", color: "text-amber-400" },
  elected: { icon: "★", color: "text-amber-400" },
  reconnect: { icon: "→", color: "text-emerald-400" },
  resume: { icon: "✓", color: "text-emerald-400" },
};

function getWriteStatus(phase: FailoverPhase): { label: string; color: string } {
  if (phase === "idle") return { label: "OK", color: "text-emerald-400" };
  if (phase === "complete") return { label: "OK", color: "text-emerald-400" };
  if (phase === "recovering") return { label: "Draining", color: "text-amber-400" };
  return { label: "Blocked", color: "text-red-400" };
}

function getReadStatus(phase: FailoverPhase): { label: string; color: string } {
  if (phase === "idle" || phase === "complete")
    return { label: "OK", color: "text-emerald-400" };
  return { label: "OK (possibly stale)", color: "text-emerald-400" };
}

export default function FailoverTimeline() {
  const events = useFailoverStore((s) => s.events);
  const phase = useFailoverStore((s) => s.phase);

  if (phase === "idle" || events.length === 0) return null;

  const writeStatus = getWriteStatus(phase);
  const readStatus = getReadStatus(phase);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-h-[400px] overflow-y-auto rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-panel)] px-5 py-4 backdrop-blur-md"
    >
      {/* Live status */}
      <div className="mb-3 flex gap-4">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Writes
          </p>
          <p className={`text-xs font-semibold ${writeStatus.color}`}>
            {writeStatus.label}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Reads
          </p>
          <p className={`text-xs font-semibold ${readStatus.color}`}>
            {readStatus.label}
          </p>
        </div>
      </div>

      <div className="mb-3 h-px bg-zinc-800/50" />

      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        Failover Timeline
      </p>

      <TimelineEvents events={events} typeStyles={typeStyles} />
    </motion.div>
  );
}
