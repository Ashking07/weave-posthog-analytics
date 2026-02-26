/**
 * GitHub GraphQL API client for fetching merged PRs.
 */

import type { PRNode, SearchResult } from "@/types";

const GITHUB_GQL = "https://api.github.com/graphql";

/** Known bot logins that don't match regex patterns (lowercase) */
const KNOWN_BOTS = new Set([
  "cubic-dev-ai",
  "devin",
  "devin-ai-integration",
  "openai",
  "anthropic",
  "tabnine",
  "codestral",
  "codeium",
  "codacy",
  "sonar",
  "semgrep",
  "sweep",
  "aider",
  "github-actions[bot]",
  "dependabot[bot]",
  "renovate[bot]",
  "greptile-apps",
]);

/** Matches common GitHub bot patterns: [bot], -bot, -ai, -agent, dependabot, etc. */
const BOT_PATTERNS = [
  /(dependabot|github-actions|renovate|codecov|coveralls|greenkeeper|snyk|mergify|stale|imgbot|allcontributors|copilot)/i,
  /\[bot\]/i,
  /-bot$/i,
  /^bot-/i,
  /\bbot\b/i,
  /-ai$/i, // cubic-dev-ai, etc.
  /-agent$/i,
  /-automation$/i,
  /-dev-ai$/i,
  /-integration$/i, // devin-ai-integration, etc.
  /-ci$/i,
  /-github$/i,
  /-actions$/i,
  /^.*-actions$/i,
  /app$/i,
  /-apps$/i, // greptile-apps, vercel-apps, etc.
  /^apps$/i,
  /^.*\[bot\]$/i,
];

export const BOT_RE = new RegExp(BOT_PATTERNS.map((p) => p.source).join("|"));
export const MAX_PRS = 200;
export const PAGE_SIZE = 100;

const QUERY = `
query MergedPRs($searchQuery: String!, $first: Int!, $after: String) {
  search(query: $searchQuery, type: ISSUE, first: $first, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes {
      ... on PullRequest {
        title
        url
        createdAt
        mergedAt
        mergeCommit { oid }
        additions
        deletions
        author { login avatarUrl }
        reviews(first: 50) {
          nodes {
            author { login }
            submittedAt
            state
          }
        }
      }
    }
  }
}
`;

export function isBot(login: string): boolean {
  const lower = login.toLowerCase();
  if (KNOWN_BOTS.has(lower)) return true;
  return BOT_PATTERNS.some((re) => re.test(login));
}

async function graphql(
  token: string,
  variables: Record<string, unknown>,
): Promise<SearchResult> {
  const res = await fetch(GITHUB_GQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: QUERY, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }

  const json = (await res.json()) as { data?: SearchResult; errors?: unknown[] };
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data as SearchResult;
}

/**
 * Search repositories via GitHub REST API.
 */
export async function searchRepos(
  token: string,
  q: string,
  limit = 5,
): Promise<{ full_name: string; description: string | null; html_url: string; stargazers_count: number; language: string | null }[]> {
  if (!q.trim()) return [];
  const res = await fetch(
    `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub search failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as {
    items?: {
      full_name: string;
      description: string | null;
      html_url: string;
      stargazers_count: number;
      language: string | null;
    }[];
  };
  return (json.items ?? []).map((r) => ({
    full_name: r.full_name,
    description: r.description,
    html_url: r.html_url,
    stargazers_count: r.stargazers_count,
    language: r.language,
  }));
}

/**
 * Fetch merged PRs with pagination for a given repo.
 */
export async function fetchMergedPRs(
  token: string,
  since: string,
  repo: string,
): Promise<PRNode[]> {
  const searchQuery = `repo:${repo} is:pr is:merged merged:>${since}`;
  const prs: PRNode[] = [];
  let after: string | null = null;

  while (prs.length < MAX_PRS) {
    const remaining = MAX_PRS - prs.length;
    const first = Math.min(PAGE_SIZE, remaining);

    const data = await graphql(token, { searchQuery, first, after });
    const nodes = data.search.nodes.filter((n) => n.mergedAt);
    prs.push(...nodes);

    if (!data.search.pageInfo.hasNextPage || !data.search.pageInfo.endCursor) {
      break;
    }
    after = data.search.pageInfo.endCursor;
  }

  return prs.slice(0, MAX_PRS);
}
