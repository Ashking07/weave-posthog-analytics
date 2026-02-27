/**
 * Reliability PR classification.
 *
 * Splits RELIABILITY-classified PRs into two sublists:
 *   A) Firefighting — reactive work (hotfixes, reverts, incident response)
 *   B) Systemic fixes — proactive guardrails (tests, observability, rate limits)
 *
 * ⚠️ These are heuristic proxies based on title keywords, labels, and file
 * paths. No attempt is made at incident attribution beyond PR author.
 */

import type { TopPR } from "@/types";

const FIREFIGHTING_TITLE_RE =
  /\b(hotfix|revert|incident|outage|rollback|emergency|p0|sev[12])\b/i;

const FIREFIGHTING_LABELS = new Set([
  "incident",
  "hotfix",
  "bug",
  "revert",
  "rollback",
  "outage",
  "emergency",
  "p0",
  "sev1",
  "sev2",
]);

const SYSTEMIC_PATH_RE =
  /\b(tests?|__tests__|spec|monitoring|observability|logging|logger|alerts?|alerting|rate.?limit|circuit.?breaker|guardrail|canary|feature.?flag|sentry|datadog|grafana|prometheus)\b/i;

const SYSTEMIC_TITLE_RE =
  /\b(test|spec|monitor|observ|logging|alert|rate.?limit|circuit.?breaker|guardrail|canary|feature.?flag|flaky|retry|timeout|backoff|health.?check)\b/i;

export type ReliabilityKind = "firefighting" | "systemic";

export interface ReliabilityAnalysis {
  kind: ReliabilityKind;
  signals: string[];
}

export interface TaggedReliabilityPR {
  pr: TopPR;
  author: string;
  authorAvatar: string;
  analysis: ReliabilityAnalysis;
}

export function isReliabilityPR(pr: TopPR): boolean {
  return pr.classification?.buckets?.includes("RELIABILITY") ?? false;
}

function detectFirefighting(pr: TopPR): string[] {
  const signals: string[] = [];
  if (FIREFIGHTING_TITLE_RE.test(pr.title)) {
    signals.push(`Title matches firefighting keyword`);
  }
  const labels = (pr.labels ?? []).map((l) => l.toLowerCase());
  const matched = labels.filter((l) => FIREFIGHTING_LABELS.has(l));
  if (matched.length > 0) {
    signals.push(`Labels: ${matched.join(", ")}`);
  }
  return signals;
}

function detectSystemic(pr: TopPR): string[] {
  const signals: string[] = [];
  const paths = pr.filePaths ?? [];
  const matchedPaths = paths.filter((p) => SYSTEMIC_PATH_RE.test(p));
  if (matchedPaths.length > 0) {
    const sample = matchedPaths.slice(0, 3).join(", ");
    signals.push(
      `Paths touch guardrails/observability (${sample}${matchedPaths.length > 3 ? ` +${matchedPaths.length - 3}` : ""})`,
    );
  }
  if (SYSTEMIC_TITLE_RE.test(pr.title)) {
    signals.push(`Title matches systemic keyword`);
  }
  return signals;
}

export function classifyReliabilityPR(pr: TopPR): ReliabilityAnalysis | null {
  if (!isReliabilityPR(pr)) return null;

  const fireSignals = detectFirefighting(pr);
  const sysSignals = detectSystemic(pr);

  if (fireSignals.length > 0 && sysSignals.length === 0) {
    return { kind: "firefighting", signals: fireSignals };
  }
  if (sysSignals.length > 0) {
    return { kind: "systemic", signals: [...sysSignals, ...fireSignals] };
  }
  return { kind: "firefighting", signals: ["Reliability PR (no specific subtype signals)"] };
}

export interface ReliabilityCounts {
  firefighting: number;
  systemic: number;
}

export function countReliabilityPRs(
  prs: TopPR[],
): ReliabilityCounts {
  let firefighting = 0;
  let systemic = 0;
  for (const pr of prs) {
    const analysis = classifyReliabilityPR(pr);
    if (!analysis) continue;
    if (analysis.kind === "firefighting") firefighting++;
    else systemic++;
  }
  return { firefighting, systemic };
}

export function collectTaggedReliabilityPRs(
  prs: TopPR[],
  author: string,
  authorAvatar: string,
): TaggedReliabilityPR[] {
  const result: TaggedReliabilityPR[] = [];
  for (const pr of prs) {
    const analysis = classifyReliabilityPR(pr);
    if (!analysis) continue;
    result.push({ pr, author, authorAvatar, analysis });
  }
  return result;
}
