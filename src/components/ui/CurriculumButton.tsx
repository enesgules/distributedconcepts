"use client";

import { OPEN_CURRICULUM_EVENT } from "@/lib/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function CurriculumButton() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            onClick={() =>
              window.dispatchEvent(new Event(OPEN_CURRICULUM_EVENT))
            }
            aria-label="Open curriculum"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-zinc-950/90 text-zinc-500 shadow-[0_0_0_1px_rgba(255,255,255,0.08)] transition-[background-color,color,scale] duration-150 hover:bg-zinc-900 hover:text-zinc-200 active:scale-[0.96] md:h-10 md:w-10"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="3" cy="4" r="1.25" fill="currentColor" />
              <circle cx="3" cy="12" r="1.25" fill="currentColor" />
              <path
                d="M6.5 4h6M6.5 12h6M3 5.5v5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
          </button>
        }
      />
      <TooltipContent side="bottom">Open curriculum</TooltipContent>
    </Tooltip>
  );
}
