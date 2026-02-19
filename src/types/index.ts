/**
 * Shared types for PostHog Analytics.
 * Used by API, components, and hooks.
 */

// ── API / GitHub ────────────────────────────────────────────────────

export interface PRNode {
  title: string;
  url: string;
  createdAt: string;
  mergedAt: string;
  mergeCommit: { oid: string } | null;
  additions: number;
  deletions: number;
  author: { login: string; avatarUrl: string } | null;
  reviews: { nodes: ReviewNode[] };
}

export interface ReviewNode {
  author: { login: string } | null;
  submittedAt: string;
  state: string;
}

export interface SearchResult {
  search: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: PRNode[];
  };
}

// ── Impact metrics ───────────────────────────────────────────────────

export interface EngineerBreakdown {
  pr_points: number;
  review_points: number;
}

export interface TopPR {
  title: string;
  url: string;
  mergedAt: string;
  additions: number;
  deletions: number;
}

export interface Engineer {
  login: string;
  avatarUrl: string;
  total: number;
  breakdown: EngineerBreakdown;
  merged_prs: number;
  reviews_given: number;
  medianMergeDays: number;
  medianPrSize: number; // median additions+deletions across their PRs
  medianReviewResponseHours: number | null; // median time from PR open to first review
  topPRs: TopPR[];
}

// ── LLM insights ─────────────────────────────────────────────────────

export interface EngineerInsight {
  summary: string;
  prTypes: Record<string, number>;
}

// ── Repo search ──────────────────────────────────────────────────────

export interface RepoSearchResult {
  id: string;
  full_name: string;
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
}

// ── API response ────────────────────────────────────────────────────

export interface ImpactResponse {
  generatedAt: string;
  windowDays: number;
  repo?: string;
  top: Engineer[];
  insights?: Record<string, EngineerInsight> | null;
  error?: string;
}
