import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isStepId } from "@/lib/curriculum-runtime";
import type { StepId } from "@/lib/steps";

interface CurriculumProgressState {
  completedLessonIds: StepId[];
  completeLesson: (lessonId: StepId) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readCompletedLessonIds(persisted: unknown): StepId[] {
  if (!isRecord(persisted)) return [];
  const candidate = Array.isArray(persisted.completedLessonIds)
    ? persisted.completedLessonIds
    : persisted.completedStepIds;
  return Array.isArray(candidate) ? candidate.filter(isStepId) : [];
}

export const useCurriculumProgressStore = create<CurriculumProgressState>()(
  persist(
    (set, get) => ({
      completedLessonIds: [],
      completeLesson: (lessonId) => {
        if (get().completedLessonIds.includes(lessonId)) return;
        set({ completedLessonIds: [...get().completedLessonIds, lessonId] });
      },
    }),
    {
      name: "distributed-concepts-onboarding:v5",
      merge: (persisted, current) => ({
        ...current,
        completedLessonIds: readCompletedLessonIds(persisted),
      }),
    }
  )
);
