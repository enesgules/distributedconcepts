"use client";

import { useRef } from "react";
import { AnimatePresence, motion, type Transition } from "framer-motion";
import {
  CURRICULUM_CHAPTERS,
  getStepIndexById,
  type ChapterId,
  type CurriculumChapter,
} from "@/lib/steps";
import { useOnboardingStore } from "@/lib/store/onboarding-store";

interface CurriculumHomeProps {
  activeChapterId: ChapterId;
  onChapterChange: (chapterId: ChapterId) => void;
  onSelectLesson: (step: number) => void;
  onStart: () => void;
}

const enterTransition = {
  type: "spring",
  duration: 0.55,
  bounce: 0,
} satisfies Transition;

const lessonCounts = (() => {
  let interactive = 0;
  let planned = 0;

  for (const chapter of CURRICULUM_CHAPTERS) {
    for (const lesson of chapter.lessons) {
      if (lesson.kind === "interactive") interactive += 1;
      else planned += 1;
    }
  }

  return { interactive, planned };
})();

function ConceptSignal({ chapter }: { chapter: CurriculumChapter }) {
  return (
    <motion.div
      key={chapter.id}
      initial={{
        opacity: 0,
        transform: "translate3d(0, 8px, 0)",
      }}
      animate={{
        opacity: 1,
        transform: "translate3d(0, 0, 0)",
      }}
      exit={{
        opacity: 0,
        transform: "translate3d(0, -6px, 0)",
      }}
      transition={{ type: "spring", duration: 0.24, bounce: 0 }}
      className="relative mt-7 h-16"
      aria-hidden="true"
    >
      <div className="absolute left-4 right-4 top-5 h-px overflow-hidden bg-white/10">
        <div
          className="curriculum-signal-line h-full origin-left"
          style={{ backgroundColor: chapter.accent }}
        />
      </div>
      <div className="absolute inset-x-0 top-0 flex justify-between">
        {chapter.signalLabels.map((label, index) => (
          <div
            key={label}
            className="flex w-16 flex-col items-center gap-3 text-center"
          >
            <span
              className="curriculum-signal-node h-2.5 w-2.5 rounded-full bg-zinc-950 shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_0_14px_currentColor]"
              style={{ color: chapter.accent }}
              aria-hidden="true"
              data-signal-index={index}
            />
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-500">
              {label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function CurriculumHome({
  activeChapterId,
  onChapterChange,
  onSelectLesson,
  onStart,
}: CurriculumHomeProps) {
  const curriculumRef = useRef<HTMLElement>(null);
  const completedStepIds = useOnboardingStore(
    (state) => state.completedStepIds
  );

  const activeChapter =
    CURRICULUM_CHAPTERS.find(
      (chapter) => chapter.id === activeChapterId
    ) ?? CURRICULUM_CHAPTERS[0];

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="pointer-events-none absolute inset-0 z-20 overflow-y-auto px-3 pb-3 pt-[4.5rem] md:px-5 md:pb-5 md:pt-20 lg:overflow-hidden"
    >
      <div className="mx-auto flex min-h-full w-full max-w-[1480px] flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <motion.section
          initial={{
            opacity: 0,
            transform: "translate3d(-24px, 0, 0)",
          }}
          animate={{
            opacity: 1,
            transform: "translate3d(0, 0, 0)",
          }}
          transition={{ ...enterTransition, delay: 0.08 }}
          className="pointer-events-auto w-full max-w-xl self-start rounded-[2rem] bg-zinc-950/94 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_24px_90px_rgba(0,0,0,0.45)] sm:p-7 md:p-8 lg:mt-auto"
        >
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.8)]" />
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Interactive curriculum
            </p>
          </div>

          <h1 className="mt-4 max-w-lg text-balance text-[2.35rem] font-semibold leading-[0.98] tracking-[-0.045em] text-zinc-50 sm:text-5xl lg:text-[3.6rem]">
            See the system make every decision.
          </h1>

          <p className="mt-4 max-w-md text-pretty text-sm leading-6 text-zinc-400 sm:text-base">
            Build a global service, then step through replication, stale reads,
            and leader failure. Follow the course or jump straight to the
            problem you care about.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={onStart}
              className="flex min-h-11 items-center gap-3 rounded-full bg-emerald-300 pl-5 pr-[18px] text-sm font-semibold text-zinc-950 shadow-[0_8px_30px_rgba(69,230,167,0.2)] transition-[background-color,scale] duration-150 hover:bg-emerald-200 active:scale-[0.96]"
            >
              Start with the first system
              <span
                className="opacity-70"
                aria-hidden="true"
              >
                →
              </span>
            </button>
            <button
              onClick={() =>
                curriculumRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
              className="min-h-11 rounded-full bg-white/[0.055] px-4 text-sm font-medium text-zinc-300 shadow-[0_0_0_1px_rgba(255,255,255,0.08)] transition-[background-color,scale] duration-150 hover:bg-white/[0.09] active:scale-[0.96] lg:hidden"
            >
              Browse lessons
            </button>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              {lessonCounts.interactive} interactive · {lessonCounts.planned} planned
            </p>
          </div>

          <AnimatePresence initial={false} mode="popLayout">
            <ConceptSignal chapter={activeChapter} />
          </AnimatePresence>
        </motion.section>

        <motion.section
          ref={curriculumRef}
          initial={{
            opacity: 0,
            transform: "translate3d(28px, 0, 0)",
          }}
          animate={{
            opacity: 1,
            transform: "translate3d(0, 0, 0)",
          }}
          transition={{ ...enterTransition, delay: 0.16 }}
          className="pointer-events-auto w-full scroll-mt-[4.5rem] overflow-hidden rounded-[2rem] bg-zinc-950/94 p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.09),0_24px_90px_rgba(0,0,0,0.5)] lg:max-h-[calc(100vh-6.25rem)] lg:max-w-[550px]"
          aria-label="Curriculum"
        >
          <div className="rounded-[1.5rem] bg-white/[0.025] p-4 sm:p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Choose your entry point
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-100">
                  Jump to a lesson
                </h2>
              </div>
              <p className="hidden max-w-40 text-right text-xs leading-5 text-zinc-500 sm:block">
                Interactive lessons open now. Planned lessons show what comes
                next.
              </p>
            </div>

            <div
              className="mt-5 grid grid-cols-4 gap-1 rounded-2xl bg-black/25 p-1"
              aria-label="Curriculum chapters"
            >
              {CURRICULUM_CHAPTERS.map((chapter) => {
                const isActive = chapter.id === activeChapter.id;

                return (
                  <button
                    key={chapter.id}
                    aria-pressed={isActive}
                    onClick={() => onChapterChange(chapter.id)}
                    className="relative min-h-12 rounded-xl px-1.5 py-2 text-left transition-[color,scale] duration-150 active:scale-[0.96]"
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="active-curriculum-chapter"
                        className="absolute inset-0 rounded-xl bg-white/[0.07] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_20px_rgba(0,0,0,0.18)]"
                        transition={{
                          type: "spring",
                          duration: 0.25,
                          bounce: 0,
                        }}
                      />
                    ) : null}
                    <span className="relative block font-mono text-[9px] text-zinc-600">
                      {chapter.number}
                    </span>
                    <span
                      className="relative mt-0.5 block truncate text-[11px] font-medium sm:text-xs"
                      style={{
                        color: isActive ? chapter.accent : "#71717a",
                      }}
                    >
                      {chapter.shortTitle}
                    </span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={activeChapter.id}
                initial={{
                  opacity: 0,
                  transform: "translate3d(0, 10px, 0)",
                }}
                animate={{
                  opacity: 1,
                  transform: "translate3d(0, 0, 0)",
                }}
                exit={{
                  opacity: 0,
                  transform: "translate3d(0, -8px, 0)",
                }}
                transition={{ type: "spring", duration: 0.24, bounce: 0 }}
                className="mt-5"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full shadow-[0_0_16px_currentColor]"
                    style={{
                      backgroundColor: activeChapter.accent,
                      color: activeChapter.accent,
                    }}
                  />
                  <div>
                    <h3 className="text-base font-semibold text-zinc-100">
                      {activeChapter.title}
                    </h3>
                    <p className="mt-1 text-sm leading-5 text-zinc-500">
                      {activeChapter.question}
                    </p>
                  </div>
                </div>

                <div className="mt-4 max-h-[36vh] space-y-1.5 overflow-y-auto pr-1 md:max-h-[42vh]">
                  {activeChapter.lessons.map((lesson, lessonIndex) => {
                    const lessonNumber = `${Number(activeChapter.number)}.${lessonIndex + 1}`;

                    if (lesson.kind === "planned") {
                      return (
                        <div
                          key={lesson.title}
                          className="flex min-h-[64px] items-center gap-3 rounded-2xl px-3.5 py-3"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.035] font-mono text-[9px] text-zinc-500">
                            {lessonNumber}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-zinc-300">
                              {lesson.title}
                            </p>
                            <p className="mt-0.5 text-xs leading-4 text-zinc-500">
                              {lesson.summary}
                            </p>
                          </div>
                          <span className="rounded-full bg-white/[0.045] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-zinc-500">
                            Planned
                          </span>
                        </div>
                      );
                    }

                    const stepIndex = getStepIndexById(lesson.stepId);
                    const isComplete = completedStepIds.includes(lesson.stepId);

                    return (
                      <button
                        key={lesson.stepId}
                        onClick={() => onSelectLesson(stepIndex)}
                        className="group flex min-h-[68px] w-full items-center gap-3 rounded-2xl bg-white/[0.035] px-3.5 py-3 text-left shadow-[0_0_0_1px_rgba(255,255,255,0.055)] transition-[background-color,scale] duration-150 hover:bg-white/[0.065] active:scale-[0.96]"
                      >
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-[9px] shadow-[0_0_0_1px_currentColor]"
                          style={{
                            color: activeChapter.accent,
                            backgroundColor: `${activeChapter.accent}12`,
                          }}
                        >
                          {isComplete ? "✓" : lessonNumber}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-zinc-200 transition-colors duration-150 group-hover:text-white">
                            {lesson.title}
                          </span>
                          <span className="mt-0.5 block text-xs leading-4 text-zinc-500">
                            {lesson.summary}
                          </span>
                        </span>
                        <span
                          className="text-sm opacity-35 transition-opacity duration-150 group-hover:opacity-100"
                          style={{ color: activeChapter.accent }}
                          aria-hidden="true"
                        >
                          →
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.section>
      </div>
    </motion.main>
  );
}
