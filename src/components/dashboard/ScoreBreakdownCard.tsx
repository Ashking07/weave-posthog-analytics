import type { Engineer } from "@/types";
import { Card } from "@/components/ui";
import { BASE_PR, REVIEW_WEIGHT } from "@/lib/impact-metrics";

export function ScoreBreakdownCard({ engineer }: { engineer: Engineer }) {
  const b = engineer.breakdown;
  const prBase = b.pr_base_points ?? engineer.merged_prs * BASE_PR;
  const complexity = b.complexity_points ?? b.pr_points - prBase;

  return (
    <Card className="overflow-hidden border-zinc-200 bg-white dark:border-zinc-800/80 dark:bg-zinc-900/50">
      <div className="border-b border-zinc-100 bg-zinc-50/50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-800/30">
        <h4 className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          Score breakdown
        </h4>
        <p className="mt-0.5 truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
          {engineer.login}
        </p>
      </div>
      <div className="space-y-0 px-3 py-2.5">
        <div className="rounded-lg bg-violet-50/80 px-3 py-2 dark:bg-violet-500/10">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-violet-600/80 dark:text-violet-400/80">
              Shipped (PR)
            </span>
            <span className="font-mono text-sm font-semibold tabular-nums text-violet-700 dark:text-violet-300">
              {b.pr_points.toFixed(1)}
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px] tabular-nums text-violet-600/70 dark:text-violet-400/70">
            {engineer.merged_prs} × {BASE_PR} + {complexity.toFixed(1)}
          </p>
        </div>
        <div className="rounded-lg bg-emerald-50/80 px-3 py-2 dark:bg-emerald-500/10">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-600/80 dark:text-emerald-400/80">
              Unblocked (Reviews)
            </span>
            <span className="font-mono text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
              {b.review_points.toFixed(1)}
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px] tabular-nums text-emerald-600/70 dark:text-emerald-400/70">
            {engineer.reviews_given} × {REVIEW_WEIGHT}
          </p>
        </div>
        <div className="flex items-center justify-between border-t border-zinc-200 pt-2 dark:border-zinc-700">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Total</span>
          <span className="font-mono text-base font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
            {engineer.total.toFixed(1)}
          </span>
        </div>
      </div>
    </Card>
  );
}
