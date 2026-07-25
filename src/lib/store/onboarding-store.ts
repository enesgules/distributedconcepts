import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OnboardingState {
  hasSeenWelcome: boolean;
  completedSteps: number[];

  setWelcomeSeen: () => void;
  markStepComplete: (step: number) => void;
  resetProgress: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      hasSeenWelcome: false,
      completedSteps: [],

      setWelcomeSeen: () => set({ hasSeenWelcome: true }),
      markStepComplete: (step) => {
        if (get().completedSteps.includes(step)) return;
        set({ completedSteps: [...get().completedSteps, step] });
      },
      resetProgress: () => set({ hasSeenWelcome: false, completedSteps: [] }),
    }),
    {
      name: "distributed-concepts-onboarding:v3",
    }
  )
);
