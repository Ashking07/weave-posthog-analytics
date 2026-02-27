/**
 * Impact Classification Taxonomy
 *
 * Classifies pull requests into impact buckets based on labels, file paths,
 * and title/body keywords. The taxonomy is intentionally minimal but extensible:
 *
 * Buckets:
 *   OUTCOME        – User-facing features, product changes, shipped value
 *   LEVERAGE       – CI, tooling, DX, scripts — multiplies team velocity
 *   RELIABILITY    – Infra, migrations, alerting, ops — keeps things running
 *   LEADERSHIP     – RFCs, ADRs, design docs, architecture decisions
 *   TEAM_IMPACT    – Mentoring, onboarding, large-scale refactors that help others
 *   ACTIVITY_ONLY  – Trivial changes, version bumps, auto-generated code
 *
 * Each rule returns one or more buckets and a human-readable reason string
 * for transparency (shown in tooltips).
 *
 * To extend: add entries to LABEL_BUCKETS, PATH_RULES, or KEYWORD_RULES below.
 */

// ── Bucket enum ─────────────────────────────────────────────────────

export const ImpactBucket = {
  OUTCOME: "OUTCOME",
  LEVERAGE: "LEVERAGE",
  RELIABILITY: "RELIABILITY",
  LEADERSHIP: "LEADERSHIP",
  TEAM_IMPACT: "TEAM_IMPACT",
  ACTIVITY_ONLY: "ACTIVITY_ONLY",
} as const;

export type ImpactBucketType = (typeof ImpactBucket)[keyof typeof ImpactBucket];

// ── Classification result ───────────────────────────────────────────

export interface ClassificationResult {
  buckets: Set<ImpactBucketType>;
  reasons: string[];
}

// ── Label → bucket mapping ──────────────────────────────────────────

export const LABEL_BUCKETS: Record<string, ImpactBucketType[]> = {
  feature: [ImpactBucket.OUTCOME],
  enhancement: [ImpactBucket.OUTCOME],
  "new feature": [ImpactBucket.OUTCOME],
  "user-facing": [ImpactBucket.OUTCOME],
  bug: [ImpactBucket.OUTCOME],
  bugfix: [ImpactBucket.OUTCOME],
  fix: [ImpactBucket.OUTCOME],

  tooling: [ImpactBucket.LEVERAGE],
  dx: [ImpactBucket.LEVERAGE],
  "developer experience": [ImpactBucket.LEVERAGE],
  ci: [ImpactBucket.LEVERAGE],
  "ci/cd": [ImpactBucket.LEVERAGE],
  automation: [ImpactBucket.LEVERAGE],

  infrastructure: [ImpactBucket.RELIABILITY],
  infra: [ImpactBucket.RELIABILITY],
  ops: [ImpactBucket.RELIABILITY],
  migration: [ImpactBucket.RELIABILITY],
  security: [ImpactBucket.RELIABILITY],
  monitoring: [ImpactBucket.RELIABILITY],
  alerting: [ImpactBucket.RELIABILITY],
  deployment: [ImpactBucket.RELIABILITY],

  rfc: [ImpactBucket.LEADERSHIP],
  adr: [ImpactBucket.LEADERSHIP],
  architecture: [ImpactBucket.LEADERSHIP],
  design: [ImpactBucket.LEADERSHIP],
  proposal: [ImpactBucket.LEADERSHIP],

  refactor: [ImpactBucket.TEAM_IMPACT],
  "tech debt": [ImpactBucket.TEAM_IMPACT],
  "code quality": [ImpactBucket.TEAM_IMPACT],
  onboarding: [ImpactBucket.TEAM_IMPACT],
  documentation: [ImpactBucket.TEAM_IMPACT],

  dependencies: [ImpactBucket.ACTIVITY_ONLY],
  chore: [ImpactBucket.ACTIVITY_ONLY],
  "version bump": [ImpactBucket.ACTIVITY_ONLY],
  trivial: [ImpactBucket.ACTIVITY_ONLY],
};

// ── Path → bucket rules ─────────────────────────────────────────────

export interface PathRule {
  pattern: RegExp;
  buckets: ImpactBucketType[];
  label: string;
}

export const PATH_RULES: PathRule[] = [
  {
    pattern: /\.(github|ci|circleci)\//i,
    buckets: [ImpactBucket.LEVERAGE],
    label: "CI/workflows",
  },
  {
    pattern: /(workflows|scripts|tooling|tools)\//i,
    buckets: [ImpactBucket.LEVERAGE],
    label: "tooling/scripts",
  },
  {
    pattern: /(migrations?|infra|infrastructure|deploy|deployment|terraform|k8s|kubernetes|helm|docker)\//i,
    buckets: [ImpactBucket.RELIABILITY],
    label: "infra/migrations",
  },
  {
    pattern: /(ops|monitoring|alerting|grafana|datadog|sentry)\//i,
    buckets: [ImpactBucket.RELIABILITY],
    label: "ops/monitoring",
  },
  {
    pattern: /docs\/(rfcs?|design|adrs?)\//i,
    buckets: [ImpactBucket.LEADERSHIP],
    label: "design docs/RFCs",
  },
  {
    pattern: /\.md$/i,
    buckets: [ImpactBucket.TEAM_IMPACT],
    label: "documentation",
  },
];

// ── Keyword → bucket rules (matched against PR title) ───────────────

export interface KeywordRule {
  pattern: RegExp;
  buckets: ImpactBucketType[];
  label: string;
}

export const KEYWORD_RULES: KeywordRule[] = [
  {
    pattern: /\b(feat|feature|add|implement|ship|launch|introduce)\b/i,
    buckets: [ImpactBucket.OUTCOME],
    label: "feature keyword",
  },
  {
    pattern: /\b(fix|bug|patch|resolve|close)\b/i,
    buckets: [ImpactBucket.OUTCOME],
    label: "bugfix keyword",
  },
  {
    pattern: /\b(hotfix|revert|incident|postmortem|outage|rollback)\b/i,
    buckets: [ImpactBucket.RELIABILITY],
    label: "incident/hotfix keyword",
  },
  {
    pattern: /\b(SLO|SLA|latency|uptime|availability|p99|p95|error.?rate)\b/i,
    buckets: [ImpactBucket.RELIABILITY],
    label: "reliability metric keyword",
  },
  {
    pattern: /\b(cost|billing|spend|budget)\b/i,
    buckets: [ImpactBucket.RELIABILITY],
    label: "cost keyword",
  },
  {
    pattern: /\b(ci|pipeline|workflow|lint|format|test.?infra|dev.?server|dx)\b/i,
    buckets: [ImpactBucket.LEVERAGE],
    label: "DX/CI keyword",
  },
  {
    pattern: /\b(rfc|adr|design.?doc|architecture|proposal)\b/i,
    buckets: [ImpactBucket.LEADERSHIP],
    label: "leadership keyword",
  },
  {
    pattern: /\b(refactor|cleanup|clean.?up|tech.?debt|deprecate)\b/i,
    buckets: [ImpactBucket.TEAM_IMPACT],
    label: "refactor/debt keyword",
  },
  {
    pattern: /\b(chore|bump|deps?|dependencies|version)\b/i,
    buckets: [ImpactBucket.ACTIVITY_ONLY],
    label: "chore/deps keyword",
  },
];

// ── Classifier ──────────────────────────────────────────────────────

export interface ClassifiablePR {
  title: string;
  body?: string;
  labels?: string[];
  filePaths?: string[];
}

/**
 * Classify a pull request into impact buckets.
 *
 * Returns the set of matched buckets and an array of human-readable
 * reasons explaining which rule matched (for transparency tooltips).
 *
 * If no rules match, returns ACTIVITY_ONLY with a default reason.
 */
export function classifyPullRequest(pr: ClassifiablePR): ClassificationResult {
  const buckets = new Set<ImpactBucketType>();
  const reasons: string[] = [];

  if (pr.labels) {
    for (const raw of pr.labels) {
      const label = raw.toLowerCase().trim();
      const mapped = LABEL_BUCKETS[label];
      if (mapped) {
        for (const b of mapped) buckets.add(b);
        reasons.push(`Label "${raw}" → ${mapped.join(", ")}`);
      }
    }
  }

  if (pr.filePaths) {
    for (const rule of PATH_RULES) {
      if (pr.filePaths.some((fp) => rule.pattern.test(fp))) {
        for (const b of rule.buckets) buckets.add(b);
        reasons.push(`Path matches ${rule.label} → ${rule.buckets.join(", ")}`);
      }
    }
  }

  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(pr.title)) {
      for (const b of rule.buckets) buckets.add(b);
      reasons.push(`Title matches ${rule.label} → ${rule.buckets.join(", ")}`);
    } else if (pr.body && rule.pattern.test(pr.body)) {
      for (const b of rule.buckets) buckets.add(b);
      reasons.push(`Body matches ${rule.label} → ${rule.buckets.join(", ")}`);
    }
  }

  if (buckets.size === 0) {
    buckets.add(ImpactBucket.ACTIVITY_ONLY);
    reasons.push("No rules matched → ACTIVITY_ONLY (default)");
  }

  return { buckets, reasons };
}
