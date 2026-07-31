"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface HomeIntroProps {
  onBrowse: () => void;
  onStart: () => void;
}

export default function HomeIntro({ onBrowse, onStart }: HomeIntroProps) {
  return (
    <main className="pointer-events-none absolute inset-0 z-20">
      <motion.header
        initial={{ opacity: 0, transform: "translate3d(0, -8px, 0)" }}
        animate={{ opacity: 1, transform: "translate3d(0, 0, 0)" }}
        transition={{ type: "spring", duration: 0.45, bounce: 0 }}
        className="absolute left-5 top-5 md:left-7 md:top-7"
      >
        <h1 className="text-sm font-semibold tracking-[-0.01em] text-zinc-100 md:text-base">
          Distributed Concepts
        </h1>
        <p className="mt-1 hidden font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)] md:block">
          Distributed systems, made visible
        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, transform: "translate3d(-50%, 10px, 0)" }}
        animate={{ opacity: 1, transform: "translate3d(-50%, 0, 0)" }}
        transition={{ type: "spring", duration: 0.5, delay: 0.08, bounce: 0 }}
        className="pointer-events-auto absolute bottom-5 left-1/2 flex w-[calc(100%-2rem)] max-w-md flex-col items-center gap-3 md:bottom-7"
      >
        <p className="max-w-sm text-center text-xs leading-5 text-zinc-400 md:text-sm">
          Explore replication, consistency, and failure on a living globe.
        </p>
        <div className="flex items-center gap-2 rounded-[1.25rem] bg-[var(--surface-panel)] p-1.5 shadow-[0_0_0_1px_var(--line-subtle),0_16px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <Link
            href="/lessons/distributed-service"
            onClick={(event) => {
              event.preventDefault();
              onStart();
            }}
            className="flex min-h-11 items-center gap-2 rounded-2xl bg-emerald-300 px-4 text-sm font-semibold text-zinc-950 transition-[background-color,scale] duration-150 hover:bg-emerald-200 active:scale-[0.96]"
          >
            Start learning
            <span className="opacity-70" aria-hidden="true">
              →
            </span>
          </Link>
          <Link
            href="/lessons"
            onClick={(event) => {
              event.preventDefault();
              onBrowse();
            }}
            className="flex min-h-11 items-center rounded-2xl px-4 text-sm font-medium text-zinc-300 transition-[background-color,color,scale] duration-150 hover:bg-white/[0.06] hover:text-zinc-100 active:scale-[0.96]"
          >
            Browse lessons
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
