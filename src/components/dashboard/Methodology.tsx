"use client";

import { useEffect, useRef, useState } from "react";
import { BASE_PR, REVIEW_WEIGHT, COMPLEXITY_CAP, WINDOW_DAYS } from "@/lib/impact-metrics";

export function Methodology() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-zinc-200/80 bg-white/80 px-2.5 py-1.5 text-left shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700/60 dark:bg-zinc-900/50 dark:hover:bg-zinc-800/50"
      >
        <div className="flex h-5 w-5 items-center justify-center rounded bg-amber-500/15 dark:bg-amber-500/20">
          <svg className="h-3 w-3 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Methodology</span>
        <svg
          className={`h-3 w-3 text-zinc-400 transition-transform duration-200 dark:text-zinc-500 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-80 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="max-h-[70vh] overflow-y-auto p-3">
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Scoring formula
            </p>
            <div className="space-y-2.5">
              <div className="rounded-lg bg-zinc-50 px-2.5 py-2 dark:bg-zinc-800/50">
                <p className="text-xs text-zinc-600 dark:text-zinc-300">
                  <span className="font-medium text-violet-600 dark:text-violet-400">PR points</span>
                  <span className="mx-1">=</span>
                  <code className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-[11px] dark:bg-zinc-700/80">
                    merged_prs × {BASE_PR}
                  </code>
                  <span className="mx-1">+</span>
                  <code className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-[11px] dark:bg-zinc-700/80">
                    Σ min(log₁₊(lines), {COMPLEXITY_CAP})
                  </code>
                </p>
              </div>
              <div className="rounded-lg bg-zinc-50 px-2.5 py-2 dark:bg-zinc-800/50">
                <p className="text-xs text-zinc-600 dark:text-zinc-300">
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">Review points</span>
                  <span className="mx-1">=</span>
                  <code className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-[11px] dark:bg-zinc-700/80">
                    reviews_given × {REVIEW_WEIGHT}
                  </code>
                </p>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                <strong>Total</strong> = PR points + Review points
              </p>
            </div>
            <div className="mt-3 rounded-lg border border-zinc-100 bg-amber-50/50 px-2.5 py-2 dark:border-zinc-800 dark:bg-amber-500/5">
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Last {WINDOW_DAYS} days · Bots and review-only excluded · Merge time is context only (not in score)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
