/**
 * Repo search: Meilisearch (when configured) + GitHub REST API fallback.
 * Returns top 5 matches for autocomplete.
 */

import type { RepoSearchResult } from "@/types";
import { searchRepos as githubSearchRepos } from "./github";

const MEILISEARCH_INDEX = "repos";

function toSearchResult(r: {
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
}): RepoSearchResult {
  return {
    id: r.full_name,
    full_name: r.full_name,
    name: r.full_name.split("/")[1] ?? r.full_name,
    description: r.description,
    html_url: r.html_url,
    stargazers_count: r.stargazers_count,
    language: r.language,
  };
}

async function searchMeilisearch(
  q: string,
  limit: number,
): Promise<RepoSearchResult[]> {
  const host = process.env.MEILISEARCH_HOST;
  const key = process.env.MEILISEARCH_API_KEY;
  if (!host || !key) return [];

  try {
    const { Meilisearch } = await import("meilisearch");
    const client = new Meilisearch({ host, apiKey: key });
    const index = client.index(MEILISEARCH_INDEX);
    const res = await index.search(q, { limit });
    const hits = (res.hits ?? []) as RepoSearchResult[];
    return hits.slice(0, limit);
  } catch {
    return [];
  }
}

async function indexIntoMeilisearch(repos: RepoSearchResult[]): Promise<void> {
  const host = process.env.MEILISEARCH_HOST;
  const key = process.env.MEILISEARCH_API_KEY;
  if (!host || !key || repos.length === 0) return;

  try {
    const { Meilisearch } = await import("meilisearch");
    const client = new Meilisearch({ host, apiKey: key });
    const index = client.index(MEILISEARCH_INDEX);
    await index.addDocuments(repos);
  } catch {
    // Ignore indexing errors
  }
}

/**
 * Search repos: Meilisearch first (if configured), then GitHub.
 * Optionally indexes GitHub results into Meilisearch for future searches.
 */
export async function searchRepos(
  token: string,
  q: string,
  limit = 5,
): Promise<RepoSearchResult[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];

  // Try Meilisearch first
  const meiliResults = await searchMeilisearch(trimmed, limit);
  if (meiliResults.length > 0) return meiliResults;

  // Fallback to GitHub
  const githubItems = await githubSearchRepos(token, trimmed, limit);
  const results = githubItems.map(toSearchResult);

  // Index into Meilisearch for next time (async, best effort)
  indexIntoMeilisearch(results).catch(() => {});

  return results;
}
