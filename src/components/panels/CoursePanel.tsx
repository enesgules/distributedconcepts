"use client";

import type { ReactNode } from "react";
import { STEPS, getStepIndexById, type StepId } from "@/lib/steps";

export function CoursePanel({
  lessonId,
  children,
  footer,
}: {
  lessonId: StepId;
  children: ReactNode;
  footer: ReactNode;
}) {
  const lesson = STEPS[getStepIndexById(lessonId)];
  const lessonNumber = getStepIndexById(lessonId) + 1;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.5rem] bg-[var(--surface-panel)] shadow-[0_0_0_1px_var(--line-subtle),0_24px_80px_rgba(0,0,0,0.48)] backdrop-blur-xl">
      <header className="shrink-0 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
            Experiment {lessonNumber} of {STEPS.length}
          </p>
          <div className="flex gap-1" aria-label={`Experiment ${lessonNumber} of ${STEPS.length}`}>
            {STEPS.map((step, index) => (
              <span
                key={step.id}
                className={`h-1 w-5 rounded-full ${
                  index <= lessonNumber - 1 ? "bg-emerald-300" : "bg-white/10"
                }`}
              />
            ))}
          </div>
        </div>
        <h1 className="mt-3 text-balance text-2xl font-semibold leading-[1.08] tracking-[-0.03em] text-zinc-50">
          {lesson.title}
        </h1>
        <p className="mt-2 text-pretty text-sm leading-6 text-[var(--text-secondary)]">
          {lesson.question}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-6">
        {children}
      </div>

      <footer className="shrink-0 bg-[linear-gradient(to_bottom,transparent,var(--surface-panel)_18%)] px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
        {footer}
      </footer>
    </section>
  );
}

export function ActionButton({
  children,
  onClick,
  disabled = false,
  tone = "primary",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "primary" | "secondary" | "danger";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-emerald-300 text-zinc-950 hover:bg-emerald-200"
      : tone === "danger"
        ? "bg-rose-400/12 text-rose-300 shadow-[inset_0_0_0_1px_rgba(251,113,133,0.2)] hover:bg-rose-400/20"
        : "bg-white/[0.055] text-zinc-200 shadow-[inset_0_0_0_1px_var(--line-subtle)] hover:bg-white/[0.09]";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-11 w-full rounded-2xl px-4 text-sm font-semibold transition-[background-color,scale,opacity] duration-150 active:not-disabled:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-35 ${toneClass}`}
    >
      {children}
    </button>
  );
}

export function Stage({
  label,
  title,
  detail,
  children,
}: {
  label: string;
  title: string;
  detail: string;
  children?: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="rounded-2xl bg-[var(--surface-inset)] p-4 shadow-[inset_0_0_0_1px_var(--line-subtle)]"
    >
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
        {label}
      </p>
      <h2 className="mt-2 text-base font-semibold tracking-[-0.01em] text-zinc-100">
        {title}
      </h2>
      <p className="mt-1.5 text-pretty text-sm leading-6 text-[var(--text-secondary)]">
        {detail}
      </p>
      {children}
    </div>
  );
}

export function PathStrip({
  items,
  activeIndex,
}: {
  items: readonly string[];
  activeIndex: number;
}) {
  return (
    <div className="mt-4 flex items-center" aria-label={items.join(" to ")}>
      {items.map((item, index) => (
        <div key={item} className="flex min-w-0 flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full transition-[background-color,box-shadow] duration-200 ${
                index <= activeIndex
                  ? "bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.7)]"
                  : "bg-zinc-700"
              }`}
            />
            <span className="whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
              {item}
            </span>
          </div>
          {index < items.length - 1 ? (
            <span
              className={`mx-2 mb-5 h-px min-w-4 flex-1 transition-colors duration-200 ${
                index < activeIndex ? "bg-emerald-300/55" : "bg-white/10"
              }`}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ResultCard({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl bg-emerald-300/8 p-4 text-sm leading-6 text-zinc-200 shadow-[inset_0_0_0_1px_rgba(110,231,183,0.18)]">
      {children}
    </div>
  );
}
