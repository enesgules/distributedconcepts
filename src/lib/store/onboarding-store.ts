import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StepId } from "@/lib/steps";

interface OnboardingState {
  completedStepIds: StepId[];

  markStepComplete: (stepId: StepId) => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      completedStepIds: [],

      markStepComplete: (stepId) => {
        if (get().completedStepIds.includes(stepId)) return;
        set({ completedStepIds: [...get().completedStepIds, stepId] });
      },
    }),
    {
      name: "distributed-concepts-onboarding:v5",
    }
  )
);
