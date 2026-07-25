"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { SOUND_STORAGE_KEY } from "@/lib/sounds";

export default function SoundToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Starts false on both server and client; the mount effect reads the saved
  // preference — avoids a hydration mismatch from reading localStorage in render
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = new Audio("/audio/cosmic-ambient.mp3");
    audio.loop = true;
    audio.volume = 0.3;
    audio.preload = "none";
    audioRef.current = audio;

    let resumeOnInteraction: (() => void) | null = null;

    // Resume if the user previously enabled sound. One-time sync from
    // localStorage after hydration; reading it in render would mismatch SSR.
    if (localStorage.getItem(SOUND_STORAGE_KEY) === "true") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlaying(true);
      audio.play().catch(() => {
        // Autoplay blocked — resume on first user interaction
        resumeOnInteraction = () => {
          audio.play().catch(() => {});
        };
        document.addEventListener("click", resumeOnInteraction, { once: true });
      });
    }

    return () => {
      if (resumeOnInteraction) {
        document.removeEventListener("click", resumeOnInteraction);
      }
      audio.pause();
      audio.src = "";
    };
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      localStorage.setItem(SOUND_STORAGE_KEY, "false");
    } else {
      audio.play().then(() => setPlaying(true));
      localStorage.setItem(SOUND_STORAGE_KEY, "true");
    }
  }, [playing]);

  return (
    <button
      onClick={toggle}
      aria-label={playing ? "Mute background sound" : "Unmute background sound"}
      className="relative flex h-11 w-11 md:h-10 md:w-10 cursor-pointer items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/80 text-zinc-500 backdrop-blur-sm transition-[border-color,color,scale] duration-150 hover:border-zinc-700 hover:text-zinc-300 active:scale-[0.96]"
    >
      {playing ? (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      ) : (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      )}
    </button>
  );
}
