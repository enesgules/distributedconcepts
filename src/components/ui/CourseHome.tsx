"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { STEPS, type StepId } from "@/lib/steps";
import { getLessonUrl } from "@/lib/curriculum-runtime";
import { useCurriculumProgressStore } from "@/lib/store/curriculum-progress-store";

export default function CourseHome({
  expanded,
  onExpand,
  onStart,
  onSelectLesson,
}: {
  expanded: boolean;
  onExpand: () => void;
  onStart: () => void;
  onSelectLesson: (lessonId: StepId) => void;
}) {
  const completedLessonIds = useCurriculumProgressStore(
    (state) => state.completedLessonIds
  );

  return (
    <main className="pointer-events-none absolute inset-0 z-20">
      <motion.header
        initial={{ opacity: 0, transform: "translateY(-8px)" }}
        animate={{ opacity: 1, transform: "translateY(0)" }}
        transition={{ type: "spring", duration: 0.4, bounce: 0 }}
        className="absolute left-5 top-5 md:left-7 md:top-7"
      >
        <h1 className="text-sm font-semibold tracking-[-0.01em] text-zinc-100 md:text-base">
          Distributed Concepts
        </h1>
        <p className="mt-1 hidden font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)] md:block">
          Learn by changing the system
        </p>
      </motion.header>

      <motion.section
        key={expanded ? "course" : "intro"}
        initial={{ opacity: 0, transform: "translate3d(0, 12px, 0)" }}
        animate={{ opacity: 1, transform: "translate3d(0, 0, 0)" }}
        transition={{ type: "spring", duration: 0.45, bounce: 0 }}
        className={`pointer-events-auto absolute bottom-4 left-4 right-4 mx-auto overflow-hidden rounded-[1.75rem] bg-[var(--surface-panel)] shadow-[0_0_0_1px_var(--line-subtle),0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl md:bottom-6 md:left-6 md:right-auto md:mx-0 ${
          expanded ? "max-h-[calc(100dvh-6rem)] md:w-[410px]" : "max-w-lg md:w-[460px]"
        }`}
      >
        <div className="p-5 sm:p-6">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
            {expanded ? "Your course" : "Four short experiments"}
          </p>
          <h2
            className={`text-balance font-semibold text-zinc-50 ${
              expanded
                ? "mt-2 text-2xl tracking-[-0.035em]"
                : "mt-3 text-[2rem] leading-[1.02] tracking-[-0.045em] sm:text-[2.55rem]"
            }`}
          >
            {expanded ? "Choose an experiment" : "See why distributed systems get hard."}
          </h2>
          {!expanded ? (
            <p className="mt-3 max-w-md text-pretty text-sm leading-6 text-zinc-400">
              Build one global service. Send a write, race a copy, then recover from failure on the globe.
            </p>
          ) : null}

          {expanded ? (
            <div className="mt-5 space-y-2" aria-label="Course experiments">
              {STEPS.map((step, index) => {
                const complete = completedLessonIds.includes(step.id);
                return (
                  <Link
                    key={step.id}
                    href={getLessonUrl(step.id)}
                    onClick={(event) => {
                      event.preventDefault();
                      onSelectLesson(step.id);
                    }}
                    className="group flex min-h-[68px] items-center gap-3 rounded-2xl bg-white/[0.035] px-3.5 py-3 shadow-[inset_0_0_0_1px_var(--line-subtle)] transition-[background-color,scale] duration-150 hover:bg-white/[0.07] active:scale-[0.98]"
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-[11px] ${complete ? "bg-emerald-300 text-zinc-950" : "bg-white/[0.055] text-zinc-400"}`}>
                      {complete ? "✓" : index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-zinc-200">{step.title}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-[var(--text-tertiary)]">{step.summary}</span>
                    </span>
                    <span className="text-zinc-600 transition-colors group-hover:text-emerald-300" aria-hidden="true">→</span>
                  </Link>
                );
              })}
            </div>
          ) : null}

          {!expanded ? <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/lessons/build"
              onClick={(event) => {
                event.preventDefault();
                onStart();
              }}
              className="flex min-h-11 items-center rounded-2xl bg-emerald-300 px-4 text-sm font-semibold text-zinc-950 transition-[background-color,scale] duration-150 hover:bg-emerald-200 active:scale-[0.96]"
            >
              Start course <span className="ml-2 opacity-60" aria-hidden="true">→</span>
            </Link>
            <button
              type="button"
              onClick={onExpand}
              className="min-h-11 rounded-2xl bg-white/[0.055] px-4 text-sm font-medium text-zinc-200 shadow-[inset_0_0_0_1px_var(--line-subtle)] transition-[background-color,scale] duration-150 hover:bg-white/[0.09] active:scale-[0.96]"
            >
              Explore 4 experiments
            </button>
          </div> : null}
        </div>
      </motion.section>
    </main>
  );
}
