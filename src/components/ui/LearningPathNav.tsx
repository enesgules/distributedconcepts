"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCurriculumProgressStore } from "@/lib/store/curriculum-progress-store";
import { STEPS, type StepId } from "@/lib/steps";

interface LearningPathNavProps {
  activeLessonId?: StepId;
  onLessonChange?: (lessonId: StepId) => void;
  compact?: boolean;
}

export default function LearningPathNav({
  activeLessonId = STEPS[0].id,
  onLessonChange,
  compact = false,
}: LearningPathNavProps) {
  const completedLessonIds = useCurriculumProgressStore(
    (state) => state.completedLessonIds
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 }}
      className={
        compact
          ? "rounded-xl border border-[var(--line-subtle)] bg-zinc-950/80 px-1.5 py-1.5 backdrop-blur-md"
          : "max-w-[calc(100vw-1rem)] rounded-2xl border border-[var(--line-subtle)] bg-zinc-950/80 px-1.5 py-2 backdrop-blur-md md:max-w-none lg:px-5 lg:py-3"
      }
    >
      <div className={`flex items-center ${compact ? "gap-0" : "gap-1"}`}>
        {STEPS.map((exp, i) => {
          const isActive = exp.id === activeLessonId;
          const isClickable = !isActive && onLessonChange !== undefined;
          const isCompleted =
            completedLessonIds.includes(exp.id) && !isActive;
          const stateLabel = isActive
            ? "current"
            : isCompleted
              ? "completed"
              : "not completed";

          const content = (
            <div
              className={`flex min-h-10 items-center gap-2 ${
                compact ? "justify-center px-1" : "justify-center px-1 lg:px-2.5"
              } ${isClickable ? "cursor-pointer" : ""}`}
            >
              <div
                className={`flex items-center justify-center rounded-full font-semibold transition-colors ${
                  compact
                    ? "h-8 w-8 text-[10px]"
                    : "h-7 w-7 text-[10px]"
                } ${
                  isActive
                    ? "border border-emerald-500/50 bg-emerald-400/10 text-emerald-400"
                    : isCompleted
                      ? "border border-emerald-500/30 text-emerald-500/80 hover:border-emerald-500/50 hover:text-emerald-400"
                      : "border border-zinc-700 text-[var(--text-tertiary)] hover:border-zinc-600 hover:text-zinc-400"
                }`}
              >
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.span
                    key={isCompleted ? "complete" : "number"}
                    initial={{
                      opacity: 0,
                      scale: 0.25,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.25,
                    }}
                    transition={{
                      type: "spring",
                      duration: 0.3,
                      bounce: 0,
                    }}
                    className="flex items-center justify-center"
                  >
                    {isCompleted ? (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M3 8.5l3.5 3.5L13 5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </motion.span>
                </AnimatePresence>
              </div>
              {!compact && (
                <div className="hidden xl:block">
                  <p
                    className={`text-xs font-medium transition-colors ${
                      isActive
                        ? "text-zinc-200"
                        : "text-[var(--text-tertiary)] group-hover:text-zinc-400"
                    }`}
                  >
                    {exp.shortTitle}
                  </p>
                  <p className="hidden text-[10px] text-[var(--text-tertiary)] lg:block">
                    {exp.tagline}
                  </p>
                </div>
              )}
            </div>
          );

          return (
            <div key={exp.id} className="flex items-center">
              <button
                onClick={
                  isClickable ? () => onLessonChange?.(exp.id) : undefined
                }
                aria-label={`Step ${i + 1}, ${exp.title}, ${stateLabel}`}
                aria-current={isActive ? "step" : undefined}
                className={`group min-h-10 min-w-10 rounded-xl transition-[background-color,scale] duration-150 ${
                  isClickable
                    ? "cursor-pointer hover:bg-white/[0.03] active:scale-[0.96]"
                    : "cursor-default"
                }`}
              >
                {content}
              </button>

              {/* Connector */}
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px border-t border-dashed border-zinc-800 ${
                    compact ? "w-1" : "w-1 lg:w-4"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
