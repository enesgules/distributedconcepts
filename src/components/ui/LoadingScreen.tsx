"use client";

import { motion } from "framer-motion";
import { useProgress } from "@react-three/drei";

export default function LoadingScreen() {
  const { progress } = useProgress();

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0a]"
    >
      <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">
        Interactive Guide
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">
        <span className="text-zinc-50">Distributed </span>
        <span className="bg-linear-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent">
          Concepts
        </span>
      </h1>

      <div className="mt-8 h-0.5 w-48 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] duration-300 ease-out"
          style={{ width: `${Math.max(progress, 5)}%` }}
        />
      </div>
      <p className="mt-3 font-mono text-xs text-zinc-600">
        Loading the globe... {Math.round(progress)}%
      </p>
    </motion.div>
  );
}
