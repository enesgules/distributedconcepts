"use client";

import { motion } from "framer-motion";
import { useProgress } from "@react-three/drei";
import { Progress } from "@/components/ui/progress";

export default function LoadingScreen() {
  const { progress } = useProgress();

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0a]"
    >
      <div className="relative h-12 w-12">
        <motion.span
          className="absolute inset-0 rounded-full border border-emerald-400/20"
          animate={{ scale: [0.8, 1.18], opacity: [0.8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
        />
        <motion.span
          className="absolute inset-2 rounded-full border border-emerald-400/40"
          animate={{ rotate: 360 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        >
          <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400" />
        </motion.span>
        <span className="absolute inset-[18px] rounded-full bg-emerald-400" />
      </div>

      <p className="mt-5 text-sm font-medium text-zinc-300">
        Preparing the globe
      </p>
      <Progress
        aria-label="Preparing the globe"
        value={progress}
        className="mt-4 w-48 gap-0 [&_[data-slot=progress-indicator]]:bg-emerald-500 [&_[data-slot=progress-track]]:h-0.5 [&_[data-slot=progress-track]]:bg-zinc-800"
      />
      <p className="mt-3 font-mono text-xs tabular-nums text-[var(--text-tertiary)]">
        {Math.round(progress)}%
      </p>
    </motion.div>
  );
}
