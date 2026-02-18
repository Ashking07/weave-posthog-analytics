import type { Engineer, EngineerInsight } from "@/types";
import { Avatar, Card } from "@/components/ui";
import { MixBadge } from "./MixBadge";
import { StackedBreakdownChart } from "./StackedBreakdownChart";
import { getMix, formatMedianMerge, formatPrSize, relativeTime } from "@/utils/format";

const PR_TYPE_LABELS: Record<string, string> = {
  bugfix: "Bug fixes",
  feature: "Features",
  refactor: "Refactors",
  infra: "Infra",
  docs: "Docs",
  test: "Test-only",
  other: "Other",
};

export function DetailPanel({
  engineer,
  insight,
  onClose,
}: {
  engineer: Engineer;
  insight?: EngineerInsight | null;
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
          <a
            href={`https://github.com/${engineer.login}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded p-0.5 text-zinc-400 transition-colors hover:text-zinc-200"
            aria-label={`View ${engineer.login} on GitHub`}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
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

      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
        <span>Median time to merge: {formatMedianMerge(engineer.medianMergeDays)}</span>
        <span>Median PR size: {formatPrSize(engineer.medianPrSize)}</span>
      </div>

      {insight && Object.keys(insight.prTypes || {}).length > 0 && (
        <div className="mt-2.5">
          <h4 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Work focus
          </h4>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            {Object.entries(insight.prTypes ?? {})
              .filter(([, n]) => (n as number) > 0)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 6)
              .map(([key, n]) => (
                <span key={key}>
                  {PR_TYPE_LABELS[key] ?? key}: <strong className="text-zinc-700 dark:text-zinc-300">{n as number}</strong>
                </span>
              ))}
          </div>
        </div>
      )}

      {engineer.quality && (
        <div className="mt-2.5">
          <h4 className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Test coverage habit
          </h4>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {engineer.quality.prs_with_tests} of {engineer.quality.total_prs_with_merge_commit_found} PRs
            {engineer.quality.test_touch_ratio != null && (
              <> ({Math.round(engineer.quality.test_touch_ratio * 100)}%)</>
            )}{" "}
            modified test files.
          </p>
          <p className="mt-1 text-[10px] italic text-zinc-400 dark:text-zinc-500">
            Rough proxy for &ldquo;updates tests with code changes.&rdquo; Not a quality guarantee.
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
