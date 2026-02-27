"use client";

import type { ReactNode } from "react";

export function ImpactGrid({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {children}
      </div>
      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
        These sections highlight evidence-linked signals, not a single impact score.
      </p>
    </div>
  );
}
