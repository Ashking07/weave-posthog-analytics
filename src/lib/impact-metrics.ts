/**
 * Impact metrics computation from merged PR data.
 * Transparent, defensible scoring: no black box.
 */

import type {
  CommitTimeline,
  Engineer,
  EngineerBreakdown,
  LinkedIssue,
  PRClassification,
  PRNode,
  ReactionSummary,
  TopPR,
} from "@/types";
import { isBot } from "./github";
import { classifyPullRequest } from "./impactTaxonomy";
import { normalizePRNode } from "./prNormalize";

export const WINDOW_DAYS = 90;

// ── Scoring constants (exported for Methodology UI) ────────────────────────
export const BASE_PR = 3; // points per merged PR
export const REVIEW_WEIGHT = 1.2; // points per review given
export const COMPLEXITY_CAP = 8; // max log1p(additions+deletions) per PR (capped)

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

export interface ComputeMetricsResult {
  engineers: Engineer[];
  prsCount: number;
  reviewsCount: number;
}

export function computeMetrics(prs: PRNode[], windowStart: Date): ComputeMetricsResult {
  const authorMap = new Map<
    string,
    {
      avatarUrl: string;
      prs: PRNode[];
      reviewsGiven: number;
    }
  >();

  const reviewerFirstReview: ReviewerFirstReview = new Map();
  let reviewsCount = 0;

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
      reviewsCount += 1;

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

    // Size normalization: log1p(additions+deletions) per PR, capped
    const complexityPoints = data.prs.reduce((sum, pr) => {
      const lines = pr.additions + pr.deletions;
      const capped = Math.min(Math.log1p(lines), COMPLEXITY_CAP);
      return sum + capped;
    }, 0);
    const pr_base_points = merged_prs * BASE_PR;
    const pr_points = pr_base_points + complexityPoints;
    const review_points = data.reviewsGiven * REVIEW_WEIGHT;
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
      .slice(0, 15)
      .map((rawPr) => {
        const pr = normalizePRNode(rawPr);

        const labels = pr.labels?.nodes?.map((l) => l.name) ?? [];
        const filePaths = pr.files?.nodes?.map((f) => f.path) ?? [];
        const { buckets, reasons } = classifyPullRequest({
          title: pr.title,
          labels,
          filePaths,
        });
        const classification: PRClassification = {
          buckets: [...buckets],
          reasons,
        };

        const linkedIssues: LinkedIssue[] =
          pr.closingIssuesReferences?.nodes?.map((i) => ({
            number: i.number,
            title: i.title,
            url: i.url,
          })) ?? [];

        const reviewCommentCount =
          pr.reviews?.nodes?.reduce(
            (sum, r) => sum + (r.comments?.totalCount ?? 0),
            0,
          ) ?? 0;

        const commitNodes = pr.commits?.nodes ?? [];
        const commitTimeline: CommitTimeline = {
          firstCommitAt: commitNodes[0]?.commit?.authoredDate ?? null,
          lastCommitAt:
            commitNodes.length > 0
              ? commitNodes[commitNodes.length - 1]?.commit?.committedDate ?? null
              : null,
          commitCount: pr.commits?.totalCount ?? 0,
        };

        const reactionNodes = pr.reactions?.nodes ?? [];
        const byType: Record<string, number> = {};
        for (const r of reactionNodes) {
          byType[r.content] = (byType[r.content] ?? 0) + 1;
        }
        const reactions: ReactionSummary = {
          totalCount: pr.reactions?.totalCount ?? 0,
          byType,
        };

        return {
          title: pr.title,
          url: pr.url,
          mergedAt: pr.mergedAt,
          additions: pr.additions,
          deletions: pr.deletions,
          body: pr.body || undefined,
          labels: labels.length > 0 ? labels : undefined,
          filePaths: filePaths.length > 0 ? filePaths : undefined,
          linkedIssues: linkedIssues.length > 0 ? linkedIssues : undefined,
          reviewThreadCount: pr.reviewThreads?.totalCount ?? 0,
          reviewCommentCount,
          commitTimeline,
          reactions: reactions.totalCount > 0 ? reactions : undefined,
          classification,
        };
      });

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
        pr_base_points: Math.round(pr_base_points * 100) / 100,
        complexity_points: Math.round(complexityPoints * 100) / 100,
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

  // Exclude bots and review-only contributors (no merged PRs = likely automated review bots)
  const filtered = engineers.filter(
    (e) => !isBot(e.login) && e.merged_prs > 0,
  );

  return { engineers: filtered, prsCount: prs.length, reviewsCount };
}
