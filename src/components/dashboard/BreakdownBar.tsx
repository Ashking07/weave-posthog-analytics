import type { EngineerBreakdown } from "@/types";
import { pct } from "@/utils/format";

export function BreakdownBar({ breakdown }: { breakdown: EngineerBreakdown }) {
  const total = breakdown.pr_points + breakdown.review_points;
  if (total === 0)
    return (
      <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800" />
    );

  const prW = pct(breakdown.pr_points, total);
  const revW = pct(breakdown.review_points, total);

  return (
    <div
      className="flex h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
      title={`PR ${prW.toFixed(0)}% / Review ${revW.toFixed(0)}%`}
    >
      <div
        className="rounded-l-full bg-blue-500 transition-all"
        style={{ width: `${prW}%` }}
      />
      <div
        className="bg-emerald-500 transition-all"
        style={{ width: `${revW}%` }}
      />
    </div>
  );
}
