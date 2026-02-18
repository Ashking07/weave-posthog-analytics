import type { Engineer } from "@/types";
import { Avatar, Card } from "@/components/ui";
import { MixBadge } from "./MixBadge";
import { StackedBreakdownChart } from "./StackedBreakdownChart";
import { getMix, formatMedianMerge, relativeTime } from "@/utils/format";

export function DetailPanel({
  engineer,
  onClose,
}: {
  engineer: Engineer;
  onClose: () => void;
}) {
  const info = getMix(engineer.breakdown);

  return (
    <Card className="border-zinc-200 bg-white px-3.5 py-3 dark:border-zinc-800/80 dark:bg-zinc-900/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {engineer.avatarUrl ? (
            <Avatar src={engineer.avatarUrl} alt={engineer.login} size={28} />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold dark:bg-zinc-700">
              {engineer.login[0]?.toUpperCase()}
            </div>
          )}
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {engineer.login}
          </span>
          <MixBadge mix={info.mix} />
        </div>
        <button
          onClick={onClose}
          className="rounded p-0.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          aria-label="Close"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 text-center text-xs">
        <div className="rounded-md bg-blue-50/80 px-2 py-1.5 dark:bg-blue-500/10">
          <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
            {engineer.breakdown.pr_points.toFixed(1)}
          </span>
          <span className="ml-1 text-blue-600/60 dark:text-blue-400/60">PR</span>
        </div>
        <div className="rounded-md bg-emerald-50/80 px-2 py-1.5 dark:bg-emerald-500/10">
          <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {engineer.breakdown.review_points.toFixed(1)}
          </span>
          <span className="ml-1 text-emerald-600/60 dark:text-emerald-400/60">Rev</span>
        </div>
      </div>

      <div className="mt-2.5">
        <StackedBreakdownChart breakdown={engineer.breakdown} />
      </div>

      <div className="mt-2.5">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Median time to merge: {formatMedianMerge(engineer.medianMergeDays)}
        </p>
      </div>

      {engineer.quality && (
        <div className="mt-2.5">
          <h4 className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Quality signal
          </h4>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Tests touched: {engineer.quality.prs_with_tests}/{engineer.quality.total_prs_with_merge_commit_found}
            {engineer.quality.test_touch_ratio != null && (
              <> ({Math.round(engineer.quality.test_touch_ratio * 100)}%)</>
            )}
          </p>
          <p className="mt-1 text-[10px] italic text-zinc-400 dark:text-zinc-500">
            Test-touch is a heuristic quality signal (context-only).
          </p>
        </div>
      )}

      <div className="mt-2.5">
        <h4 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Recent PRs
        </h4>
        {engineer.topPRs.length === 0 ? (
          <p className="text-xs text-zinc-400">No PRs</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {engineer.topPRs.slice(0, 3).map((pr) => (
              <li key={pr.url} className="truncate text-xs leading-normal">
                <a
                  href={pr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                  title={pr.title}
                >
                  {pr.title.length > 48
                    ? pr.title.slice(0, 48) + "\u2026"
                    : pr.title}
                </a>
                <span className="ml-1 text-zinc-400 dark:text-zinc-500">
                  +{pr.additions} &minus;{pr.deletions} &middot; {relativeTime(pr.mergedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
