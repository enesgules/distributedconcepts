"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type Transition } from "framer-motion";
import Link from "next/link";
import {
  CURRICULUM_CHAPTERS,
  getStepIndexById,
  STEPS,
  type ChapterId,
  type CurriculumChapter,
  type StepId,
} from "@/lib/steps";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

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
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
              {label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function CurriculumChapterPanel({
  chapter,
  completedStepIds,
  onSelectLesson,
}: {
  chapter: CurriculumChapter;
  completedStepIds: readonly StepId[];
  onSelectLesson: (step: number) => void;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        transform: "translate3d(0, 10px, 0)",
      }}
      animate={{
        opacity: 1,
        transform: "translate3d(0, 0, 0)",
      }}
      transition={{ type: "spring", duration: 0.24, bounce: 0 }}
      className="mt-5 lg:mt-0"
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full shadow-[0_0_16px_currentColor]"
          style={{
            backgroundColor: chapter.accent,
            color: chapter.accent,
          }}
        />
        <div>
          <h3 className="text-base font-semibold text-zinc-100">
            {chapter.title}
          </h3>
          <p className="mt-1 text-sm leading-5 text-[var(--text-secondary)]">
            {chapter.question}
          </p>
        </div>
      </div>

      <div className="mt-4 max-h-[36vh] space-y-1.5 overflow-y-auto pr-1 md:max-h-[42vh]">
        {chapter.lessons.map((lesson, lessonIndex) => {
          const lessonNumber = `${Number(chapter.number)}.${lessonIndex + 1}`;

          if (lesson.kind === "planned") {
            return (
              <div
                key={lesson.title}
                className="flex min-h-[64px] items-center gap-3 rounded-2xl px-3.5 py-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-inset)] font-mono text-[10px] text-[var(--text-tertiary)]">
                  {lessonNumber}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-300">
                    {lesson.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-[var(--text-tertiary)]">
                    {lesson.summary}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--surface-interactive)] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                  Planned
                </span>
              </div>
            );
          }

          const stepIndex = getStepIndexById(lesson.stepId);
          const isComplete = completedStepIds.includes(lesson.stepId);

          return (
            <Link
              key={lesson.stepId}
              href={`/lessons/${STEPS[stepIndex].slug}`}
              onClick={(event) => {
                event.preventDefault();
                onSelectLesson(stepIndex);
              }}
              className="group flex min-h-[72px] w-full items-center gap-3 rounded-2xl bg-[var(--surface-inset)] px-3.5 py-3 text-left shadow-[inset_0_0_0_1px_var(--line-subtle)] transition-[background-color,box-shadow,scale] duration-150 hover:bg-[var(--surface-hover)] hover:shadow-[inset_0_0_0_1px_var(--line-strong)] active:scale-[0.98]"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-[10px] shadow-[0_0_0_1px_currentColor]"
                style={{
                  color: chapter.accent,
                  backgroundColor: `${chapter.accent}12`,
                }}
              >
                {isComplete ? "✓" : lessonNumber}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-zinc-200 transition-colors duration-150 group-hover:text-white">
                  {lesson.title}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-[var(--text-tertiary)]">
                  {lesson.summary}
                </span>
              </span>
              <span
                className="text-sm opacity-35 transition-opacity duration-150 group-hover:opacity-100"
                style={{ color: chapter.accent }}
                aria-hidden="true"
              >
                →
              </span>
            </Link>
          );
        })}
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
  const [tabOrientation, setTabOrientation] = useState<"horizontal" | "vertical">(
    "horizontal"
  );
  const completedStepIds = useOnboardingStore(
    (state) => state.completedStepIds
  );

  const activeChapter =
    CURRICULUM_CHAPTERS.find(
      (chapter) => chapter.id === activeChapterId
    ) ?? CURRICULUM_CHAPTERS[0];

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateOrientation = () => {
      setTabOrientation(mediaQuery.matches ? "vertical" : "horizontal");
    };

    updateOrientation();
    mediaQuery.addEventListener("change", updateOrientation);
    return () => mediaQuery.removeEventListener("change", updateOrientation);
  }, []);

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
          className="pointer-events-auto w-full max-w-xl self-start rounded-[2rem] bg-[var(--surface-panel)] p-5 shadow-[0_0_0_1px_var(--line-subtle),0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-7 md:p-8 lg:mt-auto"
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
            <Link
              href="/lessons/distributed-service"
              onClick={(event) => {
                event.preventDefault();
                onStart();
              }}
              className="flex min-h-11 items-center gap-3 rounded-full bg-emerald-300 pl-5 pr-[18px] text-sm font-semibold text-zinc-950 shadow-[0_8px_30px_rgba(69,230,167,0.2)] transition-[background-color,scale] duration-150 hover:bg-emerald-200 active:scale-[0.96]"
            >
              Start with the first system
              <span
                className="opacity-70"
                aria-hidden="true"
              >
                →
              </span>
            </Link>
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
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
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
          className="pointer-events-auto w-full scroll-mt-[4.5rem] overflow-hidden rounded-[2rem] bg-[var(--surface-panel)] p-2 shadow-[0_0_0_1px_var(--line-subtle),0_24px_90px_rgba(0,0,0,0.5)] backdrop-blur-xl lg:max-h-[calc(100vh-6.25rem)] lg:max-w-[650px]"
          aria-label="Curriculum"
        >
          <div className="rounded-[1.5rem] bg-[var(--surface-inset)] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.025)] sm:p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  Choose your entry point
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-100">
                  Jump to a lesson
                </h2>
              </div>
              <p className="hidden max-w-40 text-right text-xs leading-5 text-[var(--text-tertiary)] sm:block">
                Interactive lessons open now. Planned lessons show what comes
                next.
              </p>
            </div>

            <Tabs
              orientation={tabOrientation}
              value={activeChapter.id}
              onValueChange={(value) => {
                const chapter = CURRICULUM_CHAPTERS.find(
                  (candidate) => candidate.id === value
                );
                if (chapter) onChapterChange(chapter.id);
              }}
              className="gap-0 lg:grid lg:grid-cols-[120px_minmax(0,1fr)] lg:items-start lg:gap-5"
            >
              <TabsList
                activateOnFocus
                className="mt-5 grid h-auto w-full grid-cols-4 gap-1 rounded-2xl bg-black/25 p-1 lg:flex lg:flex-col lg:items-stretch lg:rounded-xl"
                aria-label="Curriculum chapters"
              >
                {CURRICULUM_CHAPTERS.map((chapter) => {
                  const isActive = chapter.id === activeChapter.id;

                  return (
                    <TabsTrigger
                      key={chapter.id}
                      value={chapter.id}
                      className="h-auto min-h-12 justify-start rounded-xl border-0 px-1.5 py-2 text-left after:hidden active:scale-[0.98] data-active:bg-[var(--surface-hover)] data-active:shadow-[inset_0_0_0_1px_var(--line-subtle),0_8px_20px_rgba(0,0,0,0.18)] lg:min-h-14 lg:w-full lg:px-3"
                    >
                      <span className="min-w-0">
                        <span className="block font-mono text-[10px] text-[var(--text-muted)]">
                          {chapter.number}
                        </span>
                        <span
                          className="mt-0.5 block truncate text-[11px] font-medium sm:text-xs"
                          style={{
                            color: isActive ? chapter.accent : "#85858f",
                          }}
                        >
                          {chapter.shortTitle}
                        </span>
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {CURRICULUM_CHAPTERS.map((chapter) => (
                <TabsContent
                  key={chapter.id}
                  value={chapter.id}
                  keepMounted
                >
                  <CurriculumChapterPanel
                    chapter={chapter}
                    completedStepIds={completedStepIds}
                    onSelectLesson={onSelectLesson}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </motion.section>
      </div>
    </motion.main>
  );
}
