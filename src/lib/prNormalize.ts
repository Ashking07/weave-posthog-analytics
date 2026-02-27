/**
 * Normalize PRNode data with safe defaults for missing fields.
 *
 * The GraphQL query was extended with new fields (body, files,
 * closingIssuesReferences, reviewThreads, comments, commits, reactions).
 * Older cached data or partial API responses may lack these fields.
 * This module ensures every PRNode has safe defaults so downstream
 * code never crashes on undefined access.
 */

import type { PRNode } from "@/types";

function emptyNodes<T>(): { nodes: T[] } {
  return { nodes: [] };
}

function emptyCount(): { totalCount: number } {
  return { totalCount: 0 };
}

export function normalizePRNode(raw: Partial<PRNode>): PRNode {
  return {
    title: raw.title ?? "",
    url: raw.url ?? "",
    body: raw.body ?? "",
    createdAt: raw.createdAt ?? "",
    mergedAt: raw.mergedAt ?? "",
    mergeCommit: raw.mergeCommit ?? null,
    additions: raw.additions ?? 0,
    deletions: raw.deletions ?? 0,
    author: raw.author ?? null,
    labels: raw.labels ?? emptyNodes(),
    files: raw.files ?? emptyNodes(),
    closingIssuesReferences: raw.closingIssuesReferences ?? emptyNodes(),
    reviewThreads: raw.reviewThreads ?? emptyCount(),
    comments: raw.comments ?? emptyCount(),
    commits: raw.commits ?? { nodes: [], totalCount: 0 },
    reactions: raw.reactions ?? { totalCount: 0, nodes: [] },
    reviews: raw.reviews ?? emptyNodes(),
  };
}
