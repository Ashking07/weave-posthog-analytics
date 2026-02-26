import type { Engineer } from "@/types";
import { getMix } from "@/utils/format";

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function ExecutiveSummary({
  engineers,
  prsCount,
  reviewsCount,
  windowDays,
}: {
  engineers: Engineer[];
  prsCount: number | undefined;
  reviewsCount: number | undefined;
  windowDays: number;
}) {
  if (engineers.length === 0) return null;

  const totalPrsFromTop = engineers.reduce((s, e) => s + e.merged_prs, 0);
  const totalReviewsFromTop = engineers.reduce((s, e) => s + e.reviews_given, 0);
  const prSharePct = prsCount && prsCount > 0 ? Math.round((totalPrsFromTop / prsCount) * 100) : null;
  const reviewSharePct = reviewsCount && reviewsCount > 0 ? Math.round((totalReviewsFromTop / reviewsCount) * 100) : null;

  const topShipper = engineers.reduce((a, b) =>
    a.breakdown.pr_points > b.breakdown.pr_points ? a : b,
  );
  const topUnblocker = engineers.reduce((a, b) =>
    a.breakdown.review_points > b.breakdown.review_points ? a : b,
  );

  const mixCounts = engineers.reduce(
    (acc, e) => {
      const m = getMix(e.breakdown).mix;
      if (m === "Delivery-heavy") acc.delivery++;
      else if (m === "Review-heavy") acc.review++;
      else acc.balanced++;
      return acc;
    },
    { delivery: 0, review: 0, balanced: 0 },
  );
  const mixParts: string[] = [];
  if (mixCounts.delivery) mixParts.push(`${mixCounts.delivery} delivery-heavy`);
  if (mixCounts.review) mixParts.push(`${mixCounts.review} review-heavy`);
  if (mixCounts.balanced) mixParts.push(`${mixCounts.balanced} balanced`);

  const parts: string[] = [];
  if (prSharePct != null) {
    parts.push(`Top ${engineers.length} shipped ${prSharePct}% of PRs`);
  }
  if (mixParts.length > 0) {
    parts.push(mixParts.join(", "));
  }
  if (topShipper.login === topUnblocker.login) {
    parts.push(`${topShipper.login} leads on both`);
  } else {
    parts.push(`${topShipper.login} leads on delivery`, `${topUnblocker.login} leads on reviews`);
  }

  return (
    <div className="rounded-lg border border-zinc-200/80 bg-white/90 px-3 py-2 shadow-sm dark:border-zinc-700/60 dark:bg-zinc-900/60">
      <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">Last {windowDays} days:</span>{" "}
        {parts.join(". ")}
      </p>
    </div>
  );
}
