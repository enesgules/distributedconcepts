"use client";

import { useEffect, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { STEPS } from "@/lib/steps";

interface WelcomeOverlayProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export default function WelcomeOverlay({
  forceOpen = false,
  onClose,
}: WelcomeOverlayProps) {
  const hasSeenWelcome = useOnboardingStore((s) => s.hasSeenWelcome);
  const setWelcomeSeen = useOnboardingStore((s) => s.setWelcomeSeen);

  // Wait for the persisted store to hydrate before deciding first-visit state
  const hydrated = useSyncExternalStore(
    (cb) => useOnboardingStore.persist.onFinishHydration(cb),
    () => useOnboardingStore.persist.hasHydrated(),
    () => false
  );

  // Fully derived: first visit (post-hydration) or explicitly reopened
  const visible = forceOpen || (hydrated && !hasSeenWelcome);

  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible, onClose]);

  function dismiss() {
    setWelcomeSeen();
    onClose?.();
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0a0a0a] px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col items-center overflow-y-auto rounded-3xl bg-zinc-950/95 px-6 py-7 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_24px_80px_rgba(0,0,0,0.55)] sm:px-10 sm:py-10"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">
              Distributed Concepts
            </p>
            <h2
              id="welcome-title"
              className="mt-4 max-w-md text-balance text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl"
            >
              Learn what the database does, one action at a time.
            </h2>

            <p className="mt-4 max-w-sm text-pretty text-sm leading-relaxed text-zinc-400 sm:text-base">
              Place a leader, add a read replica, then control every step of a
              write, a read, a stale result, and a leader failure.
            </p>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              onClick={dismiss}
              className="mt-7 min-h-11 cursor-pointer rounded-full bg-emerald-400 px-7 py-3 text-sm font-semibold text-zinc-950 transition-[background-color,scale] duration-150 ease-out hover:bg-emerald-300 active:scale-[0.96]"
            >
              {forceOpen ? "Back to experience" : "Place your leader"}
            </motion.button>

            <details className="group mt-5 w-full text-left">
              <summary className="mx-auto flex min-h-10 w-fit cursor-pointer list-none items-center gap-2 rounded-full px-3 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200">
                See the six lessons
                <span
                  className="text-zinc-600 transition-transform duration-200 group-open:rotate-180"
                  aria-hidden="true"
                >
                  ↓
                </span>
              </summary>
              <div className="mt-3 max-h-[32vh] space-y-1 overflow-y-auto rounded-2xl bg-zinc-900/60 p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
                {STEPS.map((step, index) => (
                  <div
                    key={step.title}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-400">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">
                        {step.title}
                      </p>
                      <p className="text-xs text-zinc-500">{step.tagline}</p>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
