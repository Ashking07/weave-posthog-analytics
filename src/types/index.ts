/**
 * Shared types for PostHog Analytics.
 * Used by API, components, and hooks.
 */

import type { ReactNode } from "react";

// ── API / GitHub ────────────────────────────────────────────────────

export interface PRNode {
  title: string;
  url: string;
  body: string;
  createdAt: string;
  mergedAt: string;
  mergeCommit: { oid: string } | null;
  additions: number;
  deletions: number;
  author: { login: string; avatarUrl: string } | null;
  labels: { nodes: { name: string }[] };
  /** File paths changed in this PR (populated from GraphQL files connection) */
  files: { nodes: { path: string }[] };
  /** Closing references (issues closed by this PR) */
  closingIssuesReferences: { nodes: { number: number; title: string; url: string }[] };
  /** Review threads with comment counts */
  reviewThreads: { totalCount: number };
  /** Total comment count (review + issue comments) */
  comments: { totalCount: number };
  /** Commit timestamps for timeline analysis */
  commits: {
    nodes: { commit: { authoredDate: string; committedDate: string } }[];
    totalCount: number;
  };
  /** Reactions on the PR itself */
  reactions: { totalCount: number; nodes: { content: string }[] };
  reviews: { nodes: ReviewNode[] };
}

export interface ReviewNode {
  author: { login: string } | null;
  submittedAt: string;
  state: string;
  comments: { totalCount: number };
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
  /** For transparency: merged_prs * BASE_PR */
  pr_base_points?: number;
  /** For transparency: Σ min(log1p(additions+deletions), COMPLEXITY_CAP) */
  complexity_points?: number;
}

export interface PRClassification {
  buckets: string[];
  reasons: string[];
}

export interface LinkedIssue {
  number: number;
  title: string;
  url: string;
}

export interface ReactionSummary {
  totalCount: number;
  byType: Record<string, number>;
}

export interface CommitTimeline {
  firstCommitAt: string | null;
  lastCommitAt: string | null;
  commitCount: number;
}

export interface TopPR {
  title: string;
  url: string;
  mergedAt: string;
  additions: number;
  deletions: number;
  body?: string;
  labels?: string[];
  filePaths?: string[];
  linkedIssues?: LinkedIssue[];
  reviewThreadCount?: number;
  reviewCommentCount?: number;
  commitTimeline?: CommitTimeline;
  reactions?: ReactionSummary;
  classification?: PRClassification;
}

/** Item for TopItemsList / impact section cards */
export interface TopItem {
  id: string;
  title: string;
  url: string;
  author: string;
  mergedAt: string;
  badge?: ReactNode;
  evidenceContent?: ReactNode;
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

import type { DoraProxies } from "@/lib/doraMetrics";

export interface ImpactResponse {
  generatedAt: string;
  windowDays: number;
  repo?: string;
  top: Engineer[];
  insights?: Record<string, EngineerInsight> | null;
  error?: string;
  /** Data coverage: total merged PRs analyzed */
  prsCount?: number;
  /** Data coverage: total reviews analyzed (excluding bots) */
  reviewsCount?: number;
  /** DORA proxy metrics (GitHub-only) */
  doraProxies?: DoraProxies;
}
