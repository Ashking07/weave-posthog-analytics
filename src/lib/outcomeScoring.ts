/**
 * Outcome PR scoring heuristic.
 *
 * Ranks OUTCOME-classified PRs by a simple, transparent score.
 * The breakdown is exposed for tooltip display.
 */

import type { TopPR } from "@/types";

export interface OutcomeScoreBreakdown {
  customerLabel: number;
  highImpactLabel: number;
  filesBucket: number;
  reactions: number;
  total: number;
}

export interface ScoredOutcomePR {
  pr: TopPR;
  author: string;
  authorAvatar: string;
  score: OutcomeScoreBreakdown;
}

const CUSTOMER_LABELS = new Set([
  "customer",
  "customer-facing",
  "user-facing",
  "ux",
  "product",
]);

const HIGH_IMPACT_LABELS = new Set([
  "security",
  "reliability",
  "performance",
  "perf",
  "critical",
  "p0",
  "p1",
  "sev1",
  "sev2",
]);

function filesChangedBucket(pr: TopPR): number {
  const count = pr.filePaths?.length ?? 0;
  if (count >= 20) return 2;
  if (count >= 5) return 1;
  return 0;
}

export function scoreOutcomePR(pr: TopPR): OutcomeScoreBreakdown {
  const labels = (pr.labels ?? []).map((l) => l.toLowerCase());

  const customerLabel = labels.some((l) => CUSTOMER_LABELS.has(l)) ? 2 : 0;
  const highImpactLabel = labels.some((l) => HIGH_IMPACT_LABELS.has(l)) ? 1 : 0;
  const filesBucket = filesChangedBucket(pr);
  const reactions = Math.min(pr.reactions?.totalCount ?? 0, 3);

  return {
    customerLabel,
    highImpactLabel,
    filesBucket,
    reactions,
    total: customerLabel + highImpactLabel + filesBucket + reactions,
  };
}

export function isOutcomePR(pr: TopPR): boolean {
  return pr.classification?.buckets?.includes("OUTCOME") ?? false;
}
