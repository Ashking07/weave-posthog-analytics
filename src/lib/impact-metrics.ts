/**
 * Impact metrics computation from merged PR data.
 */

import type { Engineer, EngineerBreakdown, PRNode, TopPR } from "@/types";
import { isBot } from "./github";

export const WINDOW_DAYS = 90;

export function sinceDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * reviewer -> prUrl -> { prCreatedAt, minSubmittedAt } — first review time per PR per reviewer
 */
type ReviewerFirstReview = Map<string, Map<string, { prCreatedAt: string; minSubmittedAt: string }>>;

export function computeMetrics(prs: PRNode[], windowStart: Date): Engineer[] {
  const authorMap = new Map<
    string,
    {
      avatarUrl: string;
      prs: PRNode[];
      reviewsGiven: number;
    }
  >();

  const reviewerFirstReview: ReviewerFirstReview = new Map();

  const ensure = (login: string, avatarUrl = "") => {
    if (!authorMap.has(login)) {
      authorMap.set(login, { avatarUrl, prs: [], reviewsGiven: 0 });
    }
    const entry = authorMap.get(login)!;
    if (avatarUrl && !entry.avatarUrl) entry.avatarUrl = avatarUrl;
    return entry;
  };

  for (const pr of prs) {
    const prAuthor = pr.author?.login;
    if (!prAuthor || isBot(prAuthor)) continue;

    const entry = ensure(prAuthor, pr.author?.avatarUrl ?? "");
    entry.prs.push(pr);

    for (const review of pr.reviews.nodes) {
      const reviewer = review.author?.login;
      if (!reviewer || isBot(reviewer)) continue;
      if (reviewer === prAuthor) continue;
      const submittedAt = new Date(review.submittedAt);
      if (submittedAt < windowStart) continue;

      const reviewerEntry = ensure(reviewer);
      reviewerEntry.reviewsGiven += 1;

      // Track first review per reviewer per PR for response-time metric
      let byPr = reviewerFirstReview.get(reviewer);
      if (!byPr) {
        byPr = new Map();
        reviewerFirstReview.set(reviewer, byPr);
      }
      const existing = byPr.get(pr.url);
      if (!existing || review.submittedAt < existing.minSubmittedAt) {
        byPr.set(pr.url, { prCreatedAt: pr.createdAt, minSubmittedAt: review.submittedAt });
      }
    }
  }

  const engineers: Engineer[] = [];

  for (const [login, data] of authorMap) {
    const merged_prs = data.prs.length;

    const codeSizeScore = data.prs.reduce((sum, pr) => {
      const linesChanged = Math.min(pr.additions + pr.deletions, 2000);
      return sum + Math.log1p(linesChanged);
    }, 0);
    const pr_points = merged_prs * 3 + codeSizeScore;
    const review_points = data.reviewsGiven * 1.2;
    const total = pr_points + review_points;

    const mergeDays = data.prs.map((pr) => {
      const created = new Date(pr.createdAt).getTime();
      const merged = new Date(pr.mergedAt).getTime();
      return (merged - created) / 86_400_000;
    });
    const medianMergeDays = median(mergeDays);

    const prSizes = data.prs.map((pr) => pr.additions + pr.deletions);
    const medianPrSize = median(prSizes);

    const topPRs: TopPR[] = [...data.prs]
      .sort((a, b) => new Date(b.mergedAt).getTime() - new Date(a.mergedAt).getTime())
      .slice(0, 3)
      .map(({ title, url, mergedAt, additions, deletions }) => ({
        title,
        url,
        mergedAt,
        additions,
        deletions,
      }));

    // Median time from PR open to this reviewer's first review (hours)
    const byPr = reviewerFirstReview.get(login);
    const responseTimesHours =
      byPr?.size
        ? [...byPr.values()].map(
            (v) =>
              (new Date(v.minSubmittedAt).getTime() - new Date(v.prCreatedAt).getTime()) / 3_600_000,
          )
        : [];
    const medianReviewResponseHours =
      responseTimesHours.length > 0 ? median(responseTimesHours) : null;

    engineers.push({
      login,
      avatarUrl: data.avatarUrl,
      total: Math.round(total * 100) / 100,
      breakdown: {
        pr_points: Math.round(pr_points * 100) / 100,
        review_points: Math.round(review_points * 100) / 100,
      },
      merged_prs,
      reviews_given: data.reviewsGiven,
      medianMergeDays,
      medianPrSize: Math.round(medianPrSize),
      medianReviewResponseHours:
        medianReviewResponseHours != null ? Math.round(medianReviewResponseHours * 10) / 10 : null,
      topPRs,
    });
  }

  engineers.sort((a, b) => b.total - a.total);
  return engineers;
}
