/**
 * DORA Metrics — GitHub-only proxies
 *
 * ⚠️  CAVEAT: These are *proxies* computed from GitHub data, not true DORA metrics.
 * - Lead Time uses PR commit/creation → merge as a proxy for "commit to production".
 *   Real lead time requires deployment telemetry.
 * - Deployment Frequency uses GitHub Releases or merge frequency as a proxy.
 *   Many teams deploy without creating releases.
 * - Change Failure Rate identifies reverts/hotfixes within a window after a deploy.
 *   It cannot detect failures that don't result in a code change.
 * - MTTR uses incident issue close time or hotfix merge time.
 *   Real MTTR requires incident management tooling.
 *
 * These proxies are directionally useful for comparing trends over time within
 * the same repo, but should not be compared across repos or treated as gospel.
 */

// ── Input types ─────────────────────────────────────────────────────

export interface DoraPR {
  title: string;
  url: string;
  createdAt: string;
  mergedAt: string;
  labels: string[];
  /** First commit authored date (may be null if unavailable) */
  firstCommitAt: string | null;
}

export interface DoraRelease {
  tagName: string;
  createdAt: string;
  url: string;
}

export interface DoraIssue {
  number: number;
  title: string;
  labels: string[];
  createdAt: string;
  closedAt: string | null;
}

export interface DoraInput {
  prs: DoraPR[];
  releases?: DoraRelease[];
  issues?: DoraIssue[];
  windowDays: number;
  /** Days after a deploy to look for revert/hotfix (default: 7) */
  changeFailureWindowDays?: number;
}

/** Minimal PR shape for conversion from PRNode / GraphQL */
export interface PRLike {
  title: string;
  url: string;
  createdAt: string;
  mergedAt: string;
  labels?: { nodes?: { name: string }[] };
  commits?: { nodes?: { commit?: { authoredDate?: string } }[] };
}

export function prNodeToDoraPR(pr: PRLike): DoraPR {
  const labels = pr.labels?.nodes?.map((n) => n.name) ?? [];
  const firstCommit = pr.commits?.nodes?.[0]?.commit?.authoredDate ?? null;
  return {
    title: pr.title,
    url: pr.url,
    createdAt: pr.createdAt,
    mergedAt: pr.mergedAt,
    labels,
    firstCommitAt: firstCommit,
  };
}

/** Tooltip text for each DORA proxy (for UI) */
export const DORA_PROXY_TOOLTIPS = {
  leadTime:
    "Proxy: first commit → merge (or PR created → merge if commits unavailable). Real lead time needs deployment telemetry.",
  deployFreq:
    "Proxy: GitHub Releases count, or merge frequency to default branch. Many teams deploy without releases.",
  changeFailureRate:
    "Proxy: % of deploys followed by revert/hotfix within N days. Cannot detect failures without code changes.",
  mttr:
    "Proxy: incident issue close time or hotfix PR merge time. Real MTTR needs incident tooling.",
} as const;

// ── Output types ────────────────────────────────────────────────────

export interface LeadTimeResult {
  medianHours: number;
  p75Hours: number;
  sampleSize: number;
  /** "commit_to_merge" or "created_to_merge" */
  method: "commit_to_merge" | "created_to_merge";
}

export interface DeployFrequencyResult {
  totalDeploys: number;
  perDay: number;
  perWeek: number;
  /** "releases" or "merge_frequency" */
  method: "releases" | "merge_frequency";
}

export interface ChangeFailureRateResult {
  totalDeploys: number;
  failedDeploys: number;
  rate: number;
  windowDays: number;
}

export interface MTTRResult {
  medianHours: number;
  sampleSize: number;
  /** "incident_issues" or "hotfix_resolution" */
  method: "incident_issues" | "hotfix_resolution";
}

export interface DoraProxies {
  leadTime: LeadTimeResult | null;
  deployFreq: DeployFrequencyResult | null;
  changeFailureRate: ChangeFailureRateResult | null;
  mttr: MTTRResult | null;
  notes: string[];
}

// ── Helpers ─────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function medianOf(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function hoursMs(ms: number): number {
  return Math.round((ms / 3_600_000) * 10) / 10;
}

const REVERT_HOTFIX_RE = /\b(revert|hotfix|rollback|incident|outage)\b/i;
const INCIDENT_LABELS = new Set(["bug", "incident", "hotfix", "outage", "revert", "rollback"]);

function isRevertOrHotfix(pr: DoraPR): boolean {
  if (REVERT_HOTFIX_RE.test(pr.title)) return true;
  return pr.labels.some((l) => INCIDENT_LABELS.has(l.toLowerCase()));
}

function isIncidentIssue(issue: DoraIssue): boolean {
  return issue.labels.some((l) => INCIDENT_LABELS.has(l.toLowerCase()));
}

// ── Lead Time ───────────────────────────────────────────────────────

function computeLeadTime(prs: DoraPR[]): LeadTimeResult | null {
  const withCommit: number[] = [];
  const withoutCommit: number[] = [];

  for (const pr of prs) {
    const mergedMs = new Date(pr.mergedAt).getTime();
    if (pr.firstCommitAt) {
      const commitMs = new Date(pr.firstCommitAt).getTime();
      const diff = mergedMs - commitMs;
      if (diff > 0) withCommit.push(diff);
    }
    const createdMs = new Date(pr.createdAt).getTime();
    const diff = mergedMs - createdMs;
    if (diff > 0) withoutCommit.push(diff);
  }

  const useCommit = withCommit.length >= prs.length * 0.5;
  const times = useCommit ? withCommit : withoutCommit;
  if (times.length === 0) return null;

  const sorted = [...times].sort((a, b) => a - b);
  return {
    medianHours: hoursMs(medianOf(times)),
    p75Hours: hoursMs(percentile(sorted, 75)),
    sampleSize: times.length,
    method: useCommit ? "commit_to_merge" : "created_to_merge",
  };
}

// ── Deploy Frequency ────────────────────────────────────────────────

function computeDeployFreq(
  prs: DoraPR[],
  releases: DoraRelease[] | undefined,
  windowDays: number,
): DeployFrequencyResult | null {
  const useReleases = releases && releases.length > 0;
  const total = useReleases ? releases.length : prs.length;

  if (total === 0) return null;

  const days = Math.max(windowDays, 1);
  return {
    totalDeploys: total,
    perDay: Math.round((total / days) * 100) / 100,
    perWeek: Math.round((total / days) * 7 * 100) / 100,
    method: useReleases ? "releases" : "merge_frequency",
  };
}

// ── Change Failure Rate ─────────────────────────────────────────────

function computeChangeFailureRate(
  prs: DoraPR[],
  releases: DoraRelease[] | undefined,
  failureWindowDays: number,
): ChangeFailureRateResult | null {
  const useReleases = releases && releases.length > 0;

  const deployTimestamps: number[] = useReleases
    ? releases.map((r) => new Date(r.createdAt).getTime())
    : prs.map((p) => new Date(p.mergedAt).getTime());

  if (deployTimestamps.length === 0) return null;

  const revertPrs = prs.filter(isRevertOrHotfix);
  const revertTimestamps = revertPrs.map((p) => new Date(p.mergedAt).getTime());
  const windowMs = failureWindowDays * 86_400_000;

  let failedDeploys = 0;
  for (const deployTs of deployTimestamps) {
    const hasFollowUp = revertTimestamps.some(
      (rt) => rt > deployTs && rt <= deployTs + windowMs,
    );
    if (hasFollowUp) failedDeploys++;
  }

  return {
    totalDeploys: deployTimestamps.length,
    failedDeploys,
    rate: deployTimestamps.length > 0
      ? Math.round((failedDeploys / deployTimestamps.length) * 1000) / 10
      : 0,
    windowDays: failureWindowDays,
  };
}

// ── MTTR ────────────────────────────────────────────────────────────

function computeMTTR(
  prs: DoraPR[],
  issues: DoraIssue[] | undefined,
): MTTRResult | null {
  const incidentIssues = issues?.filter(
    (i) => isIncidentIssue(i) && i.closedAt,
  );

  if (incidentIssues && incidentIssues.length >= 3) {
    const times = incidentIssues.map((i) => {
      const created = new Date(i.createdAt).getTime();
      const closed = new Date(i.closedAt!).getTime();
      return closed - created;
    }).filter((t) => t > 0);

    if (times.length > 0) {
      return {
        medianHours: hoursMs(medianOf(times)),
        sampleSize: times.length,
        method: "incident_issues",
      };
    }
  }

  const hotfixPrs = prs.filter(isRevertOrHotfix);
  if (hotfixPrs.length === 0) return null;

  const times = hotfixPrs.map((p) => {
    const created = new Date(p.createdAt).getTime();
    const merged = new Date(p.mergedAt).getTime();
    return merged - created;
  }).filter((t) => t > 0);

  if (times.length === 0) return null;

  return {
    medianHours: hoursMs(medianOf(times)),
    sampleSize: times.length,
    method: "hotfix_resolution",
  };
}

// ── Main entry point ────────────────────────────────────────────────

export function computeDoraProxies(input: DoraInput): DoraProxies {
  const {
    prs,
    releases,
    issues,
    windowDays,
    changeFailureWindowDays = 7,
  } = input;

  const notes: string[] = [];

  const leadTime = computeLeadTime(prs);
  if (leadTime) {
    notes.push(
      leadTime.method === "commit_to_merge"
        ? `Lead time: first commit → merge (${leadTime.sampleSize} PRs)`
        : `Lead time: PR created → merge (fallback, ${leadTime.sampleSize} PRs)`,
    );
  } else {
    notes.push("Lead time: insufficient data");
  }

  const deployFreq = computeDeployFreq(prs, releases, windowDays);
  if (deployFreq) {
    notes.push(
      deployFreq.method === "releases"
        ? `Deploy frequency: based on ${deployFreq.totalDeploys} GitHub releases`
        : `Merge frequency (proxy): ${deployFreq.totalDeploys} merges to default branch`,
    );
  }

  const changeFailureRate = computeChangeFailureRate(prs, releases, changeFailureWindowDays);
  if (changeFailureRate) {
    notes.push(
      `Change failure rate: ${changeFailureRate.rate}% (${changeFailureRate.failedDeploys}/${changeFailureRate.totalDeploys} followed by revert/hotfix within ${changeFailureWindowDays}d)`,
    );
  }

  const mttr = computeMTTR(prs, issues);
  if (mttr) {
    notes.push(
      mttr.method === "incident_issues"
        ? `MTTR: based on ${mttr.sampleSize} incident issues (created → closed)`
        : `MTTR: based on ${mttr.sampleSize} hotfix PRs (created → merged)`,
    );
  } else {
    notes.push("MTTR: no incident issues or hotfix PRs found");
  }

  return { leadTime, deployFreq, changeFailureRate, mttr, notes };
}
