"use client";

import { motion } from "framer-motion";
import type { WriteFlowEvent } from "@/lib/simulation/write-simulation";
import { useWriteFlowStore } from "@/lib/store/write-flow-store";
import TimelineEvents, { type TimelineStyle } from "./TimelineEvents";

const typeStyles: Record<WriteFlowEvent["type"], TimelineStyle> = {
  send: { icon: "→", color: "text-cyan-400" },
  ack: { icon: "✓", color: "text-emerald-400" },
  replicate: { icon: "→", color: "text-[var(--text-tertiary)]" },
  arrive: { icon: "✓", color: "text-emerald-400" },
};

export default function EventTimeline() {
  const events = useWriteFlowStore((s) => s.events);
  const phase = useWriteFlowStore((s) => s.phase);

  if (phase === "idle" || events.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-panel)] px-5 py-4 backdrop-blur-md max-h-[320px] overflow-y-auto"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
        Event Timeline
      </p>

      <TimelineEvents events={events} typeStyles={typeStyles} />
    </motion.div>
  );
}
