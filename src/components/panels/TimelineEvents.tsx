"use client";

import { motion, AnimatePresence } from "framer-motion";

export interface TimelineStyle {
  icon: string;
  color: string;
}

/** Shared animated event list used by the write and failover timelines. */
export default function TimelineEvents<T extends string>({
  events,
  typeStyles,
}: {
  events: ReadonlyArray<{ time: number; label: string; type: T }>;
  typeStyles: Record<T, TimelineStyle>;
}) {
  return (
    <div className="space-y-1.5">
      <AnimatePresence>
        {events.map((event, i) => {
          const style = typeStyles[event.type];
          return (
            <motion.div
              key={`${event.time}-${event.type}-${i}`}
              initial={{
                opacity: 0,
                transform: "translate3d(-8px, 0, 0)",
              }}
              animate={{
                opacity: 1,
                transform: "translate3d(0px, 0, 0)",
              }}
              transition={{
                duration: 0.18,
                delay: 0.05 * i,
                ease: [0.23, 1, 0.32, 1],
              }}
              className="flex items-start gap-3"
            >
              <span className="w-10 shrink-0 text-right font-mono text-xs text-[var(--text-tertiary)]">
                {event.time}ms
              </span>
              <span className={`shrink-0 text-sm ${style.color}`}>
                {style.icon}
              </span>
              <span className="text-xs text-zinc-400">{event.label}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
