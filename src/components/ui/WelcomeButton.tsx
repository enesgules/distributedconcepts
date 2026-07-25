"use client";

import { useState } from "react";
import WelcomeOverlay from "./WelcomeOverlay";

export default function WelcomeButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open guide"
        className="flex h-11 w-11 md:h-10 md:w-10 cursor-pointer items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/80 text-xs text-zinc-500 backdrop-blur-sm transition-[border-color,color,scale] duration-150 hover:border-zinc-700 hover:text-zinc-300 active:scale-[0.96]"
      >
        ?
      </button>

      <WelcomeOverlay forceOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
